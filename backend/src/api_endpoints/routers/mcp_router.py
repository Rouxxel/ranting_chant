"""
#############################################################################
### MCP router file
###
### @file mcp_router.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module exposes a read-only endpoint that lists all registered MCP tools
and their descriptions. Useful for introspection and debugging.
"""

#Third-party imports
from fastapi import APIRouter, HTTPException, Request

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.mcp.mcp_registry import list_tools

"""API ROUTER-----------------------------------------------------------"""
#Get API router
router = APIRouter(
    prefix=config_loader['endpoints']['mcp_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['mcp_endpoint']['endpoint_tag']],
)

"""ENDPOINTS-----------------------------------------------------------"""
#List all registered MCP tools
@router.get(config_loader['endpoints']['mcp_endpoint']['tools_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['mcp_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['mcp_endpoint']['unit_of_time_for_limit']}"
)
async def get_mcp_tools(request: Request):
    """
    List all registered MCP tools and their descriptions.

    Returns the full registry of available MCP tool names and what each
    tool does. Useful for introspection, debugging, and frontend tooling.

    Parameters:
        request (Request): The incoming HTTP request for rate limit tracking.

    Returns:
        dict: A response containing a 'tools' list, each entry with
            'name' and 'description' fields, and a 'count' of total tools.

    Note:
        If the rate limit is exceeded, the rate_limit_handler() handles the response.
    """
    try:
        log_handler.debug("Listing all registered MCP tools")
        tools = list_tools()
        log_handler.info(f"Returning {len(tools)} registered MCP tool(s)")
        return {"count": len(tools), "tools": tools}

    except Exception as e:
        log_handler.error(f"Unexpected error listing MCP tools: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while listing MCP tools")
