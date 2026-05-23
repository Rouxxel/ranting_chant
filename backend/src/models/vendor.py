"""Pydantic models for vendor entities."""

from pydantic import BaseModel


class Vendor(BaseModel):
    """Represents a vendor record as stored in the data source."""

    id: str
    name: str
    email: str
    phone: str
    services: list[str]
    emergency_available: bool


class VendorResponse(Vendor):
    """Response model returned by vendor API endpoints."""

    pass
