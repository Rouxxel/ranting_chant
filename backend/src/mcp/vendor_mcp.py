"""
#############################################################################
### Vendor MCP tool file
###
### @file vendor_mcp.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides MCP-style data access tools for vendor records.
It supports service-category filtering and emergency vendor lookup.
"""

#Other files imports
from src.utils.custom_logger import log_handler
from src.database import get_database_service

"""TOOLS-----------------------------------------------------------"""
def find_vendors_by_service(service_category: str) -> list:
    """
    Return all vendors that offer a given service category.

    Performs a case-insensitive match against each vendor's services list.

    Parameters:
        service_category (str): The service to search for (e.g. locksmith,
            plumbing, electrical, hvac, pest_control).

    Returns:
        list: A (possibly empty) list of vendor records offering the service.
    """
    log_handler.debug(f"[vendor_mcp] Finding vendors for service='{service_category}'")
    db = get_database_service()
    all_vendors = db.vendors.list()

    results = [
        v for v in all_vendors
        if service_category.lower() in [s.lower() for s in v.get("services", [])]
    ]

    log_handler.info(
        f"[vendor_mcp] Found {len(results)} vendor(s) for service '{service_category}'"
    )
    return results


def get_emergency_vendors(service_category: str) -> list:
    """
    Return vendors that offer a service and are available for emergencies.

    Filters the result of find_vendors_by_service to only include vendors
    where emergency_available is True.

    Parameters:
        service_category (str): The service category to filter by.

    Returns:
        list: A (possibly empty) list of emergency-available vendor records.
    """
    log_handler.debug(
        f"[vendor_mcp] Finding emergency vendors for service='{service_category}'"
    )
    all_matching = find_vendors_by_service(service_category)
    emergency = [v for v in all_matching if v.get("emergency_available", False)]

    log_handler.info(
        f"[vendor_mcp] Found {len(emergency)} emergency vendor(s) "
        f"for service '{service_category}'"
    )
    return emergency


def get_vendor(vendor_id: str) -> dict | None:
    """
    Look up a vendor record by its unique ID.

    Parameters:
        vendor_id (str): The unique identifier of the vendor.

    Returns:
        dict | None: The vendor record, or None if not found.
    """
    log_handler.debug(f"[vendor_mcp] Looking up vendor_id='{vendor_id}'")
    db = get_database_service()
    vendor = db.vendors.find_by_id(vendor_id)
    if not vendor:
        log_handler.warning(f"[vendor_mcp] Vendor '{vendor_id}' not found")
    return vendor
