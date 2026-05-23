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

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.utils.json_store import (
    read_all, find_by_id, find_by_field, create_record, update_record
)
from src.ai.gemini_client import get_client

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
        if tenant_id:
            log_handler.debug(f"Listing requests filtered by tenant_id='{tenant_id}'")
            results = find_by_field("requests", "requester_id", tenant_id)
            log_handler.info(f"Found {len(results)} request(s) for tenant '{tenant_id}'")
            return results

        log_handler.debug("Listing all requests")
        requests = read_all("requests")
        log_handler.info(f"Returning {len(requests)} request(s)")
        return requests

    except Exception as e:
        log_handler.error(f"Unexpected error listing requests: {e}")
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
        log_handler.debug(f"Fetching notifications for request_id='{request_id}'")
        req = find_by_id("requests", request_id)

        if not req:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        notifications = req.get("notifications_sent", [])
        log_handler.info(
            f"Returning {len(notifications)} notification(s) for request '{request_id}'"
        )
        return notifications

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error fetching notifications for '{request_id}': {e}")
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
        log_handler.debug(f"Generating summary for request_id='{request_id}'")
        req = find_by_id("requests", request_id)

        if not req:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        history = req.get("conversation_history", [])
        if not history:
            log_handler.info(f"No conversation history available for request '{request_id}'")
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
                model="gemini-2.5-flash",
                contents=prompt,
            )
            if response and response.text:
                summary = response.text.strip()
        except Exception as ai_err:
            log_handler.error(f"Failed to generate summary via Gemini: {ai_err}")

        if not summary:
            # Fallback simple programmatically generated summary if Gemini fails
            desc = req.get("description", "No description provided.")
            urgency = req.get("urgency", "low")
            status = req.get("status", "pending")
            summary = (
                f"This request was submitted with the description: '{desc}'. "
                f"It is currently classified as having a {urgency} urgency level and is in a {status} status."
            )

        log_handler.info(f"Successfully generated summary for request '{request_id}'")
        return {"summary": summary}

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error generating request summary for '{request_id}': {e}")
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
        log_handler.debug(f"Looking up request with id='{request_id}'")
        req = find_by_id("requests", request_id)

        if not req:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        log_handler.info(f"Request '{request_id}' retrieved successfully")
        return req

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error fetching request '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching request")


#Create a new request directly (bypasses conversation engine)
@router.post(config_loader['endpoints']['requests_endpoint']['create_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def create_request(request: Request, body: dict):
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
        #Validate required fields
        requester_id = body.get("requester_id", "").strip()
        description = body.get("description", "").strip()

        if not requester_id:
            message = "Field 'requester_id' is required and must not be empty"
            log_handler.warning(message)
            raise HTTPException(status_code=400, detail=message)

        if not description:
            message = "Field 'description' is required and must not be empty"
            log_handler.warning(message)
            raise HTTPException(status_code=400, detail=message)

        #Build the new record
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "id": f"request_{uuid.uuid4().hex[:8]}",
            "requester_id": requester_id,
            "type": body.get("type", "general"),
            "description": description,
            "status": "pending",
            "urgency": body.get("urgency", "low"),
            "involved_parties": body.get("involved_parties", []),
            "conversation_history": [],
            "created_at": now,
            "updated_at": now,
            "escalated": False,
            "sentiment": "neutral",
            "confidence": 0.0,
            "vendor_id": body.get("vendor_id", None),
            "notifications_sent": []
        }

        created = create_record("requests", record)
        log_handler.info(f"Request created successfully with id='{created['id']}'")
        return created

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error creating request: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while creating request")


#Partially update an existing request
@router.patch(config_loader['endpoints']['requests_endpoint']['update_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['requests_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['requests_endpoint']['unit_of_time_for_limit']}"
)
async def update_request(request: Request, request_id: str, body: dict):
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
        #Validate body is not empty
        if not body:
            message = "Request body must not be empty"
            log_handler.warning(message)
            raise HTTPException(status_code=400, detail=message)

        log_handler.debug(f"Updating request with id='{request_id}'")

        #Confirm the record exists before attempting update
        existing = find_by_id("requests", request_id)
        if not existing:
            message = f"Request '{request_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        #Filter out None values and stamp updated_at
        updates = {k: v for k, v in body.items() if v is not None}
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        updated = update_record("requests", request_id, updates)
        log_handler.info(f"Request '{request_id}' updated successfully")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error updating request '{request_id}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating request")
