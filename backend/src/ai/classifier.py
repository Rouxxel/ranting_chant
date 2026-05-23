"""
#############################################################################
### Request classifier file
###
### @file classifier.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides a standalone request classifier that calls the Gemini
AI model with a focused classification prompt. It is used to re-classify
a completed conversation without running the full conversation engine.
"""

#Native imports
import json

#Third-party imports
from google.genai import types

#Other files imports
from src.utils.custom_logger import log_handler
from src.ai.gemini_client import get_client

"""VARIABLES-----------------------------------------------------------"""
#Gemini model to use for classification
GEMINI_MODEL = "gemini-2.5-flash"

#Classification-only system prompt
CLASSIFICATION_PROMPT = """
You are a request classification engine for a property management system.
Given a conversation history between a tenant and an AI assistant, classify the request.

Respond with ONLY a valid JSON object containing these fields:
{
  "type": "<one of: maintenance, access, rental_agreement, emergency, general>",
  "urgency": "<one of: low, medium, high>",
  "sentiment": "<one of: neutral, calm, frustrated, angry>",
  "escalate": <true or false>,
  "confidence": <float between 0.0 and 1.0>,
  "vendor_service_needed": "<service category string or null>",
  "involved_party_types": ["<manager|owner|vendor>"]
}
No markdown, no extra text. JSON only.
"""

"""METHODS-----------------------------------------------------------"""
def classify_request(conversation_history: list) -> dict:
    """
    Classify a request based on its conversation history.

    Calls Gemini with a classification-only prompt and the full conversation
    history. Returns a structured classification dict. Falls back to safe
    defaults if the response cannot be parsed.

    Parameters:
        conversation_history (list): List of conversation message dicts,
            each with 'role' and 'message' keys.

    Returns:
        dict: Classification result containing type, urgency, sentiment,
            escalate, confidence, vendor_service_needed, and
            involved_party_types.
    """
    log_handler.debug("Classifying request from conversation history")

    #Format conversation history as readable text for the prompt
    history_text = ""
    for turn in conversation_history:
        role = turn.get("role", "unknown")
        message = turn.get("message", "")
        history_text += f"{role.upper()}: {message}\n"

    if not history_text.strip():
        log_handler.warning("Empty conversation history passed to classifier — returning defaults")
        return _default_classification()

    try:
        client = get_client()
        prompt = f"Conversation history:\n{history_text}\n\nClassify this request."

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=CLASSIFICATION_PROMPT,
                temperature=0.1,
            )
        )

        raw = response.text.strip()
        log_handler.debug(f"Classifier raw response: {raw[:200]}")
        return _parse_classification(raw)

    except Exception as e:
        log_handler.error(f"Classifier Gemini call failed: {e}")
        return _default_classification()


def _parse_classification(raw: str) -> dict:
    """
    Parse the raw JSON string from Gemini into a classification dict.

    Strips markdown code fences if present before parsing. Falls back
    to safe defaults if the JSON is malformed.

    Parameters:
        raw (str): Raw string response from Gemini.

    Returns:
        dict: Parsed classification dict, or defaults on parse failure.
    """
    try:
        #Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        log_handler.debug("Classification parsed successfully")
        return parsed

    except (json.JSONDecodeError, IndexError) as e:
        log_handler.warning(f"Failed to parse classification response: {e} — using defaults")
        return _default_classification()


def _default_classification() -> dict:
    """
    Return a safe default classification when Gemini fails or returns
    unparseable output.

    Returns:
        dict: Default classification with low urgency and low confidence.
    """
    return {
        "type": "general",
        "urgency": "low",
        "sentiment": "neutral",
        "escalate": False,
        "confidence": 0.0,
        "vendor_service_needed": None,
        "involved_party_types": ["manager"]
    }
