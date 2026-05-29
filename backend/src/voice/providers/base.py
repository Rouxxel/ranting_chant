"""
Shared voice provider contracts and errors.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

VoiceProviderId = Literal["elevenlabs", "gradium"]


@dataclass(frozen=True)
class Voice:
    """A provider voice that can be exposed to a future UI selector."""

    id: str
    name: str
    provider: VoiceProviderId


@dataclass(frozen=True)
class TranscriptionResult:
    """Normalized STT result returned by every voice provider."""

    transcript: str
    provider: VoiceProviderId


@dataclass(frozen=True)
class AudioBytesResult:
    """Normalized TTS result returned by every voice provider."""

    audio_bytes: bytes
    content_type: str
    format: str
    provider: VoiceProviderId


class VoiceProviderError(Exception):
    """Base exception for provider-specific failures."""


class InvalidVoiceRequestError(VoiceProviderError):
    """Raised when a voice request is malformed or references an invalid provider."""


class ProviderUnavailableError(VoiceProviderError):
    """Raised when a provider cannot be used because required config is missing."""


class VoiceProvider(Protocol):
    """Runtime contract for speech-to-text and text-to-speech providers."""

    provider_id: VoiceProviderId
    display_name: str
    supports_stt: bool
    supports_tts: bool
    supports_streaming_tts: bool

    @property
    def is_configured(self) -> bool:
        """Whether the provider has the credentials/configuration needed to run."""

    def transcribe(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/wav",
        language_code: str | None = None,
    ) -> TranscriptionResult:
        """Transcribe audio bytes into text."""

    def tts(
        self,
        text: str,
        voice_id: str | None = None,
        format: str | None = None,
        emergency: bool = False,
    ) -> AudioBytesResult:
        """Convert text into audio bytes."""

    def list_voices(self) -> list[Voice]:
        """Return voices known to this provider, if available."""
