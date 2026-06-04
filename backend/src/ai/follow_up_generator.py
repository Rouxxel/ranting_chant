"""
#############################################################################
### Follow-up question generator file
###
### @file follow_up_generator.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module determines whether more context is needed from the tenant and,
if so, generates the next clarifying question using the Gemini AI model.
"""

#Third-party imports
from google.genai import types

#Other files imports
from src.utils.custom_logger import log_handler
from src.ai.gemini_client import get_client
from src.core_specs.configuration.config_loader import config_loader


"""VARIABLES-----------------------------------------------------------"""
#Gemini model to use for follow-up generation
GEMINI_MODEL = config_loader["llm_model"]["default_model"]

#Maximum number of conversation turns before forcing completion
MAX_TURNS = 5

#Follow-up generation system prompt
FOLLOW_UP_PROMPT = """
You are a property management AI assistant helping to gather information about a tenant's issue.
Based on the conversation so far and the context provided, generate ONE concise clarifying question
to gather the most important missing information needed to properly classify and route this request.

Rules:
- Ask only ONE question
- Be empathetic and professional
- Do not repeat questions already asked
- Focus on the most critical missing detail
- Keep the question short and clear
- Respond with ONLY the question text, no preamble or explanation
"""

"""METHODS-----------------------------------------------------------"""
def needs_more_context(classification: dict, turn_count: int) -> bool:
    """
    Determine whether more context is needed from the tenant.

    Returns True when the classification is incomplete (low confidence or
    is_complete is False) and the conversation has not yet reached the
    maximum turn limit.

    Parameters:
        classification (dict): The current classification result from the
            conversation engine or classifier. Expected keys: confidence,
            is_complete (optional).
        turn_count (int): The number of conversation turns completed so far.

    Returns:
        bool: True if a follow-up question should be asked, False otherwise.
    """
    if turn_count >= MAX_TURNS:
        log_handler.debug(
            f"[follow_up_generator] Max turns ({MAX_TURNS}) reached — no more follow-up questions"
        )
        return False

    #Check if the AI already marked the conversation as complete
    if classification.get("is_complete", False):
        log_handler.debug("[follow_up_generator] Classification marked is_complete=True — no follow-up needed")
        return False

    #Check confidence threshold
    confidence = classification.get("confidence", 0.0)
    if confidence >= 0.85:
        log_handler.debug(
            f"[follow_up_generator] Confidence {confidence:.2f} >= 0.85 — no follow-up needed"
        )
        return False

    log_handler.debug(
        f"[follow_up_generator] Follow-up needed: turn_count={turn_count}, confidence={confidence:.2f}"
    )
    return True


def generate_follow_up(context: str, conversation_history: list) -> str:
    """
    Generate the next clarifying question to ask the tenant.

    Calls Gemini with the tenant/property context and the full conversation
    history to produce a single focused follow-up question. Falls back to
    a generic question if the Gemini call fails.

    Parameters:
        context (str): Tenant and property context string assembled by the
            conversation engine (name, property, prior requests, etc.).
        conversation_history (list): List of conversation message dicts,
            each with 'role' and 'message' keys.

    Returns:
        str: A single clarifying question to present to the tenant.
    """
    log_handler.debug("[follow_up_generator] Generating follow-up question")

    #Format conversation history
    history_text = ""
    for turn in conversation_history:
        role = turn.get("role", "unknown")
        message = turn.get("message", "")
        history_text += f"{role.upper()}: {message}\n"

    prompt = (
        f"Tenant/property context:\n{context}\n\n"
        f"Conversation so far:\n{history_text}\n\n"
        f"Generate the next clarifying question."
    )

    try:
        client = get_client()
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=FOLLOW_UP_PROMPT,
                temperature=0.4,
            )
        )

        question = response.text.strip()
        log_handler.info(f"[follow_up_generator] Follow-up question generated: {question[:100]}")
        return question

    except Exception as e:
        log_handler.error(f"[follow_up_generator] Follow-up generation failed: {e} — using fallback question")
        return "Could you please provide more details about the issue you are experiencing?"
