"""
#############################################################################
### Text-to-Speech service file
###
### @file tts_service.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides text-to-speech conversion using ElevenLabs. It generates
audio responses for the Ranting Chant application, including emergency mode
with urgency tone prefixes.
"""

#Native imports
import os
import base64

#Third-party imports
from elevenlabs.client import ElevenLabs

#Other files imports
from src.utils.custom_logger import log_handler
from src.core_specs.configuration.config_loader import config_loader

"""VARIABLES-----------------------------------------------------------"""
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_CONFIG = config_loader["voice_provider"]["elevenlabs"]

# Initialize ElevenLabs client
client = None
if ELEVENLABS_API_KEY:
    try:
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        log_handler.debug("[tts_service] ElevenLabs client initialized")
    except Exception as e:
        log_handler.warning(f"[tts_service] Failed to initialize ElevenLabs client: {e}")
else:
    log_handler.warning("[tts_service] ELEVENLABS_API_KEY not set — TTS will be disabled")

"""METHODS-----------------------------------------------------------"""
def text_to_speech_bytes(text: str, voice_id: str | None = None) -> bytes:
    """
    Convert text to speech audio using ElevenLabs.

    Parameters:
        text (str): The text to convert to speech.
        voice_id (str | None): Optional voice ID. If None, uses default from env.

    Returns:
        bytes: The audio data as bytes (MP3 format).

    Raises:
        Exception: If ElevenLabs API call fails.
    """
    if not client:
        raise RuntimeError("ElevenLabs client not configured")

    if not text or not text.strip():
        raise ValueError("Text cannot be empty")

    try:
        log_handler.debug(f"[tts_service] Converting text to speech: {text[:50]}...")
        
        audio_stream = client.text_to_speech.convert(
            voice_id=voice_id or ELEVENLABS_CONFIG["tts"]["voice_id"],
            text=text,
            model_id=ELEVENLABS_CONFIG["tts"]["model_id"],
            output_format=ELEVENLABS_CONFIG["tts"]["output_format"]
        )
        audio_bytes = b"".join(chunk for chunk in audio_stream)
        
        log_handler.info("[tts_service] TTS conversion successful")
        return audio_bytes
        
    except Exception as e:
        log_handler.error(f"[tts_service] TTS conversion failed: {e}")
        raise


def text_to_speech_base64(text: str, voice_id: str | None = None) -> str:
    """
    Convert text to speech and return base64-encoded MP3 string.

    Parameters:
        text (str): The text to convert to speech.
        voice_id (str | None): Optional voice ID. If None, uses default from env.

    Returns:
        str: Base64-encoded MP3 audio string.
    """
    audio_bytes = text_to_speech_bytes(text, voice_id)
    base64_str = base64.b64encode(audio_bytes).decode('utf-8')
    log_handler.debug("[tts_service] Audio encoded to base64")
    return base64_str


def text_to_speech_emergency(text: str, voice_id: str | None = None) -> bytes:
    """
    Convert text to speech with an emergency urgency tone prefix.

    Parameters:
        text (str): The text to convert to speech.
        voice_id (str | None): Optional voice ID. If None, uses default from env.

    Returns:
        bytes: The audio data as bytes (MP3 format) with urgency tone.
    """
    # Prepend urgency tone indicator
    emergency_text = f"Emergency. {text}"
    
    log_handler.info("[tts_service] Generating emergency TTS response")
    return text_to_speech_bytes(emergency_text, voice_id)


def text_to_speech_emergency_base64(text: str, voice_id: str | None = None) -> str:
    """
    Convert text to speech with emergency tone and return base64-encoded MP3.

    Parameters:
        text (str): The text to convert to speech.
        voice_id (str | None): Optional voice ID. If None, uses default from env.

    Returns:
        str: Base64-encoded MP3 audio string with urgency tone.
    """
    audio_bytes = text_to_speech_emergency(text, voice_id)
    base64_str = base64.b64encode(audio_bytes).decode('utf-8')
    log_handler.debug("[tts_service] Emergency audio encoded to base64")
    return base64_str
