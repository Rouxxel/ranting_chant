"""
Voice provider selection tests.
"""

import unittest
from unittest.mock import patch

from src.api_endpoints.routers.voice_router import _provider_exception_to_http
from src.voice.providers.base import InvalidVoiceRequestError, ProviderUnavailableError
from src.voice.providers.factory import get_voice_provider, list_voice_providers


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
