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

#Native imports
from typing import Optional
import uuid

#Third-party imports
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.database import get_database_service
from src.api_endpoints.routers.owner_manager_routers.auth_router import require_manager_or_owner

"""PYDANTIC MODELS-----------------------------------------------------------"""
class RepresentativePayload(BaseModel):
    """Embedded representative reference for a property."""

    type: str
    id: str


class PropertyCreatePayload(BaseModel):
    """Payload accepted when creating a property.

    Only name and address are required; relationship and detail fields are
    optional so a manager or owner can create a property and fill the rest
    later. Mirrors PropertyUpdatePayload and the frontend PropertyCreateRequest.
    """

    name: str
    address: str
    year_built: Optional[int] = None
    property_type: Optional[str] = None
    unit_count: Optional[int] = None
    owner_id: Optional[str] = None
    manager_id: Optional[str] = None
    tenant_ids: list[str] = Field(default_factory=list)
    representative: Optional[RepresentativePayload] = None


class PropertyUpdatePayload(BaseModel):
    """Payload accepted when updating editable property fields."""

    name: Optional[str] = None
    address: Optional[str] = None
    year_built: Optional[int] = None
    property_type: Optional[str] = None
    unit_count: Optional[int] = None
    owner_id: Optional[str] = None
    manager_id: Optional[str] = None
    tenant_ids: Optional[list[str]] = None
    representative: Optional[RepresentativePayload] = None


def _build_representative(
    manager_id: str | None,
    owner_id: str | None,
    representative: RepresentativePayload | None = None,
) -> dict:
    """Resolve the property representative from payload or relationships."""
    if representative:
        return representative.model_dump()

    if manager_id and manager_id.startswith("owner_"):
        return {"type": "owner", "id": manager_id}

    if manager_id:
        return {"type": "property_manager", "id": manager_id}

    return {"type": "owner", "id": owner_id}

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
        log_handler.debug("[properties_router] Listing all properties")
        db = get_database_service()
        properties = db.properties.list()
        log_handler.info(f"[properties_router] Returning {len(properties)} property/properties")
        return properties

    except Exception as e:
        log_handler.error(f"[properties_router] Unexpected error listing properties: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching properties")


#Create a new property
@router.post(config_loader['endpoints']['properties_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['properties_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['properties_endpoint']['unit_of_time_for_limit']}"
)
async def create_property(request: Request, body: PropertyCreatePayload, current_actor: dict = Depends(require_manager_or_owner)):
    """Create a property record for manager/owner workflows."""
    try:
        record = body.model_dump(exclude={"representative"})
        record["id"] = str(uuid.uuid4())
        record["created_by"] = current_actor["id"]
        record["representative"] = _build_representative(
            body.manager_id,
            body.owner_id,
            body.representative,
        )

        db = get_database_service()
        created = db.properties.create(record)

        #Link the property to its manager/owner so it appears in their listings
        if body.manager_id:
            manager = db.managers.find_by_id(body.manager_id)
            if manager:
                managed = list(manager.get("managed_properties", []))
                if created["id"] not in managed:
                    managed.append(created["id"])
                    db.managers.update(body.manager_id, {"managed_properties": managed})
        if body.owner_id:
            owner = db.owners.find_by_id(body.owner_id)
            if owner:
                owned = list(owner.get("owned_properties", []))
                if created["id"] not in owned:
                    owned.append(created["id"])
                    db.owners.update(body.owner_id, {"owned_properties": owned})

        log_handler.info(f"[properties_router] Property created successfully with id='{created['id']}'")
        return created

    except Exception as e:
        log_handler.error(f"[properties_router] Unexpected error creating property: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while creating property")


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
        log_handler.debug(f"[properties_router] Looking up property with id='{property_id}'")
        db = get_database_service()
        prop = db.properties.find_by_id(property_id)

        if not prop:
            message = f"[properties_router] Property '{property_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"[properties_router] Property '{property_id}' retrieved successfully")
        return prop

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[properties_router] Unexpected error fetching property '{property_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching property")


#Partially update an existing property
@router.patch(config_loader['endpoints']['properties_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['properties_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['properties_endpoint']['unit_of_time_for_limit']}"
)
async def update_property(request: Request, property_id: str, body: PropertyUpdatePayload, current_actor: dict = Depends(require_manager_or_owner)):
    """Update editable property fields and relationship references."""
    try:
        db = get_database_service()
        existing = db.properties.find_by_id(property_id)
        if not existing:
            message = f"Property '{property_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        updates = body.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No property updates provided")

        if "representative" in updates:
            updates["representative"] = body.representative.model_dump()
        elif "manager_id" in updates or "owner_id" in updates:
            updates["representative"] = _build_representative(
                updates.get("manager_id", existing.get("manager_id")),
                updates.get("owner_id", existing.get("owner_id")),
            )

        updated = db.properties.update(property_id, updates)
        log_handler.info(f"[properties_router] Property '{property_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[properties_router] Unexpected error updating property '{property_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating property")


#Soft-delete a property (manager/owner action)
@router.delete(config_loader['endpoints']['properties_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['properties_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['properties_endpoint']['unit_of_time_for_limit']}"
)#TODO: see how to manage a property deletion compared to tenants and their units
async def delete_property(request: Request, property_id: str, current_actor: dict = Depends(require_manager_or_owner)):
    """
    Soft-delete a property record.

    Sets is_active=False and deleted_at on the property row. The property's
    units, tenants, and request history are preserved.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        property_id (str): The unique identifier of the property to remove.

    Returns:
        dict: The property record as it was before deletion.

    Raises:
        HTTPException 404: If no property with the given ID exists.
        HTTPException 500: If an unexpected error occurs during deletion.
    """
    try:
        log_handler.debug(f"[properties_router] Soft-deleting property with id='{property_id}'")
        db = get_database_service()
        existing = db.properties.find_by_id(property_id)
        if not existing:
            message = f"Property '{property_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        deleted = db.properties.delete(property_id)
        log_handler.info(f"[properties_router] Property '{property_id}' deleted successfully")
        return deleted

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[properties_router] Unexpected error deleting property '{property_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while deleting property")
