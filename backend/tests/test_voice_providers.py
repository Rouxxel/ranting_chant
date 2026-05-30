"""
Voice provider selection tests.
"""

import unittest
from unittest.mock import patch

from backend.src.api_endpoints.routers.voice_routers.voice_router import _provider_exception_to_http
from src.voice.providers.base import InvalidVoiceRequestError, ProviderUnavailableError
from src.voice.providers.factory import get_voice_provider, list_voice_provider_voices, list_voice_providers


class TestVoiceProviderSelection(unittest.TestCase):
    def test_invalid_provider_id_returns_400_mapping(self):
        exc = InvalidVoiceRequestError("Unsupported voice provider 'unknown'")
        http_exc = _provider_exception_to_http(exc)

        self.assertEqual(http_exc.status_code, 400)
        self.assertIn("Unsupported voice provider", http_exc.detail)

    def test_invalid_provider_id_raises_selection_error(self):
        with self.assertRaises(InvalidVoiceRequestError):
            get_voice_provider("unknown")

    @patch.dict("os.environ", {"GRADIUM_API_KEY": ""}, clear=False)
    def test_missing_gradium_key_raises_unavailable(self):
        with self.assertRaises(ProviderUnavailableError):
            get_voice_provider("gradium")

    @patch.dict("os.environ", {"ELEVENLABS_API_KEY": "eleven-key", "GRADIUM_API_KEY": "gradium-key"}, clear=False)
    def test_capabilities_include_supported_providers(self):
        response = list_voice_providers()
        provider_ids = [provider["id"] for provider in response["providers"]]

        self.assertEqual(response["default_provider"], "elevenlabs")
        self.assertIn("elevenlabs", provider_ids)
        self.assertIn("gradium", provider_ids)

    @patch.dict("os.environ", {"ELEVENLABS_API_KEY": "eleven-key", "GRADIUM_API_KEY": ""}, clear=False)
    def test_capabilities_with_elevenlabs_key_only(self):
        response = list_voice_providers()
        providers = {provider["id"]: provider for provider in response["providers"]}

        self.assertTrue(providers["elevenlabs"]["enabled"])
        self.assertFalse(providers["gradium"]["enabled"])

    @patch.dict("os.environ", {"ELEVENLABS_API_KEY": "", "GRADIUM_API_KEY": "gradium-key"}, clear=False)
    def test_capabilities_with_gradium_key_only(self):
        response = list_voice_providers()
        providers = {provider["id"]: provider for provider in response["providers"]}

        self.assertFalse(providers["elevenlabs"]["enabled"])
        self.assertTrue(providers["gradium"]["enabled"])

    @patch.dict("os.environ", {"GRADIUM_API_KEY": "gradium-key"}, clear=False)
    def test_list_provider_voices_returns_voice_metadata(self):
        response = list_voice_provider_voices("gradium")

        self.assertEqual(response["provider"], "gradium")
        self.assertEqual(response["voices"][0]["provider"], "gradium")
        self.assertIn("id", response["voices"][0])
