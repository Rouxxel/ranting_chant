"""
#############################################################################
### Conversation engine unit tests
###
### @file test_conversation_engine.py
### @author Sebastian Russo
### @date 2025
#############################################################################

Unit tests for ConversationEngine. All Gemini API calls and data store
lookups are mocked so tests run without network access or real data.
"""

#Native imports
import json
import unittest
from unittest.mock import MagicMock, patch

#Other files imports
from src.ai.conversation_engine import ConversationEngine
from src.ai.tools.schemas import WebSearchResponse, WebSearchResultItem

"""HELPERS-----------------------------------------------------------"""
#Fake tenant and property records used across tests
FAKE_TENANT = {
    "id": "tenant_001",
    "name": "John Tenant",
    "email": "john@example.com",
    "phone": "+1-555-1234",
    "address": "123 Main St Apt 4B",
    "property_id": "property_001"
}

FAKE_PROPERTY = {
    "id": "property_001",
    "name": "Sunset Apartments",
    "address": "123 Main St, Berlin",
    "property_type": "apartment_building",
    "manager_id": "manager_001",
    "owner_id": "owner_001"
}


def _make_gemini_response(payload: dict) -> MagicMock:
    """Build a mock Gemini response object that returns payload as JSON text."""
    mock_response = MagicMock()
    mock_response.text = json.dumps(payload)
    return mock_response


def _make_gemini_client(response_payload: dict) -> MagicMock:
    """Build a mock Gemini client whose generate_content returns response_payload."""
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = _make_gemini_response(
        response_payload
    )
    return mock_client


"""TESTS-----------------------------------------------------------"""
class TestConversationEngine(unittest.TestCase):
    """Unit tests for ConversationEngine.process_message()."""

    def setUp(self):
        """Create a fresh ConversationEngine instance for each test."""
        self.engine = ConversationEngine()

    @patch("src.ai.conversation_engine.property_mcp.lookup_property")
    @patch("src.ai.conversation_engine.tenant_mcp.lookup_tenant")
    @patch("src.ai.conversation_engine.get_client")
    def test_normal_flow(self, mock_get_client, mock_lookup_tenant, mock_lookup_property):
        """
        Normal flow: Gemini returns a complete, low-urgency response.
        Asserts that reply is returned, is_complete=True, escalate=False.
        """
        #Arrange
        mock_lookup_tenant.return_value = FAKE_TENANT
        mock_lookup_property.return_value = FAKE_PROPERTY
        mock_get_client.return_value = _make_gemini_client({
            "reply": "I have logged your key replacement request.",
            "is_complete": True,
            "type": "access_control",
            "urgency": "low",
            "sentiment": "neutral",
            "confidence": 0.92,
            "escalate": False,
            "involved_party_types": ["manager"],
            "vendor_service_needed": "locksmith"
        })

        #Act
        result = self.engine.process_message("tenant_001", None, "I lost my key")

        #Assert
        self.assertEqual(result["is_complete"], True)
        self.assertEqual(result["escalate"], False)
        self.assertEqual(result["urgency"], "low")
        self.assertIn("reply", result)
        self.assertIsInstance(result["reply"], str)

    @patch("src.ai.conversation_engine.property_mcp.lookup_property")
    @patch("src.ai.conversation_engine.tenant_mcp.lookup_tenant")
    @patch("src.ai.conversation_engine.get_client")
    def test_emergency_detection(self, mock_get_client, mock_lookup_tenant, mock_lookup_property):
        """
        Emergency detection: Gemini returns high urgency and escalate=True.
        Asserts that escalate=True is preserved in the result.
        """
        #Arrange
        mock_lookup_tenant.return_value = FAKE_TENANT
        mock_lookup_property.return_value = FAKE_PROPERTY
        mock_get_client.return_value = _make_gemini_client({
            "reply": "This is an emergency! Please evacuate immediately.",
            "is_complete": True,
            "type": "emergency",
            "urgency": "high",
            "sentiment": "angry",
            "confidence": 0.98,
            "escalate": True,
            "involved_party_types": ["manager", "vendor"],
            "vendor_service_needed": "electrical"
        })

        #Act
        result = self.engine.process_message(
            "tenant_001", None, "There is a burning smell and no power"
        )

        #Assert
        self.assertEqual(result["escalate"], True)
        self.assertEqual(result["urgency"], "high")
        self.assertEqual(result["type"], "emergency")

    @patch("src.ai.conversation_engine.property_mcp.lookup_property")
    @patch("src.ai.conversation_engine.tenant_mcp.lookup_tenant")
    @patch("src.ai.conversation_engine.get_client")
    def test_follow_up_generation(self, mock_get_client, mock_lookup_tenant, mock_lookup_property):
        """
        Follow-up flow: Gemini returns is_complete=False with low confidence.
        Asserts is_complete=False and escalate=True (confidence < 0.7 triggers escalation).
        """
        #Arrange
        mock_lookup_tenant.return_value = FAKE_TENANT
        mock_lookup_property.return_value = FAKE_PROPERTY
        mock_get_client.return_value = _make_gemini_client({
            "reply": "Could you tell me more about the issue?",
            "is_complete": False,
            "type": "general",
            "urgency": "low",
            "sentiment": "neutral",
            "confidence": 0.5,
            "escalate": False,
            "involved_party_types": ["manager"],
            "vendor_service_needed": None
        })

        #Act
        result = self.engine.process_message("tenant_001", None, "Something is wrong")

        #Assert
        self.assertEqual(result["is_complete"], False)
        #confidence=0.5 < 0.7 triggers escalation in _should_escalate
        self.assertEqual(result["escalate"], True)

    @patch("src.ai.conversation_engine.property_mcp.lookup_property")
    @patch("src.ai.conversation_engine.tenant_mcp.lookup_tenant")
    @patch("src.ai.conversation_engine.get_client")
    def test_malformed_json_fallback(self, mock_get_client, mock_lookup_tenant, mock_lookup_property):
        """
        Malformed JSON fallback: Gemini returns a non-JSON string.
        Asserts the fallback reply is used and is_complete=False.
        """
        #Arrange
        mock_lookup_tenant.return_value = FAKE_TENANT
        mock_lookup_property.return_value = FAKE_PROPERTY
        mock_response = MagicMock()
        mock_response.text = "Sorry, I cannot help with that right now."
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        #Act
        result = self.engine.process_message("tenant_001", None, "Help me please")

        #Assert
        self.assertEqual(result["is_complete"], False)
        self.assertIn("reply", result)
        self.assertIn("trouble", result["reply"].lower())

    @patch("src.ai.conversation_engine.tenant_mcp.lookup_tenant")
    @patch("src.ai.conversation_engine.get_client")
    def test_tenant_not_found(self, mock_get_client, mock_lookup_tenant):
        """
        Tenant not found: find_by_id returns None for the tenant lookup.
        Asserts that ValueError is raised.
        """
        #Arrange — tenant lookup returns None
        mock_lookup_tenant.return_value = None

        #Act & Assert
        with self.assertRaises(ValueError) as ctx:
            self.engine.process_message("nonexistent_tenant", None, "Hello")

        self.assertIn("nonexistent_tenant", str(ctx.exception))

    @patch("src.ai.conversation_engine.tavily_search")
    @patch("src.ai.conversation_engine.is_tavily_enabled", return_value=True)
    @patch("src.ai.conversation_engine.property_mcp.lookup_property")
    @patch("src.ai.conversation_engine.tenant_mcp.lookup_tenant")
    @patch("src.ai.conversation_engine.get_client")
    def test_web_search_results_are_appended_to_reply(
        self,
        mock_get_client,
        mock_lookup_tenant,
        mock_lookup_property,
        mock_is_tavily_enabled,
        mock_tavily_search,
    ):
        """Source-seeking messages get deterministic Relevant links in reply."""
        mock_lookup_tenant.return_value = FAKE_TENANT
        mock_lookup_property.return_value = FAKE_PROPERTY
        mock_tavily_search.return_value = WebSearchResponse(
            query="official documentation link",
            results=[
                WebSearchResultItem(
                    title="Official Docs",
                    url="https://example.com/docs",
                    content_snippet="Official source snippet",
                    score=0.9,
                )
            ],
        )
        mock_get_client.return_value = _make_gemini_client({
            "reply": "Here is what I found.",
            "is_complete": False,
            "type": "general",
            "urgency": "low",
            "sentiment": "neutral",
            "confidence": 0.95,
            "escalate": False,
            "involved_party_types": ["manager"],
            "vendor_service_needed": None
        })

        result = self.engine.process_message(
            "tenant_001",
            None,
            "Can you share the official documentation link?",
        )

        self.assertIn("Relevant links", result["reply"])
        self.assertIn("https://example.com/docs", result["reply"])
        self.assertIn("web_results", result)

    @patch("src.ai.conversation_engine.tavily_search")
    @patch("src.ai.conversation_engine.is_tavily_enabled", return_value=False)
    @patch("src.ai.conversation_engine.property_mcp.lookup_property")
    @patch("src.ai.conversation_engine.tenant_mcp.lookup_tenant")
    @patch("src.ai.conversation_engine.get_client")
    def test_web_search_disabled_gracefully_without_key(
        self,
        mock_get_client,
        mock_lookup_tenant,
        mock_lookup_property,
        mock_is_tavily_enabled,
        mock_tavily_search,
    ):
        """Source-seeking messages still work when Tavily is disabled."""
        mock_lookup_tenant.return_value = FAKE_TENANT
        mock_lookup_property.return_value = FAKE_PROPERTY
        mock_get_client.return_value = _make_gemini_client({
            "reply": "I can still help without web search.",
            "is_complete": False,
            "type": "general",
            "urgency": "low",
            "sentiment": "neutral",
            "confidence": 0.95,
            "escalate": False,
            "involved_party_types": ["manager"],
            "vendor_service_needed": None
        })

        result = self.engine.process_message(
            "tenant_001",
            None,
            "Can you share an official source link?",
        )

        self.assertEqual(result["reply"], "I can still help without web search.")
        self.assertNotIn("web_results", result)
        mock_tavily_search.assert_not_called()


"""ENTRY POINT-----------------------------------------------------------"""
if __name__ == "__main__":
    unittest.main()
