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
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.utils.json_store import read_all, find_by_id, create_record, update_record

"""PYDANTIC MODELS-----------------------------------------------------------"""
class RepresentativePayload(BaseModel):
    """Embedded representative reference for a property."""

    type: str
    id: str


class PropertyCreatePayload(BaseModel):
    """Payload accepted when creating a property."""

    name: str
    address: str
    year_built: int
    property_type: str
    unit_count: int
    owner_id: str
    manager_id: str
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
        log_handler.debug("Listing all properties")
        properties = read_all("properties")
        log_handler.info(f"Returning {len(properties)} property/properties")
        return properties

    except Exception as e:
        log_handler.error(f"Unexpected error listing properties: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching properties")


#Create a new property
@router.post(config_loader['endpoints']['properties_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['properties_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['properties_endpoint']['unit_of_time_for_limit']}"
)
async def create_property(request: Request, body: PropertyCreatePayload):
    """Create a property record for manager/owner workflows."""
    try:
        record = body.model_dump(exclude={"representative"})
        record["id"] = f"property_{uuid.uuid4().hex[:8]}"
        record["representative"] = _build_representative(
            body.manager_id,
            body.owner_id,
            body.representative,
        )

        created = create_record("properties", record)
        log_handler.info(f"Property created successfully with id='{created['id']}'")
        return created

    except Exception as e:
        log_handler.error(f"Unexpected error creating property: {e}")
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


#Partially update an existing property
@router.patch(config_loader['endpoints']['properties_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['properties_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['properties_endpoint']['unit_of_time_for_limit']}"
)
async def update_property(request: Request, property_id: str, body: PropertyUpdatePayload):
    """Update editable property fields and relationship references."""
    try:
        existing = find_by_id("properties", property_id)
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

        updated = update_record("properties", property_id, updates)
        log_handler.info(f"Property '{property_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error updating property '{property_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating property")
