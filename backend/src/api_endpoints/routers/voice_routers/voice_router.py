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
import base64
from datetime import datetime, timezone
from typing import Optional

# Third-party imports
from fastapi import APIRouter, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel

# Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.mcp import tenant_mcp, request_mcp
from src.ai.conversation_engine import ConversationEngine
from src.ai.gemini_client import get_client
from src.voice.providers import (
    InvalidVoiceRequestError,
    ProviderUnavailableError,
    VoiceProviderError,
    get_voice_provider,
    list_voice_provider_voices,
    list_voice_providers,
)

"""PYDANTIC MODELS-----------------------------------------------------------"""
class VoiceStartPayload(BaseModel):
    """Payload accepted when starting a voice session."""
    tenant_id: str
    provider: Optional[str] = None
    voice_id: Optional[str] = None


class VoiceRespondPayload(BaseModel):
    """Payload accepted when sending a voice message in a session."""
    request_id: str
    tenant_id: str
    transcript: str
    provider: Optional[str] = None
    voice_id: Optional[str] = None


"""API ROUTER-----------------------------------------------------------"""
# Get API router
router = APIRouter(
    prefix="/voice",
    tags=["Voice"]
)

# Reusable ConversationEngine instance
conversation_engine = ConversationEngine()


def _provider_exception_to_http(exc: VoiceProviderError) -> HTTPException:
    """Map provider-layer errors to stable HTTP responses."""
    if isinstance(exc, InvalidVoiceRequestError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, ProviderUnavailableError):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=502, detail=str(exc))


"""ENDPOINTS-----------------------------------------------------------"""
@router.get("/providers")
@SlowLimiter.limit("30/minute")
async def get_voice_providers(request: Request):
    """Return supported voice providers and configuration/capability metadata."""
    return list_voice_providers()


@router.get("/voices")
@SlowLimiter.limit("30/minute")
async def get_voice_provider_voices(request: Request, provider: Optional[str] = None):
    """Return available voices for a configured provider."""
    try:
        return list_voice_provider_voices(provider)
    except VoiceProviderError as e:
        log_handler.error(f"[voice_router] Voice provider error listing voices: {e}")
        raise _provider_exception_to_http(e)


# Transcribe audio to text
@router.post("/transcribe")
@SlowLimiter.limit("10/minute")
async def transcribe_audio(request: Request, audio: UploadFile, provider: Optional[str] = Form(None)):
    """
    Transcribe uploaded audio file to text using the selected voice provider.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.
        audio (UploadFile): The audio file to transcribe.
        provider (str | None): Optional provider override, e.g. elevenlabs or gradium.

    Returns:
        dict: The transcribed text.
    """
    try:
        log_handler.debug(f"[voice_router] Transcribing audio file: {audio.filename}")

        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        voice_provider = get_voice_provider(provider)
        log_handler.info(f"[voice_router] Using voice provider '{voice_provider.provider_id}' for transcription")
        result = voice_provider.transcribe(audio_bytes, mime_type=audio.content_type or "audio/wav")

        log_handler.info(f"[voice_router] Audio transcribed successfully: {result.transcript[:50]}...")
        return {"transcript": result.transcript}

    except HTTPException:
        raise
    except VoiceProviderError as e:
        log_handler.error(f"[voice_router] Voice provider error transcribing audio: {e}")
        raise _provider_exception_to_http(e)
    except Exception as e:
        log_handler.error(f"[voice_router] Unexpected error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while transcribing audio")


# Start a new voice session with audio greeting
@router.post("/start")
@SlowLimiter.limit("10/minute")
async def start_voice_session(request: Request, body: VoiceStartPayload):
    """
    Start a new voice session with an audio greeting.

    This endpoint is provider-aware: if body.provider is supplied it uses that
    provider for greeting audio; otherwise it uses VOICE_PROVIDER_DEFAULT.
    """
    try:
        tenant_id = body.tenant_id.strip()
        log_handler.debug(f"[voice_router] Starting voice session for tenant_id='{tenant_id}'")

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
                model=config_loader["llm_model"]["default_model"],
                contents=prompt,
            )
            if response and response.text:
                greeting = response.text.strip()
        except Exception as ai_err:
            log_handler.error(f"[voice_router] Failed to generate greeting via Gemini: {ai_err}")

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

        # 5. Convert greeting to audio through selected provider
        voice_provider = get_voice_provider(body.provider)
        log_handler.info(f"[voice_router] Using voice provider '{voice_provider.provider_id}' for session greeting")
        greeting_audio = voice_provider.tts(greeting, voice_id=body.voice_id)
        greeting_audio_base64 = base64.b64encode(greeting_audio.audio_bytes).decode("utf-8")

        log_handler.info(
            f"[voice_router] Successfully started voice session for tenant '{tenant_id}'. "
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
    except VoiceProviderError as e:
        log_handler.error(f"[voice_router] Voice provider error starting voice session: {e}")
        raise _provider_exception_to_http(e)
    except Exception as e:
        log_handler.error(f"[voice_router] Unexpected error starting voice session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while starting voice session")


# Send a voice message in a session
@router.post("/respond")
@SlowLimiter.limit("10/minute")
async def respond_to_voice_message(request: Request, body: VoiceRespondPayload):
    """
    Process a voice message transcript and return audio response.
    """
    try:
        request_id = body.request_id.strip()
        tenant_id = body.tenant_id.strip()
        transcript = body.transcript.strip()

        log_handler.debug(f"[voice_router] Processing voice message in session='{request_id}' from tenant='{tenant_id}'")

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

        voice_provider = get_voice_provider(body.provider)
        log_handler.info(f"[voice_router] Using voice provider '{voice_provider.provider_id}' for voice response")
        if is_escalated:
            log_handler.info(f"[voice_router] Request '{request_id}' is escalated, using emergency TTS")
        audio_result = voice_provider.tts(reply_text, voice_id=body.voice_id, emergency=is_escalated)
        audio_base64 = base64.b64encode(audio_result.audio_bytes).decode("utf-8")

        log_handler.info(
            f"[voice_router] Voice message processed successfully in session '{request_id}'. "
            f"Status: {updated_request.get('status')}, "
            f"Escalated: {is_escalated}, "
            f"Is Complete: {parsed_response.get('is_complete')}"
        )

        return {
            "reply_text": reply_text,
            "audio_base64": audio_base64,
            "status": updated_request.get("status"),
            "type": updated_request.get("type"),
            "urgency": updated_request.get("urgency"),
            "escalated": is_escalated,
            "is_complete": parsed_response.get("is_complete")
        }

    except HTTPException:
        raise
    except VoiceProviderError as e:
        log_handler.error(f"[voice_router] Voice provider error processing voice message: {e}")
        raise _provider_exception_to_http(e)
    except Exception as e:
        log_handler.error(f"[voice_router] Unexpected error processing voice message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while processing voice message")
