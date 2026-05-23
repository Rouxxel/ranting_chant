"""
#############################################################################
### Property MCP tool file
###
### @file property_mcp.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module provides MCP-style data access tools for property records,
including lookups for the associated manager and owner.
"""

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.json_store import find_by_id

"""TOOLS-----------------------------------------------------------"""
def lookup_property(property_id: str) -> dict | None:
    """
    Look up a property record by its unique ID.

    Parameters:
        property_id (str): The unique identifier of the property.

    Returns:
        dict | None: The property record, or None if not found.
    """
    log_handler.debug(f"[property_mcp] Looking up property_id='{property_id}'")
    prop = find_by_id("properties", property_id)
    if not prop:
        log_handler.warning(f"[property_mcp] Property '{property_id}' not found")
    return prop


def get_property_manager(property_id: str) -> dict | None:
    """
    Return the property manager record for a given property.

    Looks up the property first, then fetches the manager using the
    property's manager_id field.

    Parameters:
        property_id (str): The unique identifier of the property.

    Returns:
        dict | None: The property manager record, or None if the property
            or manager is not found.
    """
    log_handler.debug(f"[property_mcp] Getting manager for property_id='{property_id}'")
    prop = find_by_id("properties", property_id)
    if not prop:
        log_handler.warning(f"[property_mcp] Property '{property_id}' not found")
        return None

    manager_id = prop.get("manager_id")
    if not manager_id:
        log_handler.warning(f"[property_mcp] Property '{property_id}' has no manager_id")
        return None

    manager = find_by_id("property_magament", manager_id)
    if not manager:
        log_handler.warning(f"[property_mcp] Manager '{manager_id}' not found")
    return manager


def get_property_owner(property_id: str) -> dict | None:
    """
    Return the owner record for a given property.

    Looks up the property first, then fetches the owner using the
    property's owner_id field.

    Parameters:
        property_id (str): The unique identifier of the property.

    Returns:
        dict | None: The owner record, or None if the property or
            owner is not found.
    """
    log_handler.debug(f"[property_mcp] Getting owner for property_id='{property_id}'")
    prop = find_by_id("properties", property_id)
    if not prop:
        log_handler.warning(f"[property_mcp] Property '{property_id}' not found")
        return None

    owner_id = prop.get("owner_id")
    if not owner_id:
        log_handler.warning(f"[property_mcp] Property '{property_id}' has no owner_id")
        return None

    owner = find_by_id("owners", owner_id)
    if not owner:
        log_handler.warning(f"[property_mcp] Owner '{owner_id}' not found")
    return owner
