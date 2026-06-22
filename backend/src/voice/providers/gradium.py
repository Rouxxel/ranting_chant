"""
Gradium adapter for the shared voice provider interface.

TODO: Gradium is not being able to process STT requests
"""

from __future__ import annotations

import json
import os

import requests

from src.core_specs.configuration.config_loader import config_loader
from src.voice.providers.base import AudioBytesResult, TranscriptionResult, Voice, VoiceProviderError

GRADIUM_CONFIG = config_loader["voice_provider"]["gradium"]
GRADIUM_API_BASE_URL = GRADIUM_CONFIG["api_base_url"].rstrip("/")
DEFAULT_GRADIUM_VOICE_ID = GRADIUM_CONFIG["voice_id"]
DEFAULT_GRADIUM_TTS_MODEL = GRADIUM_CONFIG["tts_model"]
DEFAULT_GRADIUM_OUTPUT_FORMAT = GRADIUM_CONFIG["output_format"]

CONTENT_TYPES_BY_FORMAT = {
    "wav": "audio/wav",
    "ogg": "audio/ogg",
    "opus": "audio/ogg",
    "pcm": "audio/pcm",
}


class GradiumProvider:
    """Provider adapter for Gradium REST speech APIs."""

    provider_id = "gradium"
    display_name = "Gradium"
    supports_stt = True
    supports_tts = True
    supports_streaming_tts = False

    @property
    def is_configured(self) -> bool:
        return bool(os.getenv("GRADIUM_API_KEY", "").strip())

    @property
    def _api_key(self) -> str:
        return os.getenv("GRADIUM_API_KEY", "").strip()

    def _headers(self, content_type: str | None = None) -> dict[str, str]:
        headers = {"x-api-key": self._api_key}
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def transcribe(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/wav",
        language_code: str | None = None,
    ) -> TranscriptionResult:
        if not audio_bytes:
            raise VoiceProviderError("Audio bytes cannot be empty")

        try:
            response = requests.post(
                f"{GRADIUM_API_BASE_URL}/post/speech/asr",
                headers=self._headers(mime_type or "audio/wav"),
                data=audio_bytes,
                timeout=45,
                stream=True,
            )
            response.raise_for_status()

            transcript_parts: list[str] = []
            for line in response.iter_lines(decode_unicode=True):
                if not line:
                    continue
                payload = json.loads(line)
                event_type = payload.get("type")
                if event_type == "text" and payload.get("text"):
                    transcript_parts.append(payload["text"])
                elif event_type == "error":
                    raise VoiceProviderError(payload.get("message", "Gradium transcription failed"))

            transcript = " ".join(part.strip() for part in transcript_parts if part.strip()).strip()
            return TranscriptionResult(transcript=transcript, provider=self.provider_id)
        except VoiceProviderError:
            raise
        except Exception as exc:
            raise VoiceProviderError(f"Gradium transcription failed: {exc}") from exc

    def tts(
        self,
        text: str,
        voice_id: str | None = None,
        format: str | None = None,
        emergency: bool = False,
    ) -> AudioBytesResult:
        if not text or not text.strip():
            raise VoiceProviderError("Text cannot be empty")

        output_format = (format or DEFAULT_GRADIUM_OUTPUT_FORMAT).lower()
        body = {
            "text": f"Emergency. {text}" if emergency else text,
            "voice_id": voice_id or DEFAULT_GRADIUM_VOICE_ID,
            "model_name": DEFAULT_GRADIUM_TTS_MODEL,
            "output_format": output_format,
            "only_audio": True,
        }

        try:
            response = requests.post(
                f"{GRADIUM_API_BASE_URL}/post/speech/tts",
                headers=self._headers("application/json"),
                json=body,
                timeout=45,
            )
            response.raise_for_status()
            content_type = response.headers.get("content-type") or CONTENT_TYPES_BY_FORMAT.get(output_format, "audio/wav")
            return AudioBytesResult(
                audio_bytes=response.content,
                content_type=content_type.split(";")[0],
                format=output_format,
                provider=self.provider_id,
            )
        except Exception as exc:
            raise VoiceProviderError(f"Gradium text-to-speech failed: {exc}") from exc

    def list_voices(self) -> list[Voice]:
        return [Voice(id=DEFAULT_GRADIUM_VOICE_ID, name="Default Gradium Voice", provider=self.provider_id)]
