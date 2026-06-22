"""
#############################################################################
### Tenant MCP tool file
###
### @file tenant_mcp.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides MCP-style data access tools for tenant records.
All functions read from the JSON data store and return plain dicts.
"""

#Other files imports
from src.utils.custom_logger import log_handler
from src.database import get_database_service

"""TOOLS-----------------------------------------------------------"""
def lookup_tenant(tenant_id: str) -> dict | None:
    """
    Look up a tenant record by its unique ID.

    Parameters:
        tenant_id (str): The unique identifier of the tenant.

    Returns:
        dict | None: The tenant record, or None if not found.
    """
    log_handler.debug(f"[tenant_mcp] Looking up tenant_id='{tenant_id}'")
    db = get_database_service()
    tenant = db.tenants.find_by_id(tenant_id)
    if not tenant:
        log_handler.warning(f"[tenant_mcp] Tenant '{tenant_id}' not found")
    return tenant


def get_tenant_by_name_and_unit(name: str, unit: str) -> dict | None:
    """
    Find a tenant by matching their name and address unit.

    Used by the mock login flow to authenticate tenants without passwords.
    Performs a case-insensitive partial match on both name and address.

    Parameters:
        name (str): The tenant's full name to search for.
        unit (str): The unit/address string to match against the tenant's address.

    Returns:
        dict | None: The first matching tenant record, or None if not found.
    """
    log_handler.debug(f"[tenant_mcp] Searching tenant by name='{name}', unit='{unit}'")
    db = get_database_service()
    all_tenants = db.tenants.list()

    for tenant in all_tenants:
        name_match = name.lower().strip() in tenant.get("name", "").lower()
        unit_match = unit.lower().strip() in tenant.get("address", "").lower()
        if name_match and unit_match:
            log_handler.info(f"[tenant_mcp] Found tenant '{tenant['id']}' by name+unit")
            return tenant

    log_handler.warning(f"[tenant_mcp] No tenant found for name='{name}', unit='{unit}'")
    return None


def get_tenant_property(tenant_id: str) -> dict | None:
    """
    Return the property record associated with a tenant.

    Looks up the tenant first, then fetches the property using the
    tenant's property_id field.

    Parameters:
        tenant_id (str): The unique identifier of the tenant.

    Returns:
        dict | None: The property record, or None if the tenant or
            property is not found.
    """
    log_handler.debug(f"[tenant_mcp] Getting property for tenant_id='{tenant_id}'")
    db = get_database_service()
    tenant = db.tenants.find_by_id(tenant_id)
    if not tenant:
        log_handler.warning(f"[tenant_mcp] Tenant '{tenant_id}' not found")
        return None

    property_id = tenant.get("property_id")
    if not property_id:
        log_handler.warning(f"[tenant_mcp] Tenant '{tenant_id}' has no property_id")
        return None

    prop = db.properties.find_by_id(property_id)
    if not prop:
        log_handler.warning(f"[tenant_mcp] Property '{property_id}' not found")
    return prop
