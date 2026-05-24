"""
#############################################################################
### Speech-to-Text service file
###
### @file stt_service.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides speech-to-text transcription using ElevenLabs as the primary
service and faster-whisper as a fallback. It handles audio file transcription
for voice input in the Ranting Chant application.
"""

#Native imports
import os
import base64
import tempfile
from io import BytesIO

#Third-party imports
from elevenlabs.client import ElevenLabs
from faster_whisper import WhisperModel

#Other files imports
from src.utils.custom_logger import log_handler
from src.core_specs.configuration.config_loader import config_loader

"""VARIABLES-----------------------------------------------------------"""
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

# Initialize ElevenLabs client
client = None
if ELEVENLABS_API_KEY:
    try:
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        whisper_model = WhisperModel(
            config_loader["elevenlabs_model"]["stt"]["default_model"], 
            device=config_loader["elevenlabs_model"]["stt"]["device"], 
            compute_type=config_loader["elevenlabs_model"]["stt"]["compute_type"],
            cpu_threads=config_loader["elevenlabs_model"]["stt"]["cpu_threads"],
            num_workers=config_loader["elevenlabs_model"]["stt"]["num_workers"]
            )
        log_handler.debug("ElevenLabs client initialized, whisper model selected")
    except Exception as e:
        log_handler.warning(f"Failed to initialize ElevenLabs client: {e}")
else:
    log_handler.warning("ELEVENLABS_API_KEY not set — STT will use Whisper fallback only")

"""METHODS-----------------------------------------------------------"""
def transcribe_elevenlabs(audio_bytes: bytes, language_code: str = "eng") -> str:
    """
    Transcribe audio using ElevenLabs Speech-to-Text API.

    Parameters:
        audio_bytes (bytes): The audio data as bytes.
        language_code (str): Language code for transcription (default: "eng").

    Returns:
        str: The transcribed text.

    Raises:
        Exception: If ElevenLabs API call fails.
    """
    if not client:
        raise RuntimeError("ElevenLabs client not configured")

    try:
        log_handler.debug("[stt_service] Transcribing audio with ElevenLabs")
        
        if not audio_bytes:
            raise ValueError("Audio bytes cannot be empty")
        audio_file = BytesIO(audio_bytes)
        audio_file.name = "audio.mp3"
        
        result = client.speech_to_text.convert(
            file=audio_file,
            model_id=config_loader["elevenlabs_model"]["stt"]["model_id"],
            language_code=config_loader["elevenlabs_model"]["stt"]["language_code"],
            diarize=config_loader["elevenlabs_model"]["stt"]["diarize"]
        )
        
        transcript = result.text
        log_handler.info(f"[stt_service] ElevenLabs transcription successful: {transcript[:50]}...")
        return transcript
        
    except Exception as e:
        log_handler.error(f"[stt_service] ElevenLabs transcription failed: {e}")
        raise


def transcribe_whisper(audio_path: str) -> str:
    """
    Transcribe audio using faster-whisper as a fallback.

    Parameters:
        audio_path (str): Path to the audio file.

    Returns:
        str: The transcribed text.

    Raises:
        Exception: If Whisper transcription fails.
    """
    try:
        log_handler.debug(f"[stt_service] Transcribing audio with Whisper: {audio_path}")
        
        segments, info = whisper_model.transcribe(audio_path)
        
        transcript = " ".join(segment.text.strip() for segment in segments)
        log_handler.info(f"[stt_service] Whisper transcription successful: {transcript[:50]}...")
        return transcript
        
    except Exception as e:
        log_handler.error(f"[stt_service] Whisper transcription failed: {e}")
        raise


def transcribe(audio_bytes: bytes) -> str:
    """
    Transcribe audio using ElevenLabs first, falling back to Whisper on failure.

    Parameters:
        audio_bytes (bytes): The audio data as bytes.

    Returns:
        str: The transcribed text.
    """
    # Try ElevenLabs first
    try:
        return transcribe_elevenlabs(audio_bytes)
    except Exception as e:
        log_handler.warning(f"[stt_service] ElevenLabs failed, falling back to Whisper: {e}")
    
    # Fallback to Whisper
    try:
        # Save bytes to temporary file for Whisper
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=True) as temp_file:
            temp_file.write(audio_bytes)
            temp_file.flush()

            transcript = transcribe_whisper(temp_file.name)
            return transcript
            
    except Exception as e:
        log_handler.error(f"[stt_service] Both transcription methods failed: {e}")
        raise RuntimeError("Failed to transcribe audio with both ElevenLabs and Whisper")
