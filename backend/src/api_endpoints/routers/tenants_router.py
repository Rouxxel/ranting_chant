"""
#############################################################################
### Tenants router file
###
### @file tenants_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines read-only endpoints for tenant records.
It exposes a list endpoint with optional property filtering and a
single-record lookup by tenant ID.
"""

#Native imports
from typing import Optional

#Third-party imports
from fastapi import APIRouter, HTTPException, Query, Request

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.utils.json_store import read_all, find_by_id, find_by_field

"""API ROUTER-----------------------------------------------------------"""
#Get API router
router = APIRouter(
    prefix=config_loader['endpoints']['tenants_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['tenants_endpoint']['endpoint_tag']],
)

"""ENDPOINTS-----------------------------------------------------------"""
#List all tenants (optional filter by property_id)
@router.get(config_loader['endpoints']['tenants_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['tenants_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['tenants_endpoint']['unit_of_time_for_limit']}"
)
async def list_tenants(
    request: Request,
    property_id: Optional[str] = Query(None, description="Filter tenants by property ID")
):
    """
    List all tenants, with an optional filter by property.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        property_id (str, optional): If provided, only tenants belonging to
            this property are returned.

    Returns:
        list: A list of tenant records. Returns all tenants when no filter
            is applied, or a filtered subset when property_id is given.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        if property_id:
            log_handler.debug(f"Listing tenants filtered by property_id='{property_id}'")
            results = find_by_field("tenants", "property_id", property_id)
            log_handler.info(f"Found {len(results)} tenant(s) for property '{property_id}'")
            return results

        log_handler.debug("Listing all tenants")
        tenants = read_all("tenants")
        log_handler.info(f"Returning {len(tenants)} tenant(s)")
        return tenants

    except Exception as e:
        log_handler.error(f"Unexpected error listing tenants: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching tenants")


#Get a single tenant by ID
@router.get(config_loader['endpoints']['tenants_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['tenants_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['tenants_endpoint']['unit_of_time_for_limit']}"
)
async def get_tenant(request: Request, tenant_id: str):
    """
    Retrieve a single tenant record by its unique ID.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        tenant_id (str): The unique identifier of the tenant to retrieve.

    Returns:
        dict: The tenant record matching the given ID.

    Raises:
        HTTPException 404: If no tenant with the given ID exists.
        HTTPException 500: If an unexpected error occurs during lookup.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"Looking up tenant with id='{tenant_id}'")
        tenant = find_by_id("tenants", tenant_id)

        if not tenant:
            message = f"Tenant '{tenant_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"Tenant '{tenant_id}' retrieved successfully")
        return tenant

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error fetching tenant '{tenant_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching tenant")
