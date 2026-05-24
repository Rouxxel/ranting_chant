"""Pydantic models for property owner entities."""

from pydantic import BaseModel


class Owner(BaseModel):
    """Represents an owner record as stored in the data source."""

    id: str
    name: str
    email: str
    phone: str
    owned_properties: list[str]


class OwnerResponse(Owner):
    """Response model returned by owner API endpoints."""

    pass
