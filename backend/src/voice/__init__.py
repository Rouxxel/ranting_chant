"""
#############################################################################
### Voice module package
###
### @file __init__.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides speech-to-text and text-to-speech services for voice
interactions in the Ranting Chant application.
"""

from src.voice.stt_service import transcribe, transcribe_elevenlabs, transcribe_whisper
from src.voice.tts_service import (
    text_to_speech_bytes,
    text_to_speech_base64,
    text_to_speech_emergency,
    text_to_speech_emergency_base64
)

__all__ = [
    "transcribe",
    "transcribe_elevenlabs",
    "transcribe_whisper",
    "text_to_speech_bytes",
    "text_to_speech_base64",
    "text_to_speech_emergency",
    "text_to_speech_emergency_base64"
]
