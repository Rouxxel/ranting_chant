"""
#############################################################################
### Notification dispatcher file
###
### @file notification_dispatcher.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module orchestrates notification delivery for request lifecycle events.
It determines the correct recipients, calls the appropriate email/SMS
services, and returns a list of notification event dicts that are appended
to the request's notifications_sent field.
"""

#Native imports
from datetime import datetime, timezone

#Other files imports
from src.utils.custom_logger import log_handler
from src.database import get_database_service
from src.notifications.email_service import (
    send_request_created,
    send_escalation_alert,
    send_vendor_dispatch
)
from src.notifications.sms_service import send_emergency_sms

"""METHODS-----------------------------------------------------------"""
def _build_notification_event(
    notification_type: str,
    recipient: str,
    status: str,
    recipient_type: str = None
) -> dict:
    """
    Build a notification event dict for appending to notifications_sent.

    Parameters:
        notification_type (str): The type of notification — "email" or "sms".
        recipient (str): The recipient email or phone number.
        status (str): "sent" or "failed".
        recipient_type (str, optional): The type of recipient — "manager", "owner", "vendor".

    Returns:
        dict: A notification event record with type, recipient, status, timestamp, recipient_type.
    """
    event = {
        "type": notification_type,
        "recipient": recipient,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    if recipient_type:
        event["recipient_type"] = recipient_type
    return event


def _resolve_request_context(request: dict) -> tuple[dict | None, dict | None, dict | None]:
    """
    Resolve tenant, property, and manager records for a request.

    Parameters:
        request (dict): The request record.

    Returns:
        tuple: tenant, property, and manager records; each may be None.
    """
    db = get_database_service()
    tenant_id = request.get("requester_id", "")
    tenant = db.tenants.find_by_id(tenant_id)
    if not tenant:
        return None, None, None

    property_id = request.get("property_id") or tenant.get("property_id", "")
    prop = db.properties.find_by_id(property_id)
    if not prop:
        return tenant, None, None

    manager_id = prop.get("manager_id", "")
    manager = db.managers.find_by_id(manager_id) if manager_id else None
    return tenant, prop, manager


def _resolve_property_representative(prop: dict, fallback_manager: dict | None = None) -> tuple[str, str]:
    """
    Resolve representative details used for vendor coordination.

    Parameters:
        prop (dict): The property record.
        fallback_manager (dict | None): Manager record used when no representative is found.

    Returns:
        tuple[str, str]: Representative name and contact string.
    """
    db = get_database_service()
    representative = prop.get("representative") or {}
    rep_type = representative.get("type")
    rep_id = representative.get("id")
    rep_record = None

    if rep_type == "owner" and rep_id:
        rep_record = db.owners.find_by_id(rep_id)
    elif rep_type == "property_manager" and rep_id:
        rep_record = db.managers.find_by_id(rep_id)

    if not rep_record:
        rep_record = fallback_manager

    if not rep_record:
        return "the property representative", "the contact details on file"

    name = rep_record.get("name", "the property representative")
    contact_parts = [
        value
        for value in (rep_record.get("email"), rep_record.get("phone"))
        if value
    ]
    contact = " / ".join(contact_parts) if contact_parts else "the contact details on file"
    return name, contact


def dispatch_on_create(request: dict) -> list[dict]:
    """
    Send notifications when a new request is created.

    Looks up the property manager for the tenant's property and sends
    them a request_created email. Appends the result to the request's
    notifications_sent list and persists via request_mcp.

    Parameters:
        request (dict): The full request record just created.

    Returns:
        list[dict]: List of notification event dicts dispatched.
    """
    #Lazy import to avoid circular dependency with request_mcp
    from src.mcp import request_mcp as req_mcp

    log_handler.debug(
        f"[notification_dispatcher] dispatch_on_create for request='{request.get('id')}'"
    )
    events = []

    try:
        #Resolve tenant and property to find the manager
        tenant, prop, manager = _resolve_request_context(request)
        if not tenant:
            log_handler.warning(
                f"[notification_dispatcher] Tenant '{request.get('requester_id', '')}' not found "
                f"— skipping create notifications"
            )
            return events

        if not prop:
            log_handler.warning(
                f"[notification_dispatcher] Property for tenant '{tenant.get('id')}' not found "
                f"— skipping create notifications"
            )
            return events

        if not manager:
            log_handler.warning(
                f"[notification_dispatcher] Manager '{prop.get('manager_id', '')}' not found "
                f"— skipping create notifications"
            )
            return events

        manager_email = manager.get("email", "")
        tenant_name = tenant.get("name", "Unknown Tenant")
        req_type = request.get("type", "general")
        description = request.get("description", "No description provided")
        urgency = request.get("urgency", "medium")
        property_name = prop.get("name", "Unknown Property")

        #Send email to manager
        success = send_request_created(
            manager_email=manager_email,
            tenant_name=tenant_name,
            urgency=urgency,
            property_name=property_name,
            request_type=req_type,
            summary=description
        )
        status = "sent" if success else "failed"
        events.append(_build_notification_event("email", manager_email, status, "manager"))
        log_handler.info(
            f"[notification_dispatcher] create notification to manager "
            f"'{manager_email}': {status}"
        )

        #Persist notification events to the request record
        if events:
            existing_notifications = request.get("notifications_sent", [])
            req_mcp.update_request(request["id"], {
                "notifications_sent": existing_notifications + events
            })

    except Exception as e:
        log_handler.error(f"[notification_dispatcher] dispatch_on_create error: {e}")

    return events


def dispatch_on_escalate(request: dict) -> list[dict]:
    """
    Send notifications when a request is escalated.

    Sends email + SMS to the property manager and owner. For emergency
    request types, also dispatches a vendor notification if a vendor
    is assigned.

    Parameters:
        request (dict): The full request record after escalation.

    Returns:
        list[dict]: List of notification event dicts dispatched.
    """
    #Lazy import to avoid circular dependency with request_mcp
    from src.mcp import request_mcp as req_mcp

    log_handler.debug(
        f"[notification_dispatcher] dispatch_on_escalate for request='{request.get('id')}'"
    )
    events = []

    try:
        tenant, prop, manager = _resolve_request_context(request)
        if not tenant:
            log_handler.warning(
                f"[notification_dispatcher] Tenant '{request.get('requester_id', '')}' not found "
                f"— skipping escalation notifications"
            )
            return events

        if not prop:
            log_handler.warning(
                f"[notification_dispatcher] Property for tenant '{tenant.get('id')}' not found "
                f"— skipping escalation notifications"
            )
            return events

        tenant_name = tenant.get("name", "Unknown Tenant")
        urgency = request.get("urgency", "high")
        description = request.get("description", "No description provided")
        property_name = prop.get("name", "Unknown Property")

        #Notify manager via email + SMS
        if manager:
            manager_email = manager.get("email", "")
            manager_phone = manager.get("phone", "")

            email_ok = send_escalation_alert(
                recipient_email=manager_email,
                tenant_name=tenant_name,
                urgency=urgency,
                property_name=property_name,
                description=description
            )
            events.append(
                _build_notification_event("email", manager_email, "sent" if email_ok else "failed", "manager")
            )

            if urgency == "high" and manager_phone:
                sms_ok = send_emergency_sms(
                    to_number=manager_phone,
                    message=f"Escalated request: {description}",
                    tenant_name=tenant_name,
                    urgency=urgency,
                    property_name=property_name
                )
                events.append(
                    _build_notification_event("sms", manager_phone, "sent" if sms_ok else "failed", "manager")
                )

        #Notify owner via email + SMS
        db = get_database_service()
        owner_id = prop.get("owner_id", "")
        owner = db.owners.find_by_id(owner_id)
        if owner:
            owner_email = owner.get("email", "")
            owner_phone = owner.get("phone", "")

            email_ok = send_escalation_alert(
                recipient_email=owner_email,
                tenant_name=tenant_name,
                urgency=urgency,
                property_name=property_name,
                description=description
            )
            events.append(
                _build_notification_event("email", owner_email, "sent" if email_ok else "failed", "owner")
            )

            if urgency == "high" and owner_phone:
                sms_ok = send_emergency_sms(
                    to_number=owner_phone,
                    message=f"Escalated request: {description}",
                    tenant_name=tenant_name,
                    urgency=urgency,
                    property_name=property_name
                )
                events.append(
                    _build_notification_event("sms", owner_phone, "sent" if sms_ok else "failed", "owner")
                )

        #For emergencies with an assigned vendor, also notify the vendor
        req_type = request.get("type", "")
        vendor_id = request.get("vendor_id")
        if "emergency" in req_type.lower() and vendor_id:
            vendor = db.vendors.find_by_id(vendor_id)
            if vendor:
                vendor_events = dispatch_vendor_dispatch(request, vendor)
                events.extend(vendor_events)

        #Persist all notification events
        if events:
            existing_notifications = request.get("notifications_sent", [])
            req_mcp.update_request(request["id"], {
                "notifications_sent": existing_notifications + events
            })

        log_handler.info(
            f"[notification_dispatcher] Dispatched {len(events)} escalation notification(s) "
            f"for request '{request.get('id')}'"
        )

    except Exception as e:
        log_handler.error(f"[notification_dispatcher] dispatch_on_escalate error: {e}")

    return events


def dispatch_vendor_dispatch(request: dict, vendor: dict) -> list[dict]:
    """
    Send a dispatch notification email to an assigned vendor.

    Parameters:
        request (dict): The full request record.
        vendor (dict): The vendor record to notify.

    Returns:
        list[dict]: List of notification event dicts dispatched.
    """
    log_handler.debug(
        f"[notification_dispatcher] dispatch_vendor_dispatch for "
        f"request='{request.get('id')}', vendor='{vendor.get('id')}'"
    )
    events = []

    try:
        tenant, prop, manager = _resolve_request_context(request)
        property_name = prop.get("name", "Unknown Property") if prop else request.get("property", "Unknown Property")
        representative_name, representative_contact = (
            _resolve_property_representative(prop, manager)
            if prop
            else ("the property representative", "the contact details on file")
        )

        vendor_email = vendor.get("email", "")
        vendor_name = vendor.get("name", "Vendor")

        if not vendor_email:
            log_handler.warning(
                f"[notification_dispatcher] Vendor '{vendor.get('id')}' has no email "
                f"— skipping dispatch"
            )
            return events

        success = send_vendor_dispatch(
            vendor_email=vendor_email,
            vendor_name=vendor_name,
            request_details=request,
            property_name=property_name,
            relevant_property_representative=representative_name,
            relevant_property_contact=representative_contact
        )
        status = "sent" if success else "failed"
        events.append(_build_notification_event("email", vendor_email, status, "vendor"))
        log_handler.info(
            f"[notification_dispatcher] vendor_dispatch to '{vendor_email}': {status}"
        )

    except Exception as e:
        log_handler.error(f"[notification_dispatcher] dispatch_vendor_dispatch error: {e}")

    return events
