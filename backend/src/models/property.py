"""Pydantic models for property entities."""

from pydantic import BaseModel


class PropertyRepresentative(BaseModel):
    """Embedded representative reference on a property (owner or manager)."""

    type: str  # e.g. "property_manager" or "owner"
    id: str


class Property(BaseModel):
    """Represents a property record as stored in the data source."""

    id: str
    name: str
    address: str
    year_built: int
    property_type: str
    unit_count: int
    owner_id: str
    manager_id: str
    tenant_ids: list[str]
    representative: PropertyRepresentative


class PropertyResponse(Property):
    """Response model returned by property API endpoints."""

    pass
