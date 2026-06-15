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
from src.models.request import get_request_type_label

"""VARIABLES-----------------------------------------------------------"""
#Initialize Resend with API key from environment
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    log_handler.debug("[email_service] Resend API key configured")
else:
    log_handler.warning("[email_service] RESEND_API_KEY not set — email notifications will be disabled")

"""METHODS-----------------------------------------------------------"""
def send_request_created(
    manager_email: str,
    tenant_name: str,
    urgency: str,
    property_name: str,
    request_type: str,
    summary: str
) -> bool:
    """
    Send a notification email to the property manager when a new request is created.

    Parameters:
        manager_email (str): The manager's email address.
        tenant_name (str): The name of the tenant who submitted the request.
        urgency (str): The urgency level of the request.
        property_name (str): The name of the property where the request was submitted.
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

        request_type_label = get_request_type_label(request_type)
        html_body = f"""
        <h2>Tenant Request at {property_name} - Ranting Chant</h2>
        <p><strong>Tenant:</strong> {tenant_name}</p>
        <p><strong>Request Type:</strong> {request_type_label}</p>
        <p><strong>Urgency:</strong> <span style="color: {'#dc2626' if urgency == 'high' else '#d97706'}; font-weight: bold;">{urgency.upper()}</span></p>
        <p><strong>Summary:</strong> {summary}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated notification from Ranting Chant, access the specific request for details.</p>
        """

        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [manager_email],
            "subject": f"New Request from {tenant_name} - {request_type_label}",
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
    property_name: str,
    description: str
) -> bool:
    """
    Send an escalation alert email to a manager or owner.

    Parameters:
        recipient_email (str): The recipient's email address.
        tenant_name (str): The name of the tenant whose request was escalated.
        urgency (str): The urgency level of the escalated request.
        property_name (str): The name of the property where the request was submitted.
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
        <h2 style="color: {urgency_color};">⚠️ Escalation Alert - Ranting Chant</h2>
        <p><strong>Tenant:</strong> {tenant_name}</p>
        <p><strong>Urgency:</strong> <span style="color: {urgency_color}; font-weight: bold;">{urgency.upper()}</span></p>
        <p><strong>Description:</strong> {description}</p>
        <p>This request requires your immediate attention at {property_name}.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated escalation alert from Ranting Chant, access the specific request for details.</p>
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
    request_details: dict,
    property_name: str,
    relevant_property_representative: str,
    relevant_property_contact: str
) -> bool:
    """
    Send a dispatch notification email to a vendor.

    Parameters:
        vendor_email (str): The vendor's email address.
        vendor_name (str): The vendor's business name.
        request_details (dict): The full request record containing type,
            description, urgency, and tenant information.
        property_name (str): The name of the property where the request was submitted.
        relevant_property_representative (str): The name of the property representative.
        relevant_property_contact (str): The contact information for the property representative.
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
        <h2>Vendor Dispatch - Ranting Chant Service</h2>
        <p>Dear <strong>{vendor_name}</strong>,</p>
        <p>You have been assigned to a new service request. Please review the details below:</p>
        <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Request ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{req_id}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{req_type}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Description</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{req_desc}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Urgency</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{req_urgency.upper()}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Property</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{property_name}</td></tr>
        </table>
        <p>Please contact {relevant_property_representative} at {relevant_property_contact} to coordinate access and scheduling.</p>
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
