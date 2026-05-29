"""
Voice provider selection helpers.
"""

from __future__ import annotations

from typing import Optional

from src.core_specs.configuration.config_loader import config_loader
from src.voice.providers.base import InvalidVoiceRequestError, ProviderUnavailableError, VoiceProvider, VoiceProviderId
from src.voice.providers.elevenlabs import ElevenLabsProvider
from src.voice.providers.gradium import GradiumProvider

PROVIDER_FACTORIES = {
    "elevenlabs": ElevenLabsProvider,
    "gradium": GradiumProvider,
}


def get_default_voice_provider_id() -> VoiceProviderId:
    provider_id = config_loader["voice_provider"].get("default_provider", "elevenlabs").strip().lower() or "elevenlabs"
    return validate_voice_provider_id(provider_id)


def validate_voice_provider_id(provider_id: str) -> VoiceProviderId:
    normalized = provider_id.strip().lower()
    if normalized not in PROVIDER_FACTORIES:
        supported = ", ".join(PROVIDER_FACTORIES.keys())
        raise InvalidVoiceRequestError(f"Unsupported voice provider '{provider_id}'. Supported providers: {supported}")
    return normalized  # type: ignore[return-value]


def get_voice_provider(provider_id: Optional[str] = None) -> VoiceProvider:
    selected_provider_id = validate_voice_provider_id(provider_id) if provider_id else get_default_voice_provider_id()
    provider = PROVIDER_FACTORIES[selected_provider_id]()
    if not provider.is_configured:
        env_var = "ELEVENLABS_API_KEY" if selected_provider_id == "elevenlabs" else "GRADIUM_API_KEY"
        raise ProviderUnavailableError(f"Voice provider '{selected_provider_id}' is not configured. Set {env_var}.")
    return provider


def list_voice_providers() -> dict:
    default_provider = get_default_voice_provider_id()
    providers = []
    for provider_id, provider_factory in PROVIDER_FACTORIES.items():
        provider = provider_factory()
        providers.append(
            {
                "id": provider.provider_id,
                "display_name": provider.display_name,
                "configured": provider.is_configured,
                "enabled": provider.is_configured,
                "supports": {
                    "tts": provider.supports_tts,
                    "stt": provider.supports_stt,
                    "streaming_tts": provider.supports_streaming_tts,
                },
                "voices": [voice.__dict__ for voice in provider.list_voices()],
            }
        )
    return {"default_provider": default_provider, "providers": providers}


def list_voice_provider_voices(provider_id: Optional[str] = None) -> dict:
    provider = get_voice_provider(provider_id)
    return {
        "provider": provider.provider_id,
        "voices": [voice.__dict__ for voice in provider.list_voices()],
    }
