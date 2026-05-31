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

#Native imports
from typing import Optional
import uuid

#Third-party imports
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.utils.json_store import read_all, find_by_id, create_record, update_record, delete_record
from src.utils.validators import validate_email_format, validate_phone_format

"""PYDANTIC MODELS-----------------------------------------------------------"""
class VendorCreatePayload(BaseModel):
    """Payload accepted when creating a vendor."""

    name: str
    email: str
    phone: str
    services: list[str] = Field(default_factory=list)
    emergency_available: bool = False


class VendorUpdatePayload(BaseModel):
    """Payload accepted when updating vendor details."""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    services: Optional[list[str]] = None
    emergency_available: Optional[bool] = None


OPEN_REQUEST_STATUSES = {"pending", "in_progress", "escalated", "pending_approval"}

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


#Create a new vendor
@router.post(config_loader['endpoints']['vendors_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['vendors_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['vendors_endpoint']['unit_of_time_for_limit']}"
)
async def create_vendor(request: Request, body: VendorCreatePayload):
    """Create a vendor record."""
    try:
        #Validate contact fields against config-driven rules
        validate_email_format(body.email)
        validate_phone_format(body.phone)

        record = body.model_dump()
        record["id"] = f"vendor_{uuid.uuid4().hex[:8]}"

        created = create_record("vendors", record)
        log_handler.info(f"Vendor created successfully with id='{created['id']}'")
        return created

    except Exception as e:
        log_handler.error(f"Unexpected error creating vendor: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while creating vendor")


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


#Partially update an existing vendor
@router.patch(config_loader['endpoints']['vendors_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['vendors_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['vendors_endpoint']['unit_of_time_for_limit']}"
)
async def update_vendor(request: Request, vendor_id: str, body: VendorUpdatePayload):
    """Update vendor details and service categories."""
    try:
        existing = find_by_id("vendors", vendor_id)
        if not existing:
            message = f"Vendor '{vendor_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        updates = body.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No vendor updates provided")

        #Validate contact fields when provided
        if "email" in updates:
            validate_email_format(updates["email"])
        if "phone" in updates:
            validate_phone_format(updates["phone"])

        updated = update_record("vendors", vendor_id, updates)
        log_handler.info(f"Vendor '{vendor_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error updating vendor '{vendor_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating vendor")


#Delete a vendor when it is not assigned to open requests
@router.delete(config_loader['endpoints']['vendors_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['vendors_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['vendors_endpoint']['unit_of_time_for_limit']}"
)
async def remove_vendor(request: Request, vendor_id: str):
    """Delete a vendor unless currently assigned to an open request."""
    try:
        existing = find_by_id("vendors", vendor_id)
        if not existing:
            message = f"Vendor '{vendor_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        open_assignments = [
            req for req in read_all("requests")
            if req.get("vendor_id") == vendor_id and req.get("status") in OPEN_REQUEST_STATUSES
        ]
        if open_assignments:
            raise HTTPException(
                status_code=409,
                detail=f"Vendor '{vendor_id}' is assigned to open requests",
            )

        deleted = delete_record("vendors", vendor_id)
        log_handler.info(f"Vendor '{vendor_id}' deleted successfully")
        return deleted

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error deleting vendor '{vendor_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while deleting vendor")
