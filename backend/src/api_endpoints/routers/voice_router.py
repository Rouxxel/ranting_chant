"""
#############################################################################
### Voice router file
###
### @file voice_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines endpoints for voice-based interactions with the Ranting Chant
AI assistant. It supports audio transcription, starting voice sessions with audio
greetings, and processing voice messages with audio responses.
"""

# Native imports
from datetime import datetime, timezone
from typing import Optional

# Third-party imports
from fastapi import APIRouter, HTTPException, Request, UploadFile
from pydantic import BaseModel

# Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.mcp import tenant_mcp, property_mcp, request_mcp
from src.ai.conversation_engine import ConversationEngine
from src.ai.gemini_client import get_client
from src.voice.stt_service import transcribe
from src.voice.tts_service import text_to_speech_base64, text_to_speech_emergency_base64

"""PYDANTIC MODELS-----------------------------------------------------------"""
class VoiceStartPayload(BaseModel):
    """Payload accepted when starting a voice session."""
    tenant_id: str


class VoiceRespondPayload(BaseModel):
    """Payload accepted when sending a voice message in a session."""
    request_id: str
    tenant_id: str
    transcript: str


"""API ROUTER-----------------------------------------------------------"""
# Get API router
router = APIRouter(
    prefix="/voice",
    tags=["Voice"]
)

# Reusable ConversationEngine instance
conversation_engine = ConversationEngine()


"""ENDPOINTS-----------------------------------------------------------"""
# Transcribe audio to text
@router.post("/transcribe")
@SlowLimiter.limit("10/minute")
async def transcribe_audio(request: Request, audio: UploadFile):
    """
    Transcribe uploaded audio file to text using ElevenLabs (primary) or Whisper (fallback).

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        audio (UploadFile): The audio file to transcribe.

    Returns:
        dict: The transcribed text.

    Raises:
        HTTPException 400: If the audio file is invalid or transcription fails.
        HTTPException 500: If an unexpected error occurs during transcription.
    """
    try:
        log_handler.debug(f"Transcribing audio file: {audio.filename}")
        
        # Read audio bytes
        audio_bytes = await audio.read()
        
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")
        
        # Transcribe audio
        transcript = transcribe(audio_bytes)
        
        log_handler.info(f"Audio transcribed successfully: {transcript[:50]}...")
        return {"transcript": transcript}
        
    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while transcribing audio")


# Start a new voice session with audio greeting
@router.post("/start")
@SlowLimiter.limit("10/minute")
async def start_voice_session(request: Request, body: VoiceStartPayload):
    """
    Start a new voice session with an audio greeting.

    Fetches the tenant and their associated property, generates a warm,
    personalized greeting via Gemini, creates a stub request record,
    converts the greeting to audio, and returns the session details with audio.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        body (VoiceStartPayload): The tenant_id of the initiating tenant.

    Returns:
        dict: Session details including request_id, greeting_text, greeting_audio_base64,
              tenant_name, property_name.

    Raises:
        HTTPException 404: If the tenant with tenant_id does not exist.
        HTTPException 500: If an unexpected error occurs during startup.
    """
    try:
        tenant_id = body.tenant_id.strip()
        log_handler.debug(f"Starting voice session for tenant_id='{tenant_id}'")

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
            "description": "Voice conversation started",
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

        # 5. Convert greeting to audio
        greeting_audio_base64 = text_to_speech_base64(greeting)

        log_handler.info(
            f"Successfully started voice session for tenant '{tenant_id}'. "
            f"Stub request record created with id='{stub_request['id']}'"
        )
        return {
            "request_id": stub_request["id"],
            "greeting_text": greeting,
            "greeting_audio_base64": greeting_audio_base64,
            "tenant_name": tenant.get("name"),
            "property_name": prop_name
        }

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error starting voice session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while starting voice session")


# Send a voice message in a session
@router.post("/respond")
@SlowLimiter.limit("10/minute")
async def respond_to_voice_message(request: Request, body: VoiceRespondPayload):
    """
    Process a voice message transcript and return audio response.

    Calls the ConversationEngine to process the transcript and generate a reply.
    Appends the tenant's turn and the AI's reply to the request's history,
    updates request metadata, triggers state machine transitions, and converts
    the AI reply to audio. If escalated, uses emergency TTS.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        body (VoiceRespondPayload): Request details containing request_id, tenant_id,
            and the transcribed message text.

    Returns:
        dict: AI reply text, audio response (base64), and updated session/request status.

    Raises:
        HTTPException 404: If the request_id or tenant_id does not exist.
        HTTPException 500: If an unexpected error occurs during processing.
    """
    try:
        request_id = body.request_id.strip()
        tenant_id = body.tenant_id.strip()
        transcript = body.transcript.strip()

        log_handler.debug(f"Processing voice message in session='{request_id}' from tenant='{tenant_id}'")

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
            message=transcript,
            conversation_history=history
        )

        # 3. Append turns to conversation history
        now = datetime.now(timezone.utc).isoformat()
        updated_history = list(history)
        updated_history.append({
            "role": "tenant",
            "message": transcript,
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

        # 5. Save updates to request, triggering state machine transitions
        updated_request = request_mcp.update_request(request_id, updates)

        # 6. Convert AI reply to audio (use emergency TTS if escalated)
        reply_text = parsed_response.get("reply", "")
        is_escalated = updated_request.get("escalated", False)
        
        if is_escalated:
            log_handler.info(f"Request '{request_id}' is escalated, using emergency TTS")
            audio_base64 = text_to_speech_emergency_base64(reply_text)
        else:
            audio_base64 = text_to_speech_base64(reply_text)

        log_handler.info(
            f"Voice message processed successfully in session '{request_id}'. "
            f"Status: {updated_request.get('status')}, "
            f"Escalated: {is_escalated}, "
            f"Is Complete: {parsed_response.get('is_complete')}"
        )

        return {
            "reply_text": reply_text,
            "audio_base64": audio_base64,
            "status": updated_request.get("status"),
            "urgency": updated_request.get("urgency"),
            "escalated": is_escalated,
            "is_complete": parsed_response.get("is_complete")
        }

    except HTTPException:
        raise
    except Exception as e:
        log_handler.error(f"Unexpected error processing voice message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while processing voice message")
