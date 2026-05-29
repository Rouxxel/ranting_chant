"""
MCP-style wrappers for Tavily web tools.
"""

from __future__ import annotations

from src.ai.tools.tavily_client import tavily_extract, tavily_map, tavily_search


def web_search(query: str, max_results: int = 5, include_answer: bool = False, include_images: bool = False) -> dict:
    """Run a Tavily search and return normalized results as a dict."""
    return tavily_search(
        query,
        max_results=max_results,
        include_answer=include_answer,
        include_images=include_images,
    ).model_dump()


def web_extract(urls: list[str] | str, include_images: bool = False) -> dict:
    """Extract cleaned content from one or more HTTPS URLs."""
    return tavily_extract(urls, include_images=include_images).model_dump()


def web_map(url: str, max_depth: int = 1, limit: int = 50) -> dict:
    """Generate a lightweight site map for an HTTPS URL."""
    return tavily_map(url, max_depth=max_depth, limit=limit).model_dump()
