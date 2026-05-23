"""Pydantic models for maintenance/service request entities."""

from typing import Optional

from pydantic import BaseModel


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
    type: str
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
    type: str
    description: str
    urgency: str = "low"
    involved_parties: list[str] = []


class RequestUpdate(BaseModel):
    """Payload accepted when partially updating an existing request."""

    status: Optional[str] = None
    urgency: Optional[str] = None
    description: Optional[str] = None
    escalated: Optional[bool] = None
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
    vendor_id: Optional[str] = None


class RequestResponse(Request):
    """Response model returned by request API endpoints."""

    pass
