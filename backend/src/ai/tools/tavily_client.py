"""
Tavily REST client used by AI orchestration and MCP-style web tools.
"""

from __future__ import annotations

import os
from urllib.parse import urlparse

import requests

from src.ai.tools.schemas import (
    WebExtractItem,
    WebExtractResponse,
    WebMapNode,
    WebMapResponse,
    WebSearchResponse,
    WebSearchResultItem,
)
from src.core_specs.configuration.config_loader import config_loader
from src.utils.custom_logger import log_handler

TAVILY_CONFIG = config_loader.get("tavily", {})


class TavilyError(Exception):
    """Raised when a Tavily request cannot be completed."""


def is_tavily_enabled() -> bool:
    """Return true when Tavily is enabled and an API key is configured."""
    return bool(TAVILY_CONFIG.get("enabled", False) and os.getenv("TAVILY_API_KEY", "").strip())


def _base_url() -> str:
    return TAVILY_CONFIG.get("base_url", "https://api.tavily.com").rstrip("/")


def _headers() -> dict[str, str]:
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        raise TavilyError("TAVILY_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _post(endpoint: str, payload: dict) -> dict:
    try:
        response = requests.post(
            f"{_base_url()}/{endpoint.lstrip('/')}",
            headers=_headers(),
            json=payload,
            timeout=TAVILY_CONFIG.get("timeout_seconds", 30),
        )
        response.raise_for_status()
        return response.json()
    except TavilyError:
        raise
    except Exception as exc:
        raise TavilyError(f"Tavily {endpoint} request failed: {exc}") from exc


def _require_https_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise TavilyError("Only https URLs are allowed for Tavily extract/map")
    return url


def tavily_search(
    query: str,
    *,
    max_results: int | None = None,
    include_answer: bool | str | None = None,
    include_images: bool | None = None,
    search_depth: str | None = None,
) -> WebSearchResponse:
    """Search the web with Tavily and return normalized result items."""
    if not query or not query.strip():
        raise TavilyError("Search query cannot be empty")

    payload = {
        "query": query.strip(),
        "max_results": max_results or TAVILY_CONFIG.get("max_results", 5),
        "include_answer": include_answer if include_answer is not None else TAVILY_CONFIG.get("include_answer", False),
        "include_images": include_images if include_images is not None else TAVILY_CONFIG.get("include_images", False),
        "search_depth": search_depth or TAVILY_CONFIG.get("search_depth", "basic"),
    }
    data = _post("search", payload)
    results = [
        WebSearchResultItem(
            title=item.get("title") or item.get("url", "Untitled result"),
            url=item.get("url", ""),
            content_snippet=item.get("content") or "",
            score=item.get("score"),
        )
        for item in data.get("results", [])
        if item.get("url")
    ]
    return WebSearchResponse(query=data.get("query", query), answer=data.get("answer"), results=results)


def tavily_extract(urls: list[str] | str, *, include_images: bool = False) -> WebExtractResponse:
    """Extract cleaned content for one or more HTTPS URLs."""
    url_list = [urls] if isinstance(urls, str) else urls
    safe_urls = [_require_https_url(url) for url in url_list]
    data = _post("extract", {"urls": safe_urls, "include_images": include_images})
    results = [
        WebExtractItem(
            url=item.get("url", ""),
            title=item.get("title"),
            content=item.get("raw_content") or item.get("content") or "",
            metadata={key: value for key, value in item.items() if key not in {"url", "title", "raw_content", "content"}},
        )
        for item in data.get("results", [])
        if item.get("url")
    ]
    return WebExtractResponse(results=results, failed_results=data.get("failed_results", []))


def tavily_map(url: str, *, max_depth: int = 1, limit: int = 50) -> WebMapResponse:
    """Discover a lightweight site map for an HTTPS URL."""
    safe_url = _require_https_url(url)
    data = _post("map", {"url": safe_url, "max_depth": max_depth, "limit": limit})
    nodes = [WebMapNode(url=result_url) for result_url in data.get("results", [])]
    return WebMapResponse(base_url=data.get("base_url", safe_url), results=nodes)


def format_search_results_for_prompt(search_response: WebSearchResponse, max_results: int = 5) -> str:
    """Format search results into compact context for Gemini."""
    if not search_response.results:
        return ""

    lines = [f"WEB SEARCH RESULTS for query: {search_response.query}"]
    for index, item in enumerate(search_response.results[:max_results], start=1):
        snippet = item.content_snippet.replace("\n", " ").strip()
        if len(snippet) > 500:
            snippet = f"{snippet[:497]}..."
        lines.append(f"{index}. {item.title}\nURL: {item.url}\nSnippet: {snippet}")
    return "\n".join(lines)


def append_relevant_links(reply: str, search_response: WebSearchResponse, max_results: int = 3) -> str:
    """Ensure source-backed replies expose compact relevant links."""
    if not search_response.results or "Relevant links" in reply:
        return reply

    link_lines = ["", "Relevant links:"]
    for item in search_response.results[:max_results]:
        snippet = item.content_snippet.replace("\n", " ").strip()
        if len(snippet) > 140:
            snippet = f"{snippet[:137]}..."
        reason = f" - {snippet}" if snippet else ""
        link_lines.append(f"- {item.title}: {item.url}{reason}")
    return f"{reply}\n" + "\n".join(link_lines)


def should_trigger_tavily_search(message: str) -> bool:
    """Simple predictable heuristic for one web search per user message."""
    lowered = message.lower()
    return any(keyword.lower() in lowered for keyword in TAVILY_CONFIG.get("trigger_keywords", []))


log_handler.debug("Tavily client helpers loaded")
