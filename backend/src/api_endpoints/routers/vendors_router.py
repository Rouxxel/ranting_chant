"""
#############################################################################
### Vendors router file
###
### @file vendors_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines read-only endpoints for vendor records.
It exposes a list endpoint, a service-category filter endpoint,
and a single-record lookup by vendor ID.
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
    prefix=config_loader['endpoints']['vendors_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['vendors_endpoint']['endpoint_tag']],
)

"""ENDPOINTS-----------------------------------------------------------"""
#List all vendors
@router.get(config_loader['endpoints']['vendors_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['vendors_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['vendors_endpoint']['unit_of_time_for_limit']}"
)
async def list_vendors(request: Request):
    """
    List all vendor records.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.

    Returns:
        list: A list of all vendor records in the data store.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug("Listing all vendors")
        vendors = read_all("vendors")
        log_handler.info(f"Returning {len(vendors)} vendor(s)")
        return vendors

    except Exception as e:
        log_handler.error(f"Unexpected error listing vendors: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching vendors")


#Filter vendors by service category — must be defined before /{vendor_id}
@router.get(config_loader['endpoints']['vendors_endpoint']['by_service_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['vendors_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['vendors_endpoint']['unit_of_time_for_limit']}"
)
async def get_vendors_by_service(request: Request, service: str):
    """
    Filter vendors by a service category.

    Performs a case-insensitive match against each vendor's services list.
    For example, passing "locksmith" returns all vendors that offer locksmith services.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        service (str): The service category to filter by (e.g. locksmith, plumbing, hvac).

    Returns:
        list: A (possibly empty) list of vendor records that offer the requested service.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        #Validate service is a non-empty string
        service = service.strip()
        if not service:
            message = "Service category must not be empty"
            log_handler.warning(message)
            raise HTTPException(status_code=400, detail=message)

        log_handler.debug(f"Filtering vendors by service='{service}'")
        all_vendors = read_all("vendors")

        #Case-insensitive match against each vendor's services list
        results = [
            v for v in all_vendors
            if service.lower() in [s.lower() for s in v.get("services", [])]
        ]

        log_handler.info(f"Found {len(results)} vendor(s) offering service '{service}'")
        return results

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error filtering vendors by service '{service}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while filtering vendors")


#Get a single vendor by ID
@router.get(config_loader['endpoints']['vendors_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['vendors_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['vendors_endpoint']['unit_of_time_for_limit']}"
)
async def get_vendor(request: Request, vendor_id: str):
    """
    Retrieve a single vendor record by its unique ID.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        vendor_id (str): The unique identifier of the vendor to retrieve.

    Returns:
        dict: The vendor record matching the given ID.

    Raises:
        HTTPException 404: If no vendor with the given ID exists.
        HTTPException 500: If an unexpected error occurs during lookup.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"Looking up vendor with id='{vendor_id}'")
        vendor = find_by_id("vendors", vendor_id)

        if not vendor:
            message = f"Vendor '{vendor_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"Vendor '{vendor_id}' retrieved successfully")
        return vendor

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error fetching vendor '{vendor_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching vendor")
