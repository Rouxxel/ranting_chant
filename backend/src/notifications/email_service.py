"""
#############################################################################
### Email notification service file
###
### @file email_service.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides email notification functions using the Resend SDK.
It sends transactional emails for request creation, escalation alerts,
and vendor dispatch notifications.
"""

#Native imports
import os

#Third-party imports
import resend

#Other files imports
from src.utils.custom_logger import log_handler

"""VARIABLES-----------------------------------------------------------"""
#Initialize Resend with API key from environment
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    log_handler.debug("Resend API key configured")
else:
    log_handler.warning("RESEND_API_KEY not set — email notifications will be disabled")

"""METHODS-----------------------------------------------------------"""
def send_request_created(
    manager_email: str,
    tenant_name: str,
    request_type: str,
    summary: str
) -> bool:
    """
    Send a notification email to the property manager when a new request is created.

    Parameters:
        manager_email (str): The manager's email address.
        tenant_name (str): The name of the tenant who submitted the request.
        request_type (str): The category of the request (e.g. maintenance, access).
        summary (str): A brief description or summary of the request.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    if not RESEND_API_KEY:
        log_handler.warning("[email_service] Skipping send_request_created — no API key")
        return False

    try:
        log_handler.debug(f"[email_service] Sending request_created email to '{manager_email}'")

        html_body = f"""
        <h2>New Tenant Request — Ranting Chant</h2>
        <p><strong>Tenant:</strong> {tenant_name}</p>
        <p><strong>Request Type:</strong> {request_type}</p>
        <p><strong>Summary:</strong> {summary}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated notification from Ranting Chant.</p>
        """

        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [manager_email],
            "subject": f"New Request from {tenant_name} — {request_type}",
            "html": html_body,
        }

        response = resend.Emails.send(params)
        log_handler.info(
            f"[email_service] request_created email sent to '{manager_email}', "
            f"id='{response.get('id', 'unknown')}'"
        )
        return True

    except Exception as e:
        log_handler.error(f"[email_service] Failed to send request_created email: {e}")
        return False


def send_escalation_alert(
    recipient_email: str,
    tenant_name: str,
    urgency: str,
    description: str
) -> bool:
    """
    Send an escalation alert email to a manager or owner.

    Parameters:
        recipient_email (str): The recipient's email address.
        tenant_name (str): The name of the tenant whose request was escalated.
        urgency (str): The urgency level of the escalated request.
        description (str): Description of the issue that triggered escalation.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    if not RESEND_API_KEY:
        log_handler.warning("[email_service] Skipping send_escalation_alert — no API key")
        return False

    try:
        log_handler.debug(f"[email_service] Sending escalation_alert email to '{recipient_email}'")

        urgency_color = "#dc2626" if urgency == "high" else "#d97706"

        html_body = f"""
        <h2 style="color: {urgency_color};">⚠️ Escalation Alert — Ranting Chant</h2>
        <p><strong>Tenant:</strong> {tenant_name}</p>
        <p><strong>Urgency:</strong> <span style="color: {urgency_color}; font-weight: bold;">{urgency.upper()}</span></p>
        <p><strong>Description:</strong> {description}</p>
        <p>This request requires your immediate attention.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated escalation alert from Ranting Chant.</p>
        """

        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [recipient_email],
            "subject": f"[ESCALATION] Urgent Request from {tenant_name} — {urgency.upper()}",
            "html": html_body,
        }

        response = resend.Emails.send(params)
        log_handler.info(
            f"[email_service] escalation_alert email sent to '{recipient_email}', "
            f"id='{response.get('id', 'unknown')}'"
        )
        return True

    except Exception as e:
        log_handler.error(f"[email_service] Failed to send escalation_alert email: {e}")
        return False


def send_vendor_dispatch(
    vendor_email: str,
    vendor_name: str,
    request_details: dict
) -> bool:
    """
    Send a dispatch notification email to a vendor.

    Parameters:
        vendor_email (str): The vendor's email address.
        vendor_name (str): The vendor's business name.
        request_details (dict): The full request record containing type,
            description, urgency, and tenant information.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    if not RESEND_API_KEY:
        log_handler.warning("[email_service] Skipping send_vendor_dispatch — no API key")
        return False

    try:
        log_handler.debug(f"[email_service] Sending vendor_dispatch email to '{vendor_email}'")

        req_type = request_details.get("type", "N/A")
        req_desc = request_details.get("description", "N/A")
        req_urgency = request_details.get("urgency", "low")
        req_id = request_details.get("id", "N/A")

        html_body = f"""
        <h2>Vendor Dispatch — Ranting Chant</h2>
        <p>Dear <strong>{vendor_name}</strong>,</p>
        <p>You have been assigned to a new service request. Please review the details below:</p>
        <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Request ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{req_id}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{req_type}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Description</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{req_desc}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Urgency</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{req_urgency.upper()}</td></tr>
        </table>
        <p>Please contact the property manager to coordinate access and scheduling.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated dispatch notification from Ranting Chant.</p>
        """

        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [vendor_email],
            "subject": f"Service Dispatch: {req_type} — Request {req_id}",
            "html": html_body,
        }

        response = resend.Emails.send(params)
        log_handler.info(
            f"[email_service] vendor_dispatch email sent to '{vendor_email}', "
            f"id='{response.get('id', 'unknown')}'"
        )
        return True

    except Exception as e:
        log_handler.error(f"[email_service] Failed to send vendor_dispatch email: {e}")
        return False
