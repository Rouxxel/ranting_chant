"""
#############################################################################
### Owners router file
###
### @file owners_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines read-only endpoints for property owner records.
It exposes a list endpoint for all owners and a single-record
lookup by owner ID.
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
from src.utils.json_store import read_all, find_by_id, update_record
from src.utils.validators import validate_email_format, validate_phone_format

"""PYDANTIC MODELS-----------------------------------------------------------"""
class OwnerProfileUpdatePayload(BaseModel):
    """Payload accepted for owner-owned profile edits."""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

"""API ROUTER-----------------------------------------------------------"""
#Get API router
router = APIRouter(
    prefix=config_loader['endpoints']['owners_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['owners_endpoint']['endpoint_tag']],
)

"""ENDPOINTS-----------------------------------------------------------"""
#List all property owners
@router.get(config_loader['endpoints']['owners_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['owners_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['owners_endpoint']['unit_of_time_for_limit']}"
)
async def list_owners(request: Request):
    """
    List all property owner records.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.

    Returns:
        list: A list of all property owner records in the data store.

    Note:
        The collection name is 'owners' to match the seed filename.
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug("Listing all property owners")
        owners = read_all("owners")
        log_handler.info(f"Returning {len(owners)} owner(s)")
        return owners

    except Exception as e:
        log_handler.error(f"Unexpected error listing owners: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching owners")


#Update owner-owned editable profile fields
@router.patch("/{owner_id}/profile")
@SlowLimiter.limit(
    f"{config_loader['endpoints']['owners_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['owners_endpoint']['unit_of_time_for_limit']}"
)
async def update_owner_profile(request: Request, owner_id: str, body: OwnerProfileUpdatePayload):
    """Update owner profile fields without changing owned properties."""
    try:
        existing = find_by_id("owners", owner_id)
        if not existing:
            message = f"Owner '{owner_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        updates = body.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No owner profile updates provided")

        #Validate editable fields against config-driven rules
        if "email" in updates:
            validate_email_format(updates["email"])
        if "phone" in updates:
            validate_phone_format(updates["phone"])

        updated = update_record("owners", owner_id, updates)
        log_handler.info(f"Owner profile '{owner_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error updating owner profile '{owner_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating owner profile")


#Get a single property owner by ID
@router.get(config_loader['endpoints']['owners_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['owners_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['owners_endpoint']['unit_of_time_for_limit']}"
)
async def get_owner(request: Request, owner_id: str):
    """
    Retrieve a single property owner record by its unique ID.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        owner_id (str): The unique identifier of the owner to retrieve.

    Returns:
        dict: The property owner record matching the given ID.

    Raises:
        HTTPException 404: If no owner with the given ID exists.
        HTTPException 500: If an unexpected error occurs during lookup.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"Looking up owner with id='{owner_id}'")
        owner = find_by_id("owners", owner_id)

        if not owner:
            message = f"Owner '{owner_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"Owner '{owner_id}' retrieved successfully")
        return owner

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error fetching owner '{owner_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching owner")
