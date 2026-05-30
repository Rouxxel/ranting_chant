"""
Voice endpoint contract tests.
"""

import asyncio
import base64
import unittest
from unittest.mock import MagicMock, patch

from starlette.requests import Request

from backend.src.api_endpoints.routers.voice_routers import voice_router
from backend.src.api_endpoints.routers.voice_routers.voice_router import VoiceRespondPayload
from src.voice.providers.base import AudioBytesResult, TranscriptionResult


class FakeUpload:
    filename = "voice.wav"
    content_type = "audio/wav"

    async def read(self):
        return b"fake-audio"


class FakeProvider:
    provider_id = "elevenlabs"

    def transcribe(self, audio_bytes, mime_type="audio/wav", language_code=None):
        return TranscriptionResult(transcript="hello there", provider="elevenlabs")

    def tts(self, text, voice_id=None, format=None, emergency=False):
        return AudioBytesResult(
            audio_bytes=b"fake-response-audio",
            content_type="audio/mpeg",
            format="mp3",
            provider="elevenlabs",
        )


def make_request() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/voice/test"})


class TestVoiceEndpointContracts(unittest.TestCase):
    @patch("src.api_endpoints.routers.voice_router.get_voice_provider", return_value=FakeProvider())
    def test_transcribe_response_shape_unchanged(self, mock_get_voice_provider):
        response = asyncio.run(
            voice_router.transcribe_audio(request=make_request(), audio=FakeUpload(), provider="elevenlabs")
        )

        self.assertEqual(set(response.keys()), {"transcript"})
        self.assertEqual(response["transcript"], "hello there")

    @patch("src.api_endpoints.routers.voice_router.get_voice_provider", return_value=FakeProvider())
    @patch("src.api_endpoints.routers.voice_router.request_mcp.update_request")
    @patch("src.api_endpoints.routers.voice_router.request_mcp.get_request")
    @patch.object(voice_router.conversation_engine, "process_message")
    def test_respond_response_shape_unchanged(
        self,
        mock_process_message,
        mock_get_request,
        mock_update_request,
        mock_get_voice_provider,
    ):
        mock_get_request.return_value = {"conversation_history": [], "status": "pending"}
        mock_process_message.return_value = {
            "reply": "I can help with that.",
            "type": "general",
            "urgency": "low",
            "sentiment": "neutral",
            "confidence": 0.95,
            "escalate": False,
            "is_complete": True,
        }
        mock_update_request.return_value = {
            "status": "pending",
            "type": "general",
            "urgency": "low",
            "escalated": False,
        }

        response = asyncio.run(
            voice_router.respond_to_voice_message(
                request=make_request(),
                body=VoiceRespondPayload(
                    request_id="request_001",
                    tenant_id="tenant_001",
                    transcript="My sink is leaking",
                    provider="elevenlabs",
                ),
            )
        )

        self.assertEqual(
            set(response.keys()),
            {"reply_text", "audio_base64", "status", "type", "urgency", "escalated", "is_complete"},
        )
        self.assertEqual(base64.b64decode(response["audio_base64"]), b"fake-response-audio")
        self.assertEqual(response["reply_text"], "I can help with that.")
