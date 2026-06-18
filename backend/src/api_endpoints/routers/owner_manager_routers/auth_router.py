
"""
#############################################################################
### Auth router file
###
### @file auth_router.py
### @author Trae AI
### @date 2026
#############################################################################

This module defines authentication endpoints for managers and owners
using Supabase Auth. It exposes endpoints for login, logout, refresh,
and retrieving current user information.
"""

# Native imports
from typing import Optional

# Third-party imports
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.database.supabase_client import get_supabase_client

"""PYDANTIC MODELS-----------------------------------------------------------"""
class LoginRequest(BaseModel):
    identifier: str  # Can be email OR username
    password: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    role: str  # "manager" or "owner"
    actor: dict

"""API ROUTER-----------------------------------------------------------"""
# Get API router
router = APIRouter(
    prefix=config_loader['endpoints']['auth_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['auth_endpoint']['endpoint_tag']],
)

security = HTTPBearer()
supabase_client = get_supabase_client()

"""ENDPOINTS-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['auth_endpoint']['login_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['auth_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['auth_endpoint']['unit_of_time_for_limit']}"
)
async def login(request: Request, credentials: LoginRequest) -> AuthResponse:
    """
    Authenticate a manager or owner using email/username + password.
    
    If username is provided, it will be resolved to the corresponding email
    via the `user_accounts` table before authenticating with Supabase Auth.
    """
    log_handler.info(f"[auth] Login attempt for identifier: {credentials.identifier}")
    
    # Step 1: Determine if identifier is email or username, get real email
    auth_email: str
    if "@" in credentials.identifier:
        auth_email = credentials.identifier
    else:
        # Resolve username to email using user_accounts
        result = supabase_client.table("user_accounts").select("email").eq("username", credentials.identifier).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        auth_email = result.data[0]["email"]
    
    try:
        # Step 2: Authenticate with Supabase Auth
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": auth_email,
            "password": credentials.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Step 3: Get user account details and actor profile
        user_id = auth_response.user.id
        user_account_result = supabase_client.table("user_accounts").select("*").eq("auth_user_id", str(user_id)).execute()
        
        if not user_account_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found"
            )
        
        user_account = user_account_result.data[0]
        role = user_account["role"]  # "manager" or "owner"
        
        # Step 4: Get full actor profile (manager or owner)
        actor_profile: dict
        if role == "manager":
            manager_result = supabase_client.table("property_managers").select("*").eq("id", user_account["actor_id"]).execute()
            if not manager_result.data:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Manager profile not found")
            
            manager = manager_result.data[0]
            # Get actor details
            actor_details_result = supabase_client.table("actors").select("*").eq("id", manager["id"]).execute()
            actor = actor_details_result.data[0] if actor_details_result.data else {}
            
            # Get managed properties
            managed_props_result = supabase_client.table("manager_properties").select("property_id").eq("manager_id", manager["id"]).execute()
            managed_property_ids = [mp["property_id"] for mp in managed_props_result.data]
            
            actor_profile = {
                "id": manager["id"],
                "name": actor.get("display_name"),
                "email": actor.get("email"),
                "phone": actor.get("phone"),
                "managed_properties": managed_property_ids
            }
            
        else:  # role == "owner"
            owner_result = supabase_client.table("owners").select("*").eq("id", user_account["actor_id"]).execute()
            if not owner_result.data:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Owner profile not found")
            
            owner = owner_result.data[0]
            # Get actor details
            actor_details_result = supabase_client.table("actors").select("*").eq("id", owner["id"]).execute()
            actor = actor_details_result.data[0] if actor_details_result.data else {}
            
            # Get owned properties
            owned_props_result = supabase_client.table("owner_properties").select("property_id").eq("owner_id", owner["id"]).execute()
            owned_property_ids = [op["property_id"] for op in owned_props_result.data]
            
            actor_profile = {
                "id": owner["id"],
                "name": actor.get("display_name"),
                "email": actor.get("email"),
                "phone": actor.get("phone"),
                "owned_properties": owned_property_ids
            }
        
        log_handler.info(f"[auth] Successful login for {role}: {auth_email}")
        
        return AuthResponse(
            access_token=auth_response.session.access_token if auth_response.session else "",
            refresh_token=auth_response.session.refresh_token if auth_response.session else None,
            role=role,
            actor=actor_profile
        )
        
    except Exception as e:
        log_handler.error(f"[auth] Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


async def get_current_actor(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency that returns the current authenticated actor (manager or owner) from the access token.
    """
    try:
        # Step 1: Validate JWT with Supabase
        user = supabase_client.auth.get_user(credentials.credentials)
        if not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # Step 2: Get user account and actor profile
        user_id = user.user.id
        user_account_result = supabase_client.table("user_accounts").select("*").eq("auth_user_id", str(user_id)).execute()
        
        if not user_account_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found"
            )
        
        user_account = user_account_result.data[0]
        role = user_account["role"]
        
        # Get full actor profile
        if role == "manager":
            manager_result = supabase_client.table("property_managers").select("*").eq("id", user_account["actor_id"]).execute()
            manager = manager_result.data[0] if manager_result.data else {}
            actor_details_result = supabase_client.table("actors").select("*").eq("id", manager["id"]).execute()
            actor = actor_details_result.data[0] if actor_details_result.data else {}
            
            managed_props_result = supabase_client.table("manager_properties").select("property_id").eq("manager_id", manager["id"]).execute()
            managed_property_ids = [mp["property_id"] for mp in managed_props_result.data]
            
            return {
                "id": manager["id"],
                "name": actor.get("display_name"),
                "email": actor.get("email"),
                "phone": actor.get("phone"),
                "role": "manager",
                "managed_properties": managed_property_ids
            }
        
        else:  # owner
            owner_result = supabase_client.table("owners").select("*").eq("id", user_account["actor_id"]).execute()
            owner = owner_result.data[0] if owner_result.data else {}
            actor_details_result = supabase_client.table("actors").select("*").eq("id", owner["id"]).execute()
            actor = actor_details_result.data[0] if actor_details_result.data else {}
            
            owned_props_result = supabase_client.table("owner_properties").select("property_id").eq("owner_id", owner["id"]).execute()
            owned_property_ids = [op["property_id"] for op in owned_props_result.data]
            
            return {
                "id": owner["id"],
                "name": actor.get("display_name"),
                "email": actor.get("email"),
                "phone": actor.get("phone"),
                "role": "owner",
                "owned_properties": owned_property_ids
            }
            
    except Exception as e:
        log_handler.error(f"[auth] Token validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


async def require_manager_or_owner(current_actor: dict = Depends(get_current_actor)) -> dict:
    """
    Dependency that ensures the current user is either a manager or owner.
    """
    if current_actor["role"] not in ["manager", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resource"
        )
    return current_actor


async def require_owner(current_actor: dict = Depends(get_current_actor)) -> dict:
    """
    Dependency that ensures the current user is an owner.
    """
    if current_actor["role"] != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resource"
        )
    return current_actor


async def require_manager(current_actor: dict = Depends(get_current_actor)) -> dict:
    """
    Dependency that ensures the current user is a manager.
    """
    if current_actor["role"] != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resource"
        )
    return current_actor


@router.get(config_loader['endpoints']['auth_endpoint']['me_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['auth_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['auth_endpoint']['unit_of_time_for_limit']}"
)
async def get_me(request: Request, current_actor: dict = Depends(get_current_actor)) -> dict:
    """
    Return the current authenticated actor's profile.
    """
    return current_actor


@router.post(config_loader['endpoints']['auth_endpoint']['logout_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['auth_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['auth_endpoint']['unit_of_time_for_limit']}"
)
async def logout(request: Request, current_actor: dict = Depends(get_current_actor)) -> dict:
    """
    Logout the current user (invalidate the session on Supabase).
    """
    try:
        supabase_client.auth.sign_out()
        log_handler.info(f"[auth] Logout successful for {current_actor['role']}: {current_actor['email']}")
        return {"message": "Logged out successfully"}
    except Exception as e:
        log_handler.error(f"[auth] Logout failed: {e}")
        return {"message": "Logout successful"}  # Always return success for user experience


@router.post(config_loader['endpoints']['auth_endpoint']['refresh_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['auth_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['auth_endpoint']['unit_of_time_for_limit']}"
)
async def refresh_token(request: Request, refresh_token: str) -> AuthResponse:
    """
    Refresh an expired access token using a valid refresh token.
    """
    try:
        auth_response = supabase_client.auth.refresh_session(refresh_token)
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Reuse the login logic to get actor profile
        user_id = auth_response.user.id
        user_account_result = supabase_client.table("user_accounts").select("*").eq("auth_user_id", str(user_id)).execute()
        
        if not user_account_result.data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found")
        
        user_account = user_account_result.data[0]
        role = user_account["role"]
        
        # Get full actor profile
        actor_profile: dict
        if role == "manager":
            manager_result = supabase_client.table("property_managers").select("*").eq("id", user_account["actor_id"]).execute()
            manager = manager_result.data[0] if manager_result.data else {}
            actor_details_result = supabase_client.table("actors").select("*").eq("id", manager["id"]).execute()
            actor = actor_details_result.data[0] if actor_details_result.data else {}
            
            managed_props_result = supabase_client.table("manager_properties").select("property_id").eq("manager_id", manager["id"]).execute()
            managed_property_ids = [mp["property_id"] for mp in managed_props_result.data]
            
            actor_profile = {
                "id": manager["id"],
                "name": actor.get("display_name"),
                "email": actor.get("email"),
                "phone": actor.get("phone"),
                "managed_properties": managed_property_ids
            }
            
        else:
            owner_result = supabase_client.table("owners").select("*").eq("id", user_account["actor_id"]).execute()
            owner = owner_result.data[0] if owner_result.data else {}
            actor_details_result = supabase_client.table("actors").select("*").eq("id", owner["id"]).execute()
            actor = actor_details_result.data[0] if actor_details_result.data else {}
            
            owned_props_result = supabase_client.table("owner_properties").select("property_id").eq("owner_id", owner["id"]).execute()
            owned_property_ids = [op["property_id"] for op in owned_props_result.data]
            
            actor_profile = {
                "id": owner["id"],
                "name": actor.get("display_name"),
                "email": actor.get("email"),
                "phone": actor.get("phone"),
                "owned_properties": owned_property_ids
            }
        
        log_handler.info(f"[auth] Token refresh successful for {role}")

        return AuthResponse(
            access_token=auth_response.session.access_token if auth_response.session else "",
            refresh_token=auth_response.session.refresh_token if auth_response.session else None,
            role=role,
            actor=actor_profile
        )

    except Exception as e:
        log_handler.error(f"[auth] Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
