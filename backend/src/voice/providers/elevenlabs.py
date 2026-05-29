"""
ElevenLabs adapter for the shared voice provider interface.
"""

from __future__ import annotations

import os

from src.voice.providers.base import AudioBytesResult, TranscriptionResult, Voice, VoiceProviderError
from src.voice.stt_service import transcribe
from src.voice.tts_service import text_to_speech_bytes, text_to_speech_emergency


class ElevenLabsProvider:
    """Provider adapter that preserves the existing ElevenLabs code paths."""

    provider_id = "elevenlabs"
    display_name = "ElevenLabs"
    supports_stt = True
    supports_tts = True
    supports_streaming_tts = False

    @property
    def is_configured(self) -> bool:
        return bool(os.getenv("ELEVENLABS_API_KEY", "").strip())

    def transcribe(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/wav",
        language_code: str | None = None,
    ) -> TranscriptionResult:
        try:
            transcript = transcribe(audio_bytes)
            return TranscriptionResult(transcript=transcript, provider=self.provider_id)
        except Exception as exc:
            raise VoiceProviderError(f"ElevenLabs transcription failed: {exc}") from exc

    def tts(
        self,
        text: str,
        voice_id: str | None = None,
        format: str | None = None,
        emergency: bool = False,
    ) -> AudioBytesResult:
        try:
            audio_bytes = text_to_speech_emergency(text, voice_id) if emergency else text_to_speech_bytes(text, voice_id)
            return AudioBytesResult(
                audio_bytes=audio_bytes,
                content_type="audio/mpeg",
                format="mp3",
                provider=self.provider_id,
            )
        except Exception as exc:
            raise VoiceProviderError(f"ElevenLabs text-to-speech failed: {exc}") from exc

    def list_voices(self) -> list[Voice]:
        voice_id = os.getenv("ELEVENLABS_VOICE_ID", "").strip()
        if not voice_id:
            return []
        return [Voice(id=voice_id, name="Default ElevenLabs Voice", provider=self.provider_id)]
