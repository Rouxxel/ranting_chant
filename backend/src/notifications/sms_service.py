"""
#############################################################################
### SMS notification service file
###
### @file sms_service.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides SMS notification functions using the Twilio SDK.
It sends emergency SMS alerts to property managers and owners when a
request is escalated with high urgency.
"""

#Native imports
import os

#Third-party imports
from twilio.rest import Client

#Other files imports
from src.utils.custom_logger import log_handler

"""VARIABLES-----------------------------------------------------------"""
#Read Twilio credentials from environment
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_VERIFIED_PHONE = os.getenv("TWILIO_VERIFIED_PHONE", "")

#Lazy-initialized Twilio client
_twilio_client: Client | None = None

"""METHODS-----------------------------------------------------------"""
def _get_twilio_client() -> Client | None:
    """
    Return the singleton Twilio client, initializing it on first call.

    Returns None and logs a warning if credentials are not configured.

    Returns:
        Client | None: The initialized Twilio client, or None if credentials
            are missing.
    """
    global _twilio_client

    if _twilio_client is not None:
        return _twilio_client

    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        log_handler.warning(
            "[sms_service] Twilio credentials not set — SMS notifications disabled"
        )
        return None

    _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    log_handler.debug("[sms_service] Twilio client initialized")
    return _twilio_client


def send_emergency_sms(
    to_number: str, 
    message: str,
    tenant_name: str,
    urgency: str,
    property_name: str
    ) -> bool:
    """
    Send an emergency SMS alert to the specified phone number.

    Used when a request is escalated with high urgency or involves a
    safety risk. The message is prefixed with an emergency indicator.

    Parameters:
        to_number (str): The recipient's phone number in E.164 format
            (e.g. +14155552671). Must be a Twilio-verified number in
            trial accounts.
        message (str): The SMS message body to send.

    Returns:
        bool: True if the SMS was sent successfully, False otherwise.
    """
    client = _get_twilio_client()
    if not client:
        log_handler.warning("[sms_service] Skipping send_emergency_sms — no Twilio client")
        return False

    if not TWILIO_VERIFIED_PHONE:
        log_handler.warning("[sms_service] TWILIO_VERIFIED_PHONE not set — cannot send SMS")
        return False

    try:
        log_handler.debug(f"[sms_service] Sending emergency SMS to '{to_number}'")

        #Prefix message with emergency indicator
        full_message = f"URGENT ALERT AT {property_name}, Tenant {tenant_name} has an emergency {urgency} alert: {message}"

        sms = client.messages.create(
            body=full_message,
            from_=f"+{TWILIO_VERIFIED_PHONE}" if not TWILIO_VERIFIED_PHONE.startswith("+") else TWILIO_VERIFIED_PHONE,
            to=to_number
        )

        log_handler.info(
            f"[sms_service] Emergency SMS sent to '{to_number}', sid='{sms.sid}'"
        )
        return True

    except Exception as e:
        log_handler.error(f"[sms_service] Failed to send emergency SMS to '{to_number}': {e}")
        return False
