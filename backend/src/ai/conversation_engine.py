"""
#############################################################################
### Conversation engine file
###
### @file conversation_engine.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module implements the ConversationEngine class, which is the central
AI orchestration layer for Ranting Chant. It processes tenant messages,
maintains conversation context, calls the Gemini AI model, and determines
when a request is complete or needs escalation.
"""

#Native imports
import json

#Third-party imports
from google.genai import types

#Other files imports
from src.utils.custom_logger import log_handler
from src.mcp import tenant_mcp, property_mcp, vendor_mcp, request_mcp
from src.ai.gemini_client import get_client
from src.ai.system_prompt import SYSTEM_PROMPT
from src.ai.tools.tavily_client import (
    append_relevant_links,
    format_search_results_for_prompt,
    is_tavily_enabled,
    should_trigger_tavily_search,
    tavily_search,
)
from src.core_specs.configuration.config_loader import config_loader
from src.models.request import normalize_request_type


"""VARIABLES-----------------------------------------------------------"""
#Gemini model to use for conversation
GEMINI_MODEL = config_loader["llm_model"]["default_model"]

"""CLASS-----------------------------------------------------------"""
class ConversationEngine:
    """
    Orchestrates AI-driven conversations between tenants and the Gemini model.

    Handles context assembly, Gemini API calls, response parsing, and
    escalation detection. Designed to be instantiated once and reused
    across multiple requests.
    """

    def process_message(
        self,
        tenant_id: str,
        request_id: str | None,
        message: str,
        conversation_history: list | None = None,
        enable_web: bool = True
    ) -> dict:
        """
        Process a single tenant message and return the AI response.

        Fetches tenant and property context, builds the full conversation
        history, calls Gemini, parses the response, and checks for
        escalation conditions.

        Parameters:
            tenant_id (str): The ID of the tenant sending the message.
            request_id (str | None): The ID of an existing request, if any.
                Pass None for the first message in a new conversation.
            message (str): The tenant's message text.
            conversation_history (list | None): Existing conversation history
                from the request record. Pass None or empty list for new
                conversations.

        Returns:
            dict: The parsed AI response containing reply, is_complete, type,
                urgency, sentiment, confidence, escalate, involved_party_types,
                and vendor_service_needed. Also includes a 'context' key with
                the assembled context string.

        Raises:
            ValueError: If the tenant with tenant_id does not exist.
        """
        log_handler.debug(
            f"[conversation_engine] Processing message for tenant='{tenant_id}', request='{request_id}'"
        )

        #Fetch tenant record
        tenant = tenant_mcp.lookup_tenant(tenant_id)
        if not tenant:
            log_handler.error(f"[conversation_engine] Tenant '{tenant_id}' not found")
            raise ValueError(f"Tenant '{tenant_id}' not found")

        #Fetch property record
        property_record = property_mcp.lookup_property(tenant.get("property_id", ""))

        #Fetch existing request if provided
        existing_request = None
        if request_id:
            existing_request = request_mcp.get_request(request_id)

        #Build context string
        context = self._build_context(tenant, property_record, existing_request)

        #Build conversation history for Gemini
        history = conversation_history or []
        history_with_new = history + [{"role": "tenant", "message": message}]

        #Optionally add one bounded Tavily search as context for source/link-seeking messages.
        web_search_response = None
        web_context = ""
        if enable_web and is_tavily_enabled() and should_trigger_tavily_search(message):
            try:
                web_search_response = tavily_search(
                    message,
                    max_results=config_loader["tavily"].get("max_results", 5),
                )
                web_context = format_search_results_for_prompt(
                    web_search_response,
                    max_results=config_loader["tavily"].get("max_results", 5),
                )
                log_handler.info(
                    f"[conversation_engine] Tavily search added {len(web_search_response.results)} result(s) "
                    f"for tenant message"
                )
            except Exception as e:
                log_handler.warning(f"[conversation_engine] Tavily search skipped after error: {e}")

        #Call Gemini
        raw_response = self._call_gemini(context, history_with_new, web_context=web_context)

        #Parse response
        parsed = self._parse_response(raw_response)

        #Populate suggested_contacts with actual contact info if AI suggested any
        suggested_contacts = parsed.get("suggested_contacts", [])
        if suggested_contacts:
            populated_contacts = []
            for contact in suggested_contacts:
                contact_type = contact.get("type")
                contact_info = contact.copy()

                if contact_type == "manager" and property_record:
                    manager = property_mcp.get_property_manager(property_record.get("id"))
                    if manager:
                        contact_info["name"] = manager.get("name", contact.get("name", ""))
                        contact_info["email"] = manager.get("email", contact.get("email"))
                        contact_info["phone"] = manager.get("phone", contact.get("phone"))
                        populated_contacts.append(contact_info)
                elif contact_type == "owner" and property_record:
                    owner = property_mcp.get_property_owner(property_record.get("id"))
                    if owner:
                        contact_info["name"] = owner.get("name", contact.get("name", ""))
                        contact_info["email"] = owner.get("email", contact.get("email"))
                        contact_info["phone"] = owner.get("phone", contact.get("phone"))
                        populated_contacts.append(contact_info)
                elif contact_type == "vendor":
                    # For vendors, use the info provided by AI since we don't know which vendor yet
                    populated_contacts.append(contact_info)

            parsed["suggested_contacts"] = populated_contacts
            log_handler.info(f"[conversation_engine] Populated {len(populated_contacts)} suggested contact(s)")
        else:
            parsed["suggested_contacts"] = []

        if (
            enable_web
            and not web_search_response
            and is_tavily_enabled()
            and parsed.get("confidence", 1.0) < 0.7
        ):
            try:
                web_search_response = tavily_search(
                    message,
                    max_results=config_loader["tavily"].get("max_results", 5),
                )
                log_handler.info(
                    f"[conversation_engine] Tavily search added {len(web_search_response.results)} result(s) "
                    f"after low-confidence Gemini response"
                )
            except Exception as e:
                log_handler.warning(f"[conversation_engine] Tavily low-confidence search skipped after error: {e}")

        #Check escalation
        parsed["escalate"] = self._should_escalate(parsed)

        if web_search_response:
            parsed["reply"] = append_relevant_links(parsed.get("reply", ""), web_search_response)
            parsed["web_results"] = web_search_response.model_dump()

        #On first message (no request_id): create a stub request record
        if not request_id and parsed.get("is_complete"):
            new_request = request_mcp.create_request({
                "requester_id": tenant_id,
                "type": parsed.get("type", "general"),
                "description": message,
                "urgency": parsed.get("urgency", "low"),
                "involved_parties": [tenant_id],
                "sentiment": parsed.get("sentiment", "neutral"),
                "confidence": parsed.get("confidence", 0.0),
                "escalated": parsed.get("escalate", False),
                "conversation_history": history_with_new + [
                    {"role": "ai", "message": parsed.get("reply", ""), "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}
                ]
            })
            parsed["request_id"] = new_request["id"]
            log_handler.info(f"[conversation_engine] New request created from conversation: '{new_request['id']}'")

            #If vendor service needed, find matching vendors
            vendor_service = parsed.get("vendor_service_needed")
            if vendor_service:
                vendors = vendor_mcp.find_vendors_by_service(vendor_service)
                parsed["suggested_vendors"] = vendors
                log_handler.info(f"[conversation_engine] Found {len(vendors)} vendor(s) for service '{vendor_service}'")

        #On escalation: call escalate_request if we have a request_id
        if parsed.get("escalate") and request_id:
            try:
                request_mcp.escalate_request(
                    request_id,
                    f"Escalated by AI: urgency={parsed.get('urgency')}, sentiment={parsed.get('sentiment')}"
                )
            except ValueError as e:
                log_handler.warning(f"[conversation_engine] Could not escalate request '{request_id}': {e}")

        #Attach context for callers that need it
        parsed["context"] = context

        log_handler.info(
            f"[conversation_engine] Message processed: type={parsed.get('type')}, "
            f"urgency={parsed.get('urgency')}, "
            f"escalate={parsed.get('escalate')}, "
            f"is_complete={parsed.get('is_complete')}"
        )
        return parsed

    def _build_context(
        self,
        tenant: dict,
        property_record: dict | None,
        existing_request: dict | None
    ) -> str:
        """
        Assemble a context string from tenant, property, and request data.

        This string is injected into the Gemini prompt so the model has
        full situational awareness before responding.

        Parameters:
            tenant (dict): The tenant record from the data store.
            property_record (dict | None): The property record, or None if
                the property could not be found.
            existing_request (dict | None): An existing request record to
                provide continuity, or None for new conversations.

        Returns:
            str: A formatted multi-line context string.
        """
        lines = [
            f"TENANT: {tenant.get('name', 'Unknown')} (ID: {tenant.get('id')})",
            f"EMAIL: {tenant.get('email', 'N/A')}",
            f"PHONE: {tenant.get('phone', 'N/A')}",
            f"ADDRESS: {tenant.get('address', 'N/A')}",
        ]

        if property_record:
            lines += [
                f"PROPERTY: {property_record.get('name', 'Unknown')} "
                f"(ID: {property_record.get('id')})",
                f"PROPERTY ADDRESS: {property_record.get('address', 'N/A')}",
                f"PROPERTY TYPE: {property_record.get('property_type', 'N/A')}",
                f"MANAGER ID: {property_record.get('manager_id', 'N/A')}",
                f"OWNER ID: {property_record.get('owner_id', 'N/A')}",
            ]
        else:
            lines.append("PROPERTY: Not found")

        if existing_request:
            lines += [
                f"EXISTING REQUEST ID: {existing_request.get('id')}",
                f"EXISTING REQUEST TYPE: {existing_request.get('type', 'N/A')}",
                f"EXISTING STATUS: {existing_request.get('status', 'N/A')}",
                f"EXISTING URGENCY: {existing_request.get('urgency', 'N/A')}",
            ]

        context = "\n".join(lines)
        log_handler.debug(f"[conversation_engine] Context built ({len(context)} chars)")
        return context

    def _call_gemini(self, context: str, conversation_history: list, web_context: str = "") -> str:
        """
        Call the Gemini API with the system prompt, context, and conversation history.

        Formats the conversation history into a single prompt string and
        sends it to Gemini with the system prompt as instruction.

        Parameters:
            context (str): The assembled tenant/property context string.
            conversation_history (list): Full conversation history including
                the current tenant message, each entry with 'role' and
                'message' keys.

        Returns:
            str: The raw text response from Gemini.
        """
        log_handler.debug(f"[conversation_engine] Calling Gemini with {len(conversation_history)} history turns")

        #Format history as readable text
        history_text = ""
        for turn in conversation_history:
            role = turn.get("role", "unknown").upper()
            msg = turn.get("message", "")
            history_text += f"{role}: {msg}\n"

        prompt = (
            f"Tenant/property context:\n{context}\n\n"
            f"{web_context + chr(10) + chr(10) if web_context else ''}"
            f"Conversation history:\n{history_text}\n\n"
            f"Respond with the JSON object as instructed."
        )

        client = get_client()
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.3,
            )
        )

        raw = response.text.strip()
        log_handler.debug(f"[conversation_engine] Gemini raw response length: {len(raw)} chars")
        return raw

    def _parse_response(self, raw: str) -> dict:
        """
        Parse the raw Gemini response string into a structured dict.

        Strips markdown code fences if present. Falls back to a safe
        default response if the JSON cannot be parsed, ensuring the
        caller always receives a valid dict.

        Parameters:
            raw (str): The raw text response from Gemini.

        Returns:
            dict: Parsed response dict with all expected fields. On parse
                failure, returns a default dict with a generic reply.
        """
        try:
            cleaned = raw.strip()

            #Strip markdown code fences if present
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)
            log_handler.debug(f"[conversation_engine] Gemini response parsed successfully")
            parsed["type"] = normalize_request_type(parsed.get("type"))
            return parsed

        except (json.JSONDecodeError, IndexError) as e:
            log_handler.warning(
                f"[conversation_engine] Failed to parse Gemini response: {e} — using fallback"
            )
            return {
                "reply": (
                    "I'm sorry, I had trouble processing your request. "
                    "Could you please rephrase or provide more details?"
                ),
                "is_complete": False,
                "type": "general",
                "urgency": "low",
                "sentiment": "neutral",
                "confidence": 0.0,
                "escalate": False,
                "involved_party_types": ["manager"],
                "vendor_service_needed": None
            }

    def _should_escalate(self, parsed: dict) -> bool:
        """
        Determine whether the current request should be escalated.

        Checks urgency, confidence, sentiment, and the escalate flag
        returned by Gemini. Any single condition being true triggers
        escalation.

        Parameters:
            parsed (dict): The parsed Gemini response dict.

        Returns:
            bool: True if the request should be escalated, False otherwise.
        """
        #Gemini explicitly flagged escalation
        if parsed.get("escalate", False):
            log_handler.info("[conversation_engine] Escalation triggered: Gemini flagged escalate=true")
            return True

        #High urgency always escalates
        if parsed.get("urgency") == "high":
            log_handler.info("[conversation_engine] Escalation triggered: urgency=high")
            return True

        #Low confidence requires human review
        confidence = parsed.get("confidence", 1.0)
        if confidence < 0.7:
            log_handler.info(
                f"[conversation_engine] Escalation triggered: confidence={confidence:.2f} < 0.7"
            )
            return True

        #Angry sentiment requires human attention
        if parsed.get("sentiment") == "angry":
            log_handler.info("[conversation_engine] Escalation triggered: sentiment=angry")
            return True

        return False
