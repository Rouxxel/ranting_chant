"""
#############################################################################
### Request MCP tool file
###
### @file request_mcp.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides MCP-style data access tools for service/maintenance
request records. It handles creation, updates, escalation, and conversation
history management.
"""

#Native imports
import uuid
from datetime import datetime, timezone

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.json_store import (
    find_by_id, find_by_field, read_all, create_record, update_record
)

"""TOOLS-----------------------------------------------------------"""
def create_request(data: dict) -> dict:
    """
    Create a new service/maintenance request record.

    Generates a UUID-based ID, sets created_at and updated_at timestamps,
    and appends the record to the requests collection.

    Parameters:
        data (dict): Request data. Expected keys: requester_id, type,
            description, urgency, involved_parties, vendor_id,
            sentiment, confidence, escalated.

    Returns:
        dict: The newly created request record with all fields populated.
    """
    log_handler.debug("[request_mcp] Creating new request")
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "id": f"request_{uuid.uuid4().hex[:8]}",
        "requester_id": data.get("requester_id", ""),
        "type": data.get("type", "general"),
        "description": data.get("description", ""),
        "status": "pending",
        "urgency": data.get("urgency", "low"),
        "involved_parties": data.get("involved_parties", []),
        "conversation_history": data.get("conversation_history", []),
        "created_at": now,
        "updated_at": now,
        "escalated": data.get("escalated", False),
        "sentiment": data.get("sentiment", "neutral"),
        "confidence": data.get("confidence", 0.0),
        "vendor_id": data.get("vendor_id", None),
        "notifications_sent": [],
        "notification_pending": True
    }

    created = create_record("requests", record)
    log_handler.info(f"[request_mcp] Request created with id='{created['id']}'")

    # Notifications will be sent on user confirmation, not automatically
    # try:
    #     from src.notifications.notification_dispatcher import dispatch_on_create
    #     dispatch_on_create(created)
    # except Exception as notify_err:
    #     log_handler.error(f"[request_mcp] dispatch_on_create failed: {notify_err}")

    return created


def update_request(request_id: str, updates: dict) -> dict:
    """
    Merge updates into an existing request record and persist.

    Automatically stamps updated_at with the current UTC timestamp
    and applies request status state machine transitions:
    - pending -> in_progress (first AI reply)
    - in_progress -> pending_approval (lease/owner-approval requests)
    - in_progress -> escalated (escalation triggered)
    - in_progress -> resolved (workflow complete, no escalation)

    Parameters:
        request_id (str): The unique identifier of the request to update.
        updates (dict): Fields to merge into the existing record.

    Returns:
        dict: The updated request record.

    Raises:
        ValueError: If no request with request_id exists.
    """
    log_handler.debug(f"[request_mcp] Updating request_id='{request_id}'")

    # Confirm the record exists and fetch current status
    req = find_by_id("requests", request_id)
    if not req:
        raise ValueError(f"Request '{request_id}' not found")

    current_status = req.get("status", "pending")
    new_status = updates.get("status", current_status)

    # Apply state transitions
    if current_status == "pending":
        # Transition to in_progress on the first update / AI reply
        new_status = "in_progress"

    if new_status == "in_progress":
        is_escalated = updates.get("escalated", req.get("escalated", False))
        is_complete = updates.get("is_complete", False)
        req_type = updates.get("type", req.get("type", "general"))

        if is_escalated or updates.get("status") == "escalated":
            new_status = "escalated"
            updates["escalated"] = True
        elif is_complete:
            if req_type == "rental_agreement":
                new_status = "pending_approval"
            else:
                new_status = "resolved"

    # Ensure escalated flag is set if status is escalated
    if new_status == "escalated":
        updates["escalated"] = True

    updates["status"] = new_status
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Pop temporary is_complete helper if present so it is not persisted
    updates.pop("is_complete", None)

    updated = update_record("requests", request_id, updates)
    log_handler.info(
        f"[request_mcp] Request '{request_id}' updated successfully. "
        f"Status: {current_status} -> {new_status}"
    )
    return updated


def get_request(request_id: str) -> dict | None:
    """
    Look up a request record by its unique ID.

    Parameters:
        request_id (str): The unique identifier of the request.

    Returns:
        dict | None: The request record, or None if not found.
    """
    log_handler.debug(f"[request_mcp] Looking up request_id='{request_id}'")
    req = find_by_id("requests", request_id)
    if not req:
        log_handler.warning(f"[request_mcp] Request '{request_id}' not found")
    return req


def list_requests_by_tenant(tenant_id: str) -> list:
    """
    Return all requests submitted by a specific tenant.

    Matches against the requester_id field.

    Parameters:
        tenant_id (str): The tenant's unique identifier.

    Returns:
        list: A (possibly empty) list of request records for this tenant.
    """
    log_handler.debug(f"[request_mcp] Listing requests for tenant_id='{tenant_id}'")
    results = find_by_field("requests", "requester_id", tenant_id)
    log_handler.info(
        f"[request_mcp] Found {len(results)} request(s) for tenant '{tenant_id}'"
    )
    return results


def list_all_requests() -> list:
    """
    Return all request records from the data store.

    Returns:
        list: The complete list of request records.
    """
    log_handler.debug("[request_mcp] Listing all requests")
    requests = read_all("requests")
    log_handler.info(f"[request_mcp] Returning {len(requests)} request(s)")
    return requests


def escalate_request(request_id: str, reason: str) -> dict:
    """
    Escalate a request by setting its status and escalated flag.

    Sets status to "escalated", escalated to True, and appends a system
    message to the conversation history explaining the escalation reason.

    Parameters:
        request_id (str): The unique identifier of the request to escalate.
        reason (str): Human-readable reason for the escalation.

    Returns:
        dict: The updated request record after escalation.

    Raises:
        ValueError: If no request with request_id exists.
    """
    log_handler.debug(
        f"[request_mcp] Escalating request_id='{request_id}', reason='{reason}'"
    )

    #Fetch existing record to get current conversation history
    req = find_by_id("requests", request_id)
    if not req:
        raise ValueError(f"Request '{request_id}' not found")

    #Append escalation reason to conversation history
    now = datetime.now(timezone.utc).isoformat()
    history = req.get("conversation_history", [])
    history.append({
        "role": "system",
        "message": f"Request escalated: {reason}",
        "timestamp": now
    })

    updates = {
        "status": "escalated",
        "escalated": True,
        "conversation_history": history,
        "updated_at": now
    }

    updated = update_record("requests", request_id, updates)
    log_handler.info(f"[request_mcp] Request '{request_id}' escalated successfully")

    # Notifications will be sent on user confirmation, not automatically
    # try:
    #     from src.notifications.notification_dispatcher import dispatch_on_escalate
    #     dispatch_on_escalate(updated)
    # except Exception as notify_err:
    #     log_handler.error(f"[request_mcp] dispatch_on_escalate failed: {notify_err}")

    return updated


def append_conversation_turn(request_id: str, role: str, message: str) -> dict:
    """
    Append a single conversation message to a request's history.

    Creates a ConversationMessage-compatible dict with role, message,
    and a UTC timestamp, then persists it.

    Parameters:
        request_id (str): The unique identifier of the request.
        role (str): The speaker role — "tenant", "ai", or "system".
        message (str): The message text to append.

    Returns:
        dict: The updated request record with the new turn appended.

    Raises:
        ValueError: If no request with request_id exists.
    """
    log_handler.debug(
        f"[request_mcp] Appending turn to request_id='{request_id}', role='{role}'"
    )

    req = find_by_id("requests", request_id)
    if not req:
        raise ValueError(f"Request '{request_id}' not found")

    now = datetime.now(timezone.utc).isoformat()
    history = req.get("conversation_history", [])
    history.append({
        "role": role,
        "message": message,
        "timestamp": now
    })

    updated = update_record("requests", request_id, {
        "conversation_history": history,
        "updated_at": now
    })

    log_handler.info(
        f"[request_mcp] Appended '{role}' turn to request '{request_id}'"
    )
    return updated
