"""Pydantic models for tenant entities."""

from pydantic import BaseModel


class Tenant(BaseModel):
    """Represents a tenant record as stored in the data source."""

    id: str
    name: str
    email: str
    phone: str
    address: str
    property_id: str


class TenantResponse(Tenant):
    """Response model returned by tenant API endpoints."""

    pass
