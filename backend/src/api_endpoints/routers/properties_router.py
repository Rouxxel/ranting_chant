"""
#############################################################################
### Properties router file
###
### @file properties_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines read-only endpoints for property records.
It exposes a list endpoint for all properties and a single-record
lookup by property ID.
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
    prefix=config_loader['endpoints']['properties_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['properties_endpoint']['endpoint_tag']],
)

"""ENDPOINTS-----------------------------------------------------------"""
#List all properties
@router.get(config_loader['endpoints']['properties_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['properties_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['properties_endpoint']['unit_of_time_for_limit']}"
)
async def list_properties(request: Request):
    """
    List all property records.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.

    Returns:
        list: A list of all property records in the data store.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug("Listing all properties")
        properties = read_all("properties")
        log_handler.info(f"Returning {len(properties)} property/properties")
        return properties

    except Exception as e:
        log_handler.error(f"Unexpected error listing properties: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching properties")


#Get a single property by ID
@router.get(config_loader['endpoints']['properties_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['properties_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['properties_endpoint']['unit_of_time_for_limit']}"
)
async def get_property(request: Request, property_id: str):
    """
    Retrieve a single property record by its unique ID.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        property_id (str): The unique identifier of the property to retrieve.

    Returns:
        dict: The property record matching the given ID.

    Raises:
        HTTPException 404: If no property with the given ID exists.
        HTTPException 500: If an unexpected error occurs during lookup.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"Looking up property with id='{property_id}'")
        prop = find_by_id("properties", property_id)

        if not prop:
            message = f"Property '{property_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"Property '{property_id}' retrieved successfully")
        return prop

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error fetching property '{property_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching property")
