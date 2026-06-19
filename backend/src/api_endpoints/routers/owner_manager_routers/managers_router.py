"""
#############################################################################
### Managers router file
###
### @file managers_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines read-only endpoints for property manager records.
It exposes a list endpoint for all managers and a single-record
lookup by manager ID.
"""

#Native imports
from typing import Optional
import uuid

#Third-party imports
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.database import get_database_service
from src.utils.validators import validate_email_format, validate_phone_format
from src.api_endpoints.routers.owner_manager_routers.auth_router import require_manager_or_owner
from src.database.supabase_client import get_supabase_client

"""PYDANTIC MODELS-----------------------------------------------------------"""
class ManagerSignupPayload(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    username: Optional[str] = None

class SignupResponse(BaseModel):
    message: str
    email: str

class ManagerProfileUpdatePayload(BaseModel):
    """Payload accepted for manager-owned profile edits."""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None

"""API ROUTER-----------------------------------------------------------"""
#Get API router
router = APIRouter(
    prefix=config_loader['endpoints']['managers_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['managers_endpoint']['endpoint_tag']],
)

supabase_client = get_supabase_client()

"""ENDPOINTS-----------------------------------------------------------"""
#List all property managers
@router.get(config_loader['endpoints']['managers_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['managers_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['managers_endpoint']['unit_of_time_for_limit']}"
)
async def list_managers(request: Request):
    """
    List all property manager records.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.

    Returns:
        list: A list of all property manager records in the data store.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug("[managers_router] Listing all property managers")
        db = get_database_service()
        managers = db.managers.list()
        log_handler.info(f"[managers_router] Returning {len(managers)} manager(s)")
        return managers

    except Exception as e:
        log_handler.error(f"[managers_router] Unexpected error listing managers: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching managers")


#Update manager-owned editable profile fields
@router.patch("/{manager_id}/profile")
@SlowLimiter.limit(
    f"{config_loader['endpoints']['managers_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['managers_endpoint']['unit_of_time_for_limit']}"
)
async def update_manager_profile(request: Request, manager_id: str, body: ManagerProfileUpdatePayload, current_actor: dict = Depends(require_manager_or_owner)):
    """Update manager profile fields without changing managed properties."""
    try:
        db = get_database_service()
        existing = db.managers.find_by_id(manager_id)
        if not existing:
            message = f"Manager '{manager_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        updates = body.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No manager profile updates provided")

        #Validate editable fields against config-driven rules
        if "email" in updates:
            validate_email_format(updates["email"])
        if "phone" in updates:
            validate_phone_format(updates["phone"])

        updated = db.managers.update(manager_id, updates)
        log_handler.info(f"[managers_router] Manager profile '{manager_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[managers_router] Unexpected error updating manager profile '{manager_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating manager profile")


#Get a single property manager by ID
@router.get(config_loader['endpoints']['managers_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['managers_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['managers_endpoint']['unit_of_time_for_limit']}"
)
async def get_manager(request: Request, manager_id: str):
    """
    Retrieve a single property manager record by its unique ID.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        manager_id (str): The unique identifier of the manager to retrieve.

    Returns:
        dict: The property manager record matching the given ID.

    Raises:
        HTTPException 404: If no manager with the given ID exists.
        HTTPException 500: If an unexpected error occurs during lookup.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"[managers_router] Looking up manager with id='{manager_id}'")
        db = get_database_service()
        manager = db.managers.find_by_id(manager_id)

        if not manager:
            message = f"[managers_router] Manager '{manager_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"[managers_router] Manager '{manager_id}' retrieved successfully")
        return manager

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[managers_router] Unexpected error fetching manager '{manager_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching manager")


@router.post(config_loader['endpoints']['managers_signup_endpoint']['signup_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['managers_signup_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['managers_signup_endpoint']['unit_of_time_for_limit']}"
)
async def manager_signup(request: Request, payload: ManagerSignupPayload) -> SignupResponse:
    """
    Register a new property manager with email confirmation.

    Creates a Supabase auth user, actor record, property_manager record,
    and user_accounts mapping. Email confirmation is required before login.
    """
    log_handler.info(f"[managers_router] Manager signup attempt for email: {payload.email}")

    try:
        # Step 1: Check if email already exists in user_accounts
        existing_user = supabase_client.table("user_accounts").select("*").eq("email", payload.email.lower()).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists"
            )

        # Step 2: Check if username already exists (if provided)
        if payload.username:
            existing_username = supabase_client.table("user_accounts").select("*").eq("username", payload.username.lower()).execute()
            if existing_username.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This username is already taken"
                )

        # Step 3: Create Supabase auth user with email confirmation
        try:
            auth_response = supabase_client.auth.sign_up({
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "email_confirm": True  # Send confirmation email
                }
            })
        except Exception as auth_error:
            log_handler.error(f"[managers_router] Supabase auth signup failed: {auth_error}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create account. Please check your email format and password strength."
            )

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create auth user"
            )

        auth_user_id = str(auth_response.user.id)

        # Step 4: Generate UUID for actor record
        actor_id = str(uuid.uuid4())

        # Step 5: Create actor record
        actor_data = {
            "id": actor_id,
            "type": "manager",
            "display_name": payload.name,
            "email": payload.email.lower(),
            "phone": payload.phone,
            "is_active": True
        }

        try:
            supabase_client.table("actors").insert(actor_data).execute()
        except Exception as actor_error:
            log_handler.error(f"[managers_router] Failed to create actor record: {actor_error}")
            # Clean up auth user if actor creation fails
            try:
                supabase_client.auth.admin.delete_user(auth_user_id)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )

        # Step 6: Create property_manager record
        try:
            supabase_client.table("property_managers").insert({"id": actor_id}).execute()
        except Exception as manager_error:
            log_handler.error(f"[managers_router] Failed to create property_manager record: {manager_error}")
            # Clean up actor and auth user
            try:
                supabase_client.table("actors").delete().eq("id", actor_id).execute()
                supabase_client.auth.admin.delete_user(auth_user_id)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create manager profile"
            )

        # Step 7: Create user_accounts mapping
        user_account_data = {
            "auth_user_id": auth_user_id,
            "actor_id": actor_id,
            "email": payload.email.lower(),
            "username": payload.username.lower() if payload.username else None,
            "role": "manager",
            "provider": "email"
        }

        try:
            supabase_client.table("user_accounts").insert(user_account_data).execute()
        except Exception as account_error:
            log_handler.error(f"[managers_router] Failed to create user_accounts record: {account_error}")
            # Clean up all previous records
            try:
                supabase_client.table("property_managers").delete().eq("id", actor_id).execute()
                supabase_client.table("actors").delete().eq("id", actor_id).execute()
                supabase_client.auth.admin.delete_user(auth_user_id)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create account mapping"
            )

        log_handler.info(f"[managers_router] Manager signup successful for email: {payload.email}")

        return SignupResponse(
            message="Account created successfully. Please check your email to confirm your account before logging in.",
            email=payload.email
        )

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[managers_router] Manager signup failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during signup"
        )
