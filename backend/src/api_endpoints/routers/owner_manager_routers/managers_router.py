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

#Third-party imports
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.database import get_database_service
from src.utils.validators import validate_email_format, validate_phone_format

"""PYDANTIC MODELS-----------------------------------------------------------"""
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
async def update_manager_profile(request: Request, manager_id: str, body: ManagerProfileUpdatePayload):
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
