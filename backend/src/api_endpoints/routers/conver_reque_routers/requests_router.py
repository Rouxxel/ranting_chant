"""
#############################################################################
### Requests router file
###
### @file requests_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines CRUD endpoints for maintenance and service request records.
It supports listing, filtering, creating, updating, and retrieving notification
history for requests.
"""

#Native imports
from typing import Optional
from datetime import datetime, timezone
import uuid

#Third-party imports
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.database import get_database_service
from src.ai.gemini_client import get_client
from src.models.request import RequestType, normalize_request_type

"""PYDANTIC MODELS-----------------------------------------------------------"""
class RequestCreatePayload(BaseModel):
    """Payload accepted when creating a new request directly."""
    requester_id: str = Field(..., description="ID of the tenant submitting the request")
    type: RequestType = Field(default="general", description="Category of the request")
    description: str = Field(..., description="Human-readable description of the issue")
    urgency: str = Field(default="low", description="Urgency level: low / medium / high")
    involved_parties: list = Field(default_factory=list, description="IDs of parties involved")
    vendor_id: Optional[str] = Field(None, description="ID of an assigned vendor")


class RequestUpdatePayload(BaseModel):
    """Payload accepted when updating an existing request."""
    status: Optional[str] = Field(None, description="New status value")
    urgency: Optional[str] = Field(None, description="New urgency level")
    type: Optional[RequestType] = Field(None, description="New request type")
    description: Optional[str] = Field(None, description="Updated description")
    escalated: Optional[bool] = Field(None, description="Escalation flag")
    sentiment: Optional[str] = Field(None, description="Sentiment classification")
    confidence: Optional[float] = Field(None, description="AI confidence score")
    vendor_id: Optional[str] = Field(None, description="ID of assigned vendor")


class RequestCancelPayload(BaseModel):
    """Payload accepted when a tenant cancels a request."""

    cancelled_by: str = Field(..., description="ID of the tenant cancelling the request")
    cancellation_reason: Optional[str] = Field(None, description="Optional cancellation reason")


class RequestCompletePayload(BaseModel):
    """Payload accepted when a manager or owner completes a request."""

    resolved_by: str = Field(..., description="ID of the manager or owner resolving the request")
    resolution_note: Optional[str] = Field(None, description="Optional resolution note")


TERMINAL_STATUSES = {"cancelled", "resolved"}

"""API ROUTER-----------------------------------------------------------"""
#Get API router
router = APIRouter(
    prefix=config_loader['endpoints']['requests_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['requests_endpoint']['endpoint_tag']],
)

"""ENDPOINTS-----------------------------------------------------------"""
#List all requests (optional filter by tenant_id)
@router.get(config_loader['endpoints']['requests_endpoint']['list_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def list_requests(
    request: Request,
    tenant_id: Optional[str] = Query(None, description="Filter requests by tenant (requester) ID")
):
    """
    List all service/maintenance requests, with an optional filter by tenant.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        tenant_id (str, optional): If provided, only requests submitted by this
            tenant (matched against requester_id) are returned.

    Returns:
        list: A list of request records. Returns all requests when no filter
            is applied, or a filtered subset when tenant_id is given.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        db = get_database_service()
        if tenant_id:
            log_handler.debug(f"[requests_router] Listing requests filtered by tenant_id='{tenant_id}'")
            results = db.requests.find_by_field("requester_id", tenant_id)
            log_handler.info(f"[requests_router] Found {len(results)} request(s) for tenant '{tenant_id}'")
            return results

        log_handler.debug(f"[requests_router] Listing all requests")
        requests = db.requests.list()
        log_handler.info(f"[requests_router] Returning {len(requests)} request(s)")
        return requests

    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error listing requests: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching requests")


#Get notifications for a request — defined before /{request_id} to avoid routing conflict
@router.get(config_loader['endpoints']['requests_endpoint']['notifications_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def get_request_notifications(request: Request, request_id: str):
    """
    Retrieve the notifications_sent list for a specific request.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        request_id (str): The unique identifier of the request.

    Returns:
        list: The list of notification event records dispatched for this request.
            Returns an empty list if no notifications have been sent yet.

    Raises:
        HTTPException 404: If no request with the given ID exists.
        HTTPException 500: If an unexpected error occurs during lookup.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"[requests_router] Fetching notifications for request_id='{request_id}'")
        db = get_database_service()
        req = db.requests.find_by_id(request_id)

        if not req:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        notifications = req.get("notifications_sent", [])
        log_handler.info(
            f"[requests_router] Returning {len(notifications)} notification(s) for request '{request_id}'"
        )
        return notifications

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error fetching notifications for '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching notifications")


#Get AI plain-English summary for a request
@router.get(config_loader['endpoints']['requests_endpoint']['summary_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def get_request_summary(request: Request, request_id: str):
    """
    Retrieve an AI-generated plain-English summary of the request's conversation.

    Fetches the request's conversation history, formats it, and calls Gemini
    to produce a clear, plain-English summary that is 2 to 3 sentences long.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        request_id (str): The unique identifier of the request to summarize.

    Returns:
        dict: Containing a single 'summary' field.

    Raises:
        HTTPException 404: If no request with the given ID exists.
        HTTPException 500: If an unexpected error occurs during summarization.
    """
    try:
        log_handler.debug(f"[requests_router] Generating summary for request_id='{request_id}'")
        db = get_database_service()
        req = db.requests.find_by_id(request_id)

        if not req:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        # Check if summary is already cached
        existing_summary = req.get("summary")
        if existing_summary:
            log_handler.info(f"[requests_router] Returning cached summary for request '{request_id}'")
            return {"summary": existing_summary}

        history = req.get("conversation_history", [])
        if not history:
            log_handler.info(f"[requests_router] No conversation history available for request '{request_id}'")
            return {"summary": "No conversation history available to summarize."}

        # Format history as readable text
        history_text = ""
        for turn in history:
            role = turn.get("role", "unknown").upper()
            msg = turn.get("message", "")
            history_text += f"{role}: {msg}\n"

        prompt = (
            f"You are an AI assistant for a property operations platform.\n"
            f"Please summarize the following conversation history between a tenant and our AI coordinator.\n"
            f"Your summary must be extremely clear, plain-English, and exactly 2 to 3 sentences long.\n"
            f"Focus on what the tenant's issue is and what the current status/conclusion is.\n"
            f"Do not include any formatting, markdown, or headers. Just output the raw summary text.\n\n"
            f"Conversation history:\n{history_text}"
        )

        summary = ""
        try:
            client = get_client()
            response = client.models.generate_content(
                model=config_loader["llm_model"]["default_model"],
                contents=prompt,
            )
            if response and response.text:
                summary = response.text.strip()
        except Exception as ai_err:
            log_handler.error(f"[requests_router] Failed to generate summary via Gemini: {ai_err}")

        if not summary:
            # Fallback simple programmatically generated summary if Gemini fails
            desc = req.get("description", "No description provided.")
            urgency = req.get("urgency", "low")
            status = req.get("status", "pending")
            summary = (
                f"[requests_router] This request was submitted with the description: '{desc}'. "
                f"[requests_router] It is currently classified as having a {urgency} urgency level and is in a {status} status."
            )

        # Cache the summary in the request
        db.requests.update(request_id, {"summary": summary})
        log_handler.info(f"[requests_router] Successfully generated and cached summary for request '{request_id}'")
        return {"summary": summary}

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error generating request summary for '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while generating summary")


#Get a single request by ID
@router.get(config_loader['endpoints']['requests_endpoint']['detail_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def get_request(request: Request, request_id: str):
    """
    Retrieve a single service/maintenance request by its unique ID.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        request_id (str): The unique identifier of the request to retrieve.

    Returns:
        dict: The full request record including conversation history,
            involved parties, status, urgency, and notification log.

    Raises:
        HTTPException 404: If no request with the given ID exists.
        HTTPException 500: If an unexpected error occurs during lookup.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"[requests_router] Looking up request with id='{request_id}'")
        db = get_database_service()
        req = db.requests.find_by_id(request_id)

        if not req:
            message = f"[requests_router] Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"[requests_router] Request '{request_id}' retrieved successfully")
        return req

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error fetching request '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching request")


#Create a new request directly (bypasses conversation engine)
@router.post(config_loader['endpoints']['requests_endpoint']['create_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def create_request(request: Request, body: RequestCreatePayload):
    """
    Create a new service/maintenance request directly.

    This endpoint bypasses the conversation engine and creates a request
    record immediately with the provided fields. Useful for programmatic
    request creation or testing.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        body (dict): Request payload. Expected fields:
            - requester_id (str): ID of the tenant submitting the request.
            - type (str): Category of the request (e.g. plumbing_issue, lockout).
            - description (str): Human-readable description of the issue.
            - urgency (str, optional): low / medium / high. Defaults to "low".
            - involved_parties (list, optional): IDs of parties involved.
            - vendor_id (str, optional): ID of an assigned vendor.

    Returns:
        dict: The newly created request record with auto-generated ID,
            timestamps, and default status/sentiment fields.

    Raises:
        HTTPException 400: If requester_id or description is missing.
        HTTPException 500: If an unexpected error occurs during creation.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        #Build the new record from Pydantic model
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "id": f"request_{uuid.uuid4().hex[:8]}",
            "requester_id": body.requester_id.strip(),
            "type": normalize_request_type(body.type),
            "description": body.description.strip(),
            "status": "pending",
            "urgency": body.urgency,
            "involved_parties": body.involved_parties,
            "conversation_history": [],
            "created_at": now,
            "updated_at": now,
            "escalated": False,
            "sentiment": "neutral",
            "confidence": 0.0,
            "vendor_id": body.vendor_id,
            "notifications_sent": []
        }

        db = get_database_service()
        created = db.requests.create(record)
        log_handler.info(f"[requests_router] Request created successfully with id='{created['id']}'")
        return created

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error creating request: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while creating request")


#Partially update an existing request
@router.patch(config_loader['endpoints']['requests_endpoint']['update_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def update_request(request: Request, request_id: str, body: RequestUpdatePayload):
    """
    Partially update an existing service/maintenance request.

    Merges the provided fields into the existing record and stamps
    updated_at with the current UTC timestamp. Only non-None values
    in the body are applied.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        request_id (str): The unique identifier of the request to update.
        body (dict): Fields to update. Accepted fields include:
            - status (str): New status value.
            - urgency (str): New urgency level.
            - description (str): Updated description.
            - escalated (bool): Whether the request has been escalated.
            - sentiment (str): Detected tenant sentiment.
            - confidence (float): AI classification confidence score.
            - vendor_id (str): ID of the assigned vendor.

    Returns:
        dict: The fully updated request record after the merge.

    Raises:
        HTTPException 400: If the request body is empty.
        HTTPException 404: If no request with the given ID exists.
        HTTPException 500: If an unexpected error occurs during the update.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"[requests_router] Updating request with id='{request_id}'")

        db = get_database_service()
        #Confirm the record exists before attempting update
        existing = db.requests.find_by_id(request_id)
        if not existing:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        #Filter out None values from Pydantic model and stamp updated_at
        updates = body.model_dump(exclude_none=True)
        if "type" in updates:
            updates["type"] = normalize_request_type(updates["type"])
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        updated = db.requests.update(request_id, updates)
        log_handler.info(f"[requests_router] Request '{request_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error updating request '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating request")


#Cancel a tenant-owned request
@router.post("/{request_id}/cancel")
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def cancel_request(request: Request, request_id: str, body: RequestCancelPayload):
    """Cancel a request by status update rather than physical deletion."""
    try:
        db = get_database_service()
        req = db.requests.find_by_id(request_id)
        if not req:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        if req.get("requester_id") != body.cancelled_by:
            raise HTTPException(status_code=403, detail="Only the requesting tenant can cancel this request")

        if req.get("status") in TERMINAL_STATUSES:
            raise HTTPException(
                status_code=409,
                detail=f"Request '{request_id}' is already {req.get('status')}",
            )

        now = datetime.now(timezone.utc).isoformat()
        updates = {
            "status": "cancelled",
            "cancelled_at": now,
            "cancelled_by": body.cancelled_by,
            "updated_at": now,
        }
        if body.cancellation_reason is not None:
            updates["cancellation_reason"] = body.cancellation_reason

        updated = db.requests.update(request_id, updates)
        log_handler.info(f"[requests_router] Request '{request_id}' cancelled successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error cancelling request '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while cancelling request")


#Mark a request as complete/resolved
@router.post("/{request_id}/complete")
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def complete_request(request: Request, request_id: str, body: RequestCompletePayload):
    """Mark a request resolved and capture who completed it."""
    try:
        db = get_database_service()
        req = db.requests.find_by_id(request_id)
        if not req:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        if req.get("status") in TERMINAL_STATUSES:
            raise HTTPException(
                status_code=409,
                detail=f"Request '{request_id}' is already {req.get('status')}",
            )

        now = datetime.now(timezone.utc).isoformat()
        updates = {
            "status": "resolved",
            "resolved_at": now,
            "resolved_by": body.resolved_by,
            "updated_at": now,
        }
        if body.resolution_note is not None:
            updates["resolution_note"] = body.resolution_note

        updated = db.requests.update(request_id, updates)
        log_handler.info(f"[requests_router] Request '{request_id}' completed successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error completing request '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while completing request")


#Send notifications for a request (user confirmation)
@router.post("/{request_id}/send-notifications")
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def send_notifications(request: Request, request_id: str):
    """
    Send notifications for a request after user confirmation.

    This endpoint is called when the user confirms they want to send notifications
    to the relevant parties (manager, owner, vendor). It checks if notifications
    are pending and sends the appropriate notifications based on the request's
    status and urgency.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        request_id (str): The unique identifier of the request.

    Returns:
        dict: The updated request record with notification events appended.

    Raises:
        HTTPException 404: If no request with the given ID exists.
        HTTPException 400: If notifications are not pending or already sent.
        HTTPException 500: If an unexpected error occurs during notification dispatch.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug(f"[requests_router] Sending notifications for request_id='{request_id}'")

        db = get_database_service()
        #Fetch the request
        req = db.requests.find_by_id(request_id)
        if not req:
            message = f"[requests_router] Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        #Check if notifications are pending
        if not req.get("notification_pending", False):
            message = f"[requests_router] Notifications are not pending for request '{request_id}'"
            log_handler.warning(message)
            raise HTTPException(status_code=400, detail=message)

        #Dispatch notifications based on request status
        from src.notifications.notification_dispatcher import dispatch_on_create, dispatch_on_escalate

        if req.get("escalated", False):
            #Send escalation notifications (email + SMS for high urgency)
            events = dispatch_on_escalate(req)
        else:
            #Send create notifications (email to manager)
            events = dispatch_on_create(req)

        #Mark notifications as no longer pending
        updated = db.requests.update(request_id, {
            "notification_pending": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })

        log_handler.info(
            f"[requests_router] Successfully sent {len(events)} notification(s) for request '{request_id}'"
        )
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"[requests_router] Unexpected error sending notifications for '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while sending notifications")
