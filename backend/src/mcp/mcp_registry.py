"""
#############################################################################
### MCP registry file
###
### @file mcp_registry.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module maintains a registry of all available MCP tools, mapping
string tool names to their callable implementations. It exposes a single
execute_tool() entry point for dispatching tool calls by name.
"""

#Other files imports
from src.utils.custom_logger import log_handler
from src.mcp import tenant_mcp, property_mcp, vendor_mcp, request_mcp, tavily_mcp, notification_mcp

"""REGISTRY-----------------------------------------------------------"""
#Map of tool name -> callable
#Each entry describes the tool and points to its implementation function
TOOL_REGISTRY: dict[str, dict] = {
    # Tenant tools
    "lookup_tenant": {
        "description": "Look up a tenant record by ID",
        "fn": tenant_mcp.lookup_tenant
    },
    "get_tenant_by_name_and_unit": {
        "description": "Find a tenant by name and address unit (used for mock login)",
        "fn": tenant_mcp.get_tenant_by_name_and_unit
    },
    "get_tenant_property": {
        "description": "Return the property record associated with a tenant",
        "fn": tenant_mcp.get_tenant_property
    },

    # Property tools
    "lookup_property": {
        "description": "Look up a property record by ID",
        "fn": property_mcp.lookup_property
    },
    "get_property_manager": {
        "description": "Return the manager record for a property",
        "fn": property_mcp.get_property_manager
    },
    "get_property_owner": {
        "description": "Return the owner record for a property",
        "fn": property_mcp.get_property_owner
    },

    # Vendor tools
    "find_vendors_by_service": {
        "description": "Return all vendors offering a given service category",
        "fn": vendor_mcp.find_vendors_by_service
    },
    "get_emergency_vendors": {
        "description": "Return emergency-available vendors for a service category",
        "fn": vendor_mcp.get_emergency_vendors
    },
    "get_vendor": {
        "description": "Look up a vendor record by ID",
        "fn": vendor_mcp.get_vendor
    },

    # Request tools
    "create_request": {
        "description": "Create a new service/maintenance request record",
        "fn": request_mcp.create_request
    },
    "update_request": {
        "description": "Merge updates into an existing request record",
        "fn": request_mcp.update_request
    },
    "get_request": {
        "description": "Look up a request record by ID",
        "fn": request_mcp.get_request
    },
    "list_requests_by_tenant": {
        "description": "Return all requests submitted by a specific tenant",
        "fn": request_mcp.list_requests_by_tenant
    },
    "list_all_requests": {
        "description": "Return all request records",
        "fn": request_mcp.list_all_requests
    },
    "escalate_request": {
        "description": "Escalate a request and append the reason to its history",
        "fn": request_mcp.escalate_request
    },
    "append_conversation_turn": {
        "description": "Append a conversation message to a request's history",
        "fn": request_mcp.append_conversation_turn
    },

    # Web tools
    "web.search": {
        "description": "Search the web with Tavily and return source snippets",
        "fn": tavily_mcp.web_search
    },
    "web.extract": {
        "description": "Extract cleaned content from HTTPS URLs with Tavily",
        "fn": tavily_mcp.web_extract
    },
    "web.map": {
        "description": "Discover a lightweight site map for an HTTPS URL with Tavily",
        "fn": tavily_mcp.web_map
    },

    # Notification tools
    "send_email_notification": {
        "description": "Send an email notification to a manager, owner, or vendor",
        "fn": notification_mcp.send_email_notification
    },
    "send_sms_notification": {
        "description": "Send an emergency SMS notification to a manager or owner",
        "fn": notification_mcp.send_sms_notification
    },
}

"""METHODS-----------------------------------------------------------"""
def execute_tool(tool_name: str, params: dict) -> any:
    """
    Execute a registered MCP tool by name with the given parameters.

    Looks up the tool in TOOL_REGISTRY, calls its function with **params,
    and returns the result. Raises ValueError for unknown tool names and
    re-raises any exception from the tool itself after logging.

    Parameters:
        tool_name (str): The registered name of the tool to execute.
        params (dict): Keyword arguments to pass to the tool function.

    Returns:
        any: The return value of the tool function.

    Raises:
        ValueError: If tool_name is not found in the registry.
        Exception: Any exception raised by the tool function itself.
    """
    log_handler.debug(f"[mcp_registry] Executing tool='{tool_name}', params={list(params.keys())}")

    if tool_name not in TOOL_REGISTRY:
        message = f"Unknown MCP tool: '{tool_name}'"
        log_handler.error(f"[mcp_registry] {message}")
        raise ValueError(message)

    tool_fn = TOOL_REGISTRY[tool_name]["fn"]

    try:
        result = tool_fn(**params)
        log_handler.info(f"[mcp_registry] Tool '{tool_name}' executed successfully")
        return result
    except Exception as e:
        log_handler.error(f"[mcp_registry] Tool '{tool_name}' raised an error: {e}")
        raise


def list_tools() -> list[dict]:
    """
    Return a list of all registered tools with their names and descriptions.

    Used by the GET /mcp/tools endpoint to expose available tools.

    Returns:
        list[dict]: Each entry contains 'name' and 'description' keys.
    """
    log_handler.debug("[mcp_registry] Listing all registered tools")
    tools = [
        {"name": name, "description": entry["description"]}
        for name, entry in TOOL_REGISTRY.items()
    ]
    log_handler.info(f"[mcp_registry] Returning {len(tools)} registered tool(s)")
    return tools
