"""
#############################################################################
### Notification MCP tools file
###
### @file notification_mcp.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides MCP tools for sending email and SMS notifications.
It wraps the notification services so they can be called by the AI during
conversation.
"""

#Native imports
from typing import Literal

#Other files imports
from src.utils.custom_logger import log_handler
from src.notifications.email_service import (
    send_request_created,
    send_escalation_alert,
    send_vendor_dispatch
)
from src.notifications.sms_service import send_emergency_sms

"""METHODS-----------------------------------------------------------"""
def send_email_notification(
    recipient_type: Literal["manager", "owner", "vendor"],
    recipient_email: str,
    recipient_name: str,
    notification_type: Literal["request_created", "escalation_alert", "vendor_dispatch"],
    tenant_name: str,
    request_type: str,
    description: str,
    urgency: str = "medium",
    vendor_name: str = ""
) -> dict:
    """
    Send an email notification to a specified recipient.

    Parameters:
        recipient_type (str): Type of recipient (manager, owner, or vendor).
        recipient_email (str): Email address of the recipient.
        recipient_name (str): Name of the recipient.
        notification_type (str): Type of notification (request_created, escalation_alert, or vendor_dispatch).
        tenant_name (str): Name of the tenant who submitted the request.
        request_type (str): Category of the request.
        description (str): Description or summary of the request.
        urgency (str): Urgency level (low, medium, high). Defaults to "medium".
        vendor_name (str): Name of the vendor (only for vendor_dispatch notifications).

    Returns:
        dict: Success status with details.
    """
    log_handler.info(
        f"[notification_mcp] Sending {notification_type} email to {recipient_type} '{recipient_name}' "
        f"({recipient_email})"
    )

    success = False
    if notification_type == "request_created":
        success = send_request_created(recipient_email, tenant_name, request_type, description)
    elif notification_type == "escalation_alert":
        success = send_escalation_alert(recipient_email, tenant_name, urgency, description)
    elif notification_type == "vendor_dispatch":
        if not vendor_name:
            log_handler.warning("[notification_mcp] vendor_name required for vendor_dispatch")
            return {"success": False, "error": "vendor_name required for vendor_dispatch"}
        success = send_vendor_dispatch(
            recipient_email,
            vendor_name,
            {"type": request_type, "description": description, "urgency": urgency}
        )

    if success:
        log_handler.info(f"[notification_mcp] Email sent successfully to {recipient_email}")
        return {"success": True, "recipient": recipient_name, "type": notification_type}
    else:
        log_handler.error(f"[notification_mcp] Failed to send email to {recipient_email}")
        return {"success": False, "error": "Failed to send email", "recipient": recipient_name}


def send_sms_notification(
    recipient_type: Literal["manager", "owner"],
    recipient_phone: str,
    recipient_name: str,
    tenant_name: str,
    urgency: str,
    description: str
) -> dict:
    """
    Send an SMS notification to a specified recipient.

    Parameters:
        recipient_type (str): Type of recipient (manager or owner).
        recipient_phone (str): Phone number of the recipient in E.164 format.
        recipient_name (str): Name of the recipient.
        tenant_name (str): Name of the tenant who submitted the request.
        urgency (str): Urgency level (low, medium, high, critical).
        description (str): Description of the issue.

    Returns:
        dict: Success status with details.
    """
    log_handler.info(
        f"[notification_mcp] Sending emergency SMS to {recipient_type} '{recipient_name}' "
        f"({recipient_phone})"
    )

    message = f"Urgent request from {tenant_name}: {description} (Urgency: {urgency})"
    success = send_emergency_sms(recipient_phone, message)

    if success:
        log_handler.info(f"[notification_mcp] SMS sent successfully to {recipient_phone}")
        return {"success": True, "recipient": recipient_name, "type": "emergency_sms"}
    else:
        log_handler.error(f"[notification_mcp] Failed to send SMS to {recipient_phone}")
        return {"success": False, "error": "Failed to send SMS", "recipient": recipient_name}
