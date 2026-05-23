"""
#############################################################################
### Conversation router file
###
### @file conversation_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines endpoints for tenant-AI conversation sessions.
It supports starting a session with a customized greeting, processing
messages in a multi-turn conversation, and retrieving conversation history.
"""

# Native imports
from datetime import datetime, timezone
import uuid
from typing import Optional

# Third-party imports
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

# Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.mcp import tenant_mcp, property_mcp, vendor_mcp, request_mcp
from src.ai.conversation_engine import ConversationEngine
from src.ai.gemini_client import get_client

"""PYDANTIC MODELS-----------------------------------------------------------"""
class ConversationStartPayload(BaseModel):
    """Payload accepted when starting a conversation session."""
    tenant_id: str


class ConversationMessagePayload(BaseModel):
    """Payload accepted when sending a message inside a session."""
    request_id: str
    tenant_id: str
    message: str


"""API ROUTER-----------------------------------------------------------"""
# Get API router
router = APIRouter(
    prefix=config_loader['endpoints']['conversation_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['conversation_endpoint']['endpoint_tag']],
)

# Reusable ConversationEngine instance
conversation_engine = ConversationEngine()


"""ENDPOINTS-----------------------------------------------------------"""
# Start a new conversation session
@router.post(config_loader['endpoints']['conversation_endpoint']['start_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['conversation_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['conversation_endpoint']['unit_of_time_for_limit']}"
)
async def start_conversation(request: Request, body: ConversationStartPayload):
    """
    Start a new conversation session.

    Fetches the tenant and their associated property, generates a warm,
    personalized greeting via Gemini, creates a stub request record
    with status 'pending' containing the greeting, and returns the session details.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        body (ConversationStartPayload): The tenant_id of the initiating tenant.

    Returns:
        dict: Session details including request_id, greeting, tenant_name, property_name.

    Raises:
        HTTPException 404: If the tenant with tenant_id does not exist.
        HTTPException 500: If an unexpected error occurs during startup.
    """
    try:
        tenant_id = body.tenant_id.strip()
        log_handler.debug(f"Starting conversation for tenant_id='{tenant_id}'")

        # 1. Fetch tenant
        tenant = tenant_mcp.lookup_tenant(tenant_id)
        if not tenant:
            message = f"Tenant '{tenant_id}' not found"
            log_handler.warning(message)
            raise HTTPException(status_code=404, detail=message)

        # 2. Fetch associated property
        prop = tenant_mcp.get_tenant_property(tenant_id)
        prop_name = prop.get("name", "Unknown Property") if prop else "Unknown Property"

        # 3. Build personalized greeting using Gemini
        greeting = ""
        try:
            client = get_client()
            prompt = (
                f"You are the AI property operations coordinator for Ranting Chant.\n"
                f"Generate a warm, professional, and concise greeting for the following tenant:\n"
                f"Tenant Name: {tenant.get('name')}\n"
                f"Property: {prop_name}\n"
                f"Address: {tenant.get('address', 'N/A')}\n\n"
                f"The greeting should be short (1-2 sentences), welcome the tenant, and ask how you can help them today.\n"
                f"Do not include any placeholders, markdown, or extra formatting. Just the greeting text."
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            if response and response.text:
                greeting = response.text.strip()
        except Exception as ai_err:
            log_handler.error(f"Failed to generate greeting via Gemini: {ai_err}")

        # Fallback greeting if Gemini fails or is empty
        if not greeting:
            greeting = (
                f"Hello {tenant.get('name')}, welcome to Ranting Chant. "
                f"How can I assist you with your home at {prop_name} today?"
            )

        # 4. Create a stub request record with status 'pending'
        now = datetime.now(timezone.utc).isoformat()
        request_data = {
            "requester_id": tenant_id,
            "type": "general",
            "description": "Conversation started",
            "urgency": "low",
            "involved_parties": [tenant_id],
            "conversation_history": [
                {
                    "role": "ai",
                    "message": greeting,
                    "timestamp": now
                }
            ],
            "escalated": False,
            "sentiment": "neutral",
            "confidence": 1.0,
            "vendor_id": None
        }
        stub_request = request_mcp.create_request(request_data)

        log_handler.info(
            f"Successfully started conversation session for tenant '{tenant_id}'. "
            f"Stub request record created with id='{stub_request['id']}'"
        )
        return {
            "request_id": stub_request["id"],
            "greeting": greeting,
            "tenant_name": tenant.get("name"),
            "property_name": prop_name
        }

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error starting conversation session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while starting conversation")


# Send a message inside a conversation session
@router.post(config_loader['endpoints']['conversation_endpoint']['message_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['conversation_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['conversation_endpoint']['unit_of_time_for_limit']}"
)
async def send_message(request: Request, body: ConversationMessagePayload):
    """
    Send a message within an existing conversation session.

    Calls the ConversationEngine to process the message and generate a reply.
    Appends the tenant's turn and the AI's reply to the request's history,
    updates request metadata (type, urgency, sentiment, confidence, escalated),
    triggers state machine transitions, and automatically routes/assigns vendors
    if the intake is complete.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        body (ConversationMessagePayload): Request details containing
            request_id, tenant_id, and the message text.

    Returns:
        dict: AI reply and updated session/request status.

    Raises:
        HTTPException 404: If the request_id or tenant_id does not exist.
        HTTPException 500: If an unexpected error occurs during processing.
    """
    try:
        request_id = body.request_id.strip()
        tenant_id = body.tenant_id.strip()
        message = body.message.strip()

        log_handler.debug(f"Processing message in session='{request_id}' from tenant='{tenant_id}'")

        # 1. Fetch existing request record
        req = request_mcp.get_request(request_id)
        if not req:
            err_msg = f"Request '{request_id}' not found"
            log_handler.warning(err_msg)
            raise HTTPException(status_code=404, detail=err_msg)

        history = req.get("conversation_history", [])

        # 2. Call conversation engine
        parsed_response = conversation_engine.process_message(
            tenant_id=tenant_id,
            request_id=request_id,
            message=message,
            conversation_history=history
        )

        # 3. Append turns to conversation history
        now = datetime.now(timezone.utc).isoformat()
        updated_history = list(history)
        updated_history.append({
            "role": "tenant",
            "message": message,
            "timestamp": now
        })
        updated_history.append({
            "role": "ai",
            "message": parsed_response.get("reply", ""),
            "timestamp": now
        })

        # 4. Build updates dictionary
        updates = {
            "conversation_history": updated_history,
            "type": parsed_response.get("type"),
            "urgency": parsed_response.get("urgency"),
            "sentiment": parsed_response.get("sentiment"),
            "confidence": parsed_response.get("confidence"),
            "escalated": parsed_response.get("escalate", False),
            "is_complete": parsed_response.get("is_complete", False),
        }

        # If the intake is complete and a vendor is required, assign first matching vendor
        vendor_service = parsed_response.get("vendor_service_needed")
        if parsed_response.get("is_complete") and vendor_service:
            vendors = vendor_mcp.find_vendors_by_service(vendor_service)
            if vendors:
                updates["vendor_id"] = vendors[0].get("id")
                log_handler.info(
                    f"Intake complete. Assigned vendor '{vendors[0].get('id')}' "
                    f"for service category '{vendor_service}'"
                )

        # 5. Save updates to request, triggering state machine transitions
        updated_request = request_mcp.update_request(request_id, updates)

        log_handler.info(
            f"Message processed successfully in session '{request_id}'. "
            f"Status: {updated_request.get('status')}, "
            f"Is Complete: {parsed_response.get('is_complete')}"
        )

        return {
            "reply": parsed_response.get("reply"),
            "status": updated_request.get("status"),
            "urgency": updated_request.get("urgency"),
            "escalated": updated_request.get("escalated"),
            "is_complete": parsed_response.get("is_complete")
        }

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error processing conversation message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while processing message")


# Get conversation history for a request
@router.get(config_loader['endpoints']['conversation_endpoint']['history_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['conversation_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['conversation_endpoint']['unit_of_time_for_limit']}"
)
async def get_history(request: Request, request_id: str):
    """
    Retrieve the full conversation history for a request.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        request_id (str): The unique identifier of the request.

    Returns:
        list: The list of conversation turns in the session.

    Raises:
        HTTPException 404: If the request_id does not exist.
        HTTPException 500: If an unexpected error occurs during lookup.
    """
    try:
        log_handler.debug(f"Fetching conversation history for request_id='{request_id}'")

        req = request_mcp.get_request(request_id)
        if not req:
            err_msg = f"Request '{request_id}' not found"
            log_handler.warning(err_msg)
            raise HTTPException(status_code=404, detail=err_msg)

        history = req.get("conversation_history", [])
        log_handler.info(f"Returning {len(history)} turn(s) for request '{request_id}'")
        return history

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error fetching conversation history: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching history")
