"""
Structured schemas for web tool results consumed by the conversation engine.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, HttpUrl


class WebSearchResultItem(BaseModel):
    """One normalized Tavily search result."""

    title: str
    url: str
    content_snippet: str = ""
    score: float | None = None


class WebSearchResponse(BaseModel):
    """Normalized response for a Tavily search request."""

    query: str
    answer: str | None = None
    results: list[WebSearchResultItem] = Field(default_factory=list)


class WebExtractItem(BaseModel):
    """One normalized Tavily extract result."""

    url: str
    title: str | None = None
    content: str
    metadata: dict = Field(default_factory=dict)


class WebExtractResponse(BaseModel):
    """Normalized response for Tavily extract requests."""

    results: list[WebExtractItem] = Field(default_factory=list)
    failed_results: list[dict] = Field(default_factory=list)


class WebMapNode(BaseModel):
    """One normalized URL discovered by Tavily map."""

    url: str
    depth: int | None = None
    parent_url: str | None = None


class WebMapResponse(BaseModel):
    """Normalized response for Tavily map requests."""

    base_url: str
    results: list[WebMapNode] = Field(default_factory=list)
