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
import uuid

#Third-party imports
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.database import get_database_service
from src.utils.validators import validate_email_format, validate_phone_format

"""PYDANTIC MODELS-----------------------------------------------------------"""
class TenantCreatePayload(BaseModel):
    """Payload accepted when creating a tenant.

    name, unit, and property_id are required; contact/address fields are
    optional and can be filled in later. Mirrors the frontend create form
    and TenantCreateRequest type.
    """

    name: str
    unit: str
    property_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class TenantUpdatePayload(BaseModel):
    """Payload accepted when updating manager/owner-editable tenant fields."""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    unit: Optional[str] = None
    property_id: Optional[str] = None


class TenantProfileUpdatePayload(BaseModel):
    """Payload accepted for tenant-owned profile edits."""

    email: Optional[str] = None
    phone: Optional[str] = None


def _sync_property_tenant_ids(
    tenant_id: str,
    old_property_id: str | None,
    new_property_id: str | None,
) -> None:
    """Move a tenant id between property tenant_ids lists when needed."""
    db = get_database_service()
    if old_property_id and old_property_id != new_property_id:
        old_property = db.properties.find_by_id(old_property_id)
        if old_property:
            tenant_ids = [
                existing_id for existing_id in old_property.get("tenant_ids", [])
                if existing_id != tenant_id
            ]
            db.properties.update(old_property_id, {"tenant_ids": tenant_ids})

    if new_property_id:
        new_property = db.properties.find_by_id(new_property_id)
        if not new_property:
            raise HTTPException(status_code=404, detail=f"Property '{new_property_id}' not found")

        tenant_ids = list(new_property.get("tenant_ids", []))
        if tenant_id not in tenant_ids:
            tenant_ids.append(tenant_id)
            db.properties.update(new_property_id, {"tenant_ids": tenant_ids})

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
async def list_tenants(request: Request, property_id: Optional[str] = Query(None, description="Filter tenants by property ID")):
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
        db = get_database_service()
        if property_id:
            log_handler.debug(f"[tenants_router] Listing tenants filtered by property_id='{property_id}'")
            results = db.tenants.find_by_field("property_id", property_id)
            log_handler.info(f"[tenants_router] Found {len(results)} tenant(s) for property '{property_id}'")
            return results

        log_handler.debug("[tenants_router] Listing all tenants")
        tenants = db.tenants.list()
        log_handler.info(f"[tenants_router] Returning {len(tenants)} tenant(s)")
        return tenants

    except Exception as e:
        log_handler.error(f"[tenants_router] Unexpected error listing tenants: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching tenants")


#Create a new tenant
@router.post(config_loader['endpoints']['tenants_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['tenants_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['tenants_endpoint']['unit_of_time_for_limit']}"
)
async def create_tenant(request: Request, body: TenantCreatePayload):
    """Create a tenant and attach them to the target property."""
    try:
        #Validate contact fields when provided
        if body.email is not None:
            validate_email_format(body.email)
        if body.phone is not None:
            validate_phone_format(body.phone)

        tenant_id = f"tenant_{uuid.uuid4().hex[:8]}"
        _sync_property_tenant_ids(tenant_id, None, body.property_id)

        record = body.model_dump()
        record["id"] = tenant_id
        db = get_database_service()
        created = db.tenants.create(record)
        log_handler.info(f"[tenants_router] Tenant created successfully with id='{created['id']}'")
        return created

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[tenants_router] Unexpected error creating tenant: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while creating tenant")


#Update tenant-owned editable profile fields
@router.patch("/{tenant_id}/profile")
@SlowLimiter.limit(
    f"{config_loader['endpoints']['tenants_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['tenants_endpoint']['unit_of_time_for_limit']}"
)
async def update_tenant_profile(request: Request, tenant_id: str, body: TenantProfileUpdatePayload):
    """Update tenant-owned profile fields without allowing housing changes."""
    try:
        db = get_database_service()
        existing = db.tenants.find_by_id(tenant_id)
        if not existing:
            message = f"Tenant '{tenant_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        updates = body.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No tenant profile updates provided")

        #Validate tenant-editable fields against config-driven rules
        if "email" in updates:
            validate_email_format(updates["email"])
        if "phone" in updates:
            validate_phone_format(updates["phone"])

        updated = db.tenants.update(tenant_id, updates)
        log_handler.info(f"[tenants_router] Tenant profile '{tenant_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[tenants_router] Unexpected error updating tenant profile '{tenant_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating tenant profile")


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
        log_handler.debug(f"[tenants_router] Looking up tenant with id='{tenant_id}'")
        db = get_database_service()
        tenant = db.tenants.find_by_id(tenant_id)

        if not tenant:
            message = f"[tenants_router] Tenant '{tenant_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"[tenants_router] Tenant '{tenant_id}' retrieved successfully")
        return tenant

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[tenants_router] Unexpected error fetching tenant '{tenant_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching tenant")


#Partially update an existing tenant
@router.patch(config_loader['endpoints']['tenants_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['tenants_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['tenants_endpoint']['unit_of_time_for_limit']}"
)
async def update_tenant(request: Request, tenant_id: str, body: TenantUpdatePayload):
    """Update a tenant and keep property tenant_ids relationships in sync."""
    try:
        db = get_database_service()
        existing = db.tenants.find_by_id(tenant_id)
        if not existing:
            message = f"Tenant '{tenant_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        updates = body.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No tenant updates provided")

        #Validate contact fields when provided
        if "email" in updates:
            validate_email_format(updates["email"])
        if "phone" in updates:
            validate_phone_format(updates["phone"])

        if "property_id" in updates and updates["property_id"] != existing.get("property_id"):
            _sync_property_tenant_ids(tenant_id, existing.get("property_id"), updates["property_id"])

        updated = db.tenants.update(tenant_id, updates)
        log_handler.info(f"[tenants_router] Tenant '{tenant_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[tenants_router] Unexpected error updating tenant '{tenant_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating tenant")


#Soft-delete a tenant (manager/owner action)
@router.delete(config_loader['endpoints']['tenants_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['tenants_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['tenants_endpoint']['unit_of_time_for_limit']}"
)
async def delete_tenant(request: Request, tenant_id: str):
    """
    Soft-delete a tenant record.

    Sets is_active=False and deleted_at on the tenant row. The tenant's
    actor, unit, and request history are preserved. Removes the tenant
    from their property's tenant_ids list.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        tenant_id (str): The unique identifier of the tenant to remove.

    Returns:
        dict: The tenant record as it was before deletion.

    Raises:
        HTTPException 404: If no tenant with the given ID exists.
        HTTPException 500: If an unexpected error occurs during deletion.
    """
    try:
        log_handler.debug(f"[tenants_router] Soft-deleting tenant with id='{tenant_id}'")
        db = get_database_service()
        existing = db.tenants.find_by_id(tenant_id)
        if not existing:
            message = f"Tenant '{tenant_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        #Remove tenant from their property's tenant_ids list before deleting
        _sync_property_tenant_ids(tenant_id, existing.get("property_id"), None)

        deleted = db.tenants.delete(tenant_id)
        log_handler.info(f"[tenants_router] Tenant '{tenant_id}' soft-deleted successfully")
        return deleted

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[tenants_router] Unexpected error deleting tenant '{tenant_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while deleting tenant")
