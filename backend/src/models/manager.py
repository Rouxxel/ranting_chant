"""Pydantic models for property manager entities."""

from pydantic import BaseModel


class PropertyManager(BaseModel):
    """Represents a property manager record as stored in the data source."""

    id: str
    name: str
    email: str
    phone: str
    managed_properties: list[str]


class PropertyManagerResponse(PropertyManager):
    """Response model returned by property manager API endpoints."""

    pass
