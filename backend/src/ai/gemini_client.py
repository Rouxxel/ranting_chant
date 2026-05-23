"""
#############################################################################
### Gemini AI client file
###
### @file gemini_client.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides a singleton Google Gemini API client initialized from
the GEMINI_API_KEY environment variable. All AI modules obtain the client
through get_client() to avoid creating multiple connections.
"""

#Native imports
import os

#Third-party imports
from google import genai

#Other files imports
from src.utils.custom_logger import log_handler

"""VARIABLES-----------------------------------------------------------"""
#Singleton client instance — initialized on first call to get_client()
_client: genai.Client | None = None

"""METHODS-----------------------------------------------------------"""
def get_client() -> genai.Client:
    """
    Return the singleton Gemini API client, initializing it on first call.

    Reads GEMINI_API_KEY from the environment. Raises RuntimeError if the
    key is not set. Subsequent calls return the already-initialized client
    without re-creating it.

    Returns:
        genai.Client: The initialized Gemini API client.

    Raises:
        RuntimeError: If GEMINI_API_KEY environment variable is not set.
    """
    global _client

    if _client is not None:
        log_handler.debug("Reusing existing Gemini client instance")
        return _client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

    log_handler.debug("Initializing Gemini client")
    _client = genai.Client(api_key=api_key)
    log_handler.info("Gemini client initialized successfully")
    return _client
