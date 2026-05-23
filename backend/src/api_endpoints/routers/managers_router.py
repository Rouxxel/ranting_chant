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

#Third-party imports
from fastapi import APIRouter, HTTPException, Request

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.utils.json_store import read_all, find_by_id

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
        The collection name is 'property_magament' to match the seed filename.
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug("Listing all property managers")
        managers = read_all("property_magament")
        log_handler.info(f"Returning {len(managers)} manager(s)")
        return managers

    except Exception as e:
        log_handler.error(f"Unexpected error listing managers: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching managers")


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
        log_handler.debug(f"Looking up manager with id='{manager_id}'")
        manager = find_by_id("property_magament", manager_id)

        if not manager:
            message = f"Manager '{manager_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"Manager '{manager_id}' retrieved successfully")
        return manager

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error fetching manager '{manager_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching manager")
