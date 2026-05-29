"""Pydantic models for maintenance/service request entities."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


REQUEST_TYPE_DESCRIPTIONS = {
    "plumbing": "Leaks, clogged drains, water pressure, fixtures, or pipe issues",
    "electrical": "Outlets, lights, breakers, wiring, or power loss",
    "hvac": "Heating, cooling, ventilation, or thermostat issues",
    "appliance": "Dishwasher, refrigerator, washer, dryer, stove, or other appliance repairs",
    "pest_control": "Insects, rodents, or suspected infestations",
    "lockout": "Tenant is locked out or needs immediate entry assistance",
    "access_control": "Keys, fobs, gates, intercoms, doors, or building access issues",
    "noise": "Noise complaints or neighbor disturbance reports",
    "lease_question": "Lease terms, renewals, notices, or agreement questions",
    "rent_payment": "Rent, utility charges, balances, payment questions, or billing",
    "emergency": "Immediate safety threats such as fire, gas leak, flood, break-in, or danger",
    "general": "Any other inquiry that does not fit the supported categories",
}

REQUEST_TYPES = tuple(REQUEST_TYPE_DESCRIPTIONS.keys())
REQUEST_TYPE_LABELS = {
    request_type: request_type.replace("_", " ").title()
    for request_type in REQUEST_TYPES
}
REQUEST_TYPE_LABELS["hvac"] = "HVAC"
RequestType = Literal[
    "plumbing",
    "electrical",
    "hvac",
    "appliance",
    "pest_control",
    "lockout",
    "access_control",
    "noise",
    "lease_question",
    "rent_payment",
    "emergency",
    "general",
]


def normalize_request_type(value: str | None) -> RequestType:
    """Return a canonical request type, mapping legacy coarse values when possible."""
    legacy_map = {
        "maintenance": "general",
        "access": "access_control",
        "rental_agreement": "lease_question",
        "complaint": "noise",
        "billing": "rent_payment",
    }
    candidate = (value or "general").strip().lower()
    candidate = legacy_map.get(candidate, candidate)
    return candidate if candidate in REQUEST_TYPES else "general"


def get_request_type_label(value: str | None) -> str:
    """Return a human-readable label for a request type."""
    request_type = normalize_request_type(value)
    return REQUEST_TYPE_LABELS[request_type]


class ConversationMessage(BaseModel):
    """A single message entry in a request's conversation history."""

    role: str       # "tenant", "ai", or "system"
    message: str
    timestamp: str


class NotificationEvent(BaseModel):
    """A record of a notification dispatched for a request."""

    type: str       # "email" or "sms"
    recipient: str
    status: str     # "sent" or "failed"
    timestamp: str


class Request(BaseModel):
    """Represents a service/maintenance request as stored in the data source."""

    id: str
    requester_id: str
    type: RequestType
    description: str
    status: str
    urgency: str
    involved_parties: list[str]
    conversation_history: list[ConversationMessage]
    created_at: str
    updated_at: str
    escalated: bool
    sentiment: str
    confidence: float
    vendor_id: Optional[str] = None
    notifications_sent: list[NotificationEvent]


class RequestCreate(BaseModel):
    """Payload accepted when creating a new request."""

    requester_id: str
    type: RequestType = "general"
    description: str
    urgency: str = "low"
    involved_parties: list[str] = Field(default_factory=list)


class RequestUpdate(BaseModel):
    """Payload accepted when partially updating an existing request."""

    status: Optional[str] = None
    urgency: Optional[str] = None
    type: Optional[RequestType] = None
    description: Optional[str] = None
    escalated: Optional[bool] = None
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
    vendor_id: Optional[str] = None


class RequestResponse(Request):
    """Response model returned by request API endpoints."""

    pass
