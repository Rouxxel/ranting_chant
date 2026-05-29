"""
Tavily client and MCP registry tests.
"""

import unittest
from unittest.mock import MagicMock, patch

from src.ai.tools import tavily_client
from src.ai.tools.tavily_client import TavilyError, TavilyRateLimitError, tavily_extract, tavily_map, tavily_search
from src.mcp.mcp_registry import list_tools


class TestTavilyClient(unittest.TestCase):
    def setUp(self):
        tavily_client._REQUEST_TIMESTAMPS.clear()

    @patch.dict("os.environ", {"TAVILY_API_KEY": "tvly-test"}, clear=False)
    @patch("src.ai.tools.tavily_client.requests.post")
    def test_tavily_search_normalizes_results(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "query": "official docs",
            "answer": None,
            "results": [
                {
                    "title": "Docs",
                    "url": "https://example.com/docs",
                    "content": "Helpful documentation snippet",
                    "score": 0.91,
                }
            ],
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = tavily_search("official docs", max_results=1)

        self.assertEqual(result.query, "official docs")
        self.assertEqual(result.results[0].title, "Docs")
        self.assertEqual(result.results[0].content_snippet, "Helpful documentation snippet")

    @patch.dict("os.environ", {"TAVILY_API_KEY": "tvly-test"}, clear=False)
    @patch("src.ai.tools.tavily_client.requests.post")
    def test_tavily_map_normalizes_urls(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "base_url": "https://example.com",
            "results": ["https://example.com/a", "https://example.com/b"],
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = tavily_map("https://example.com", max_depth=1, limit=2)

        self.assertEqual(result.base_url, "https://example.com")
        self.assertEqual(result.results[0].url, "https://example.com/a")

    def test_tavily_extract_rejects_non_https_urls(self):
        with self.assertRaises(TavilyError):
            tavily_extract("http://example.com")

    @patch.dict(tavily_client.TAVILY_CONFIG, {"max_extract_chars": 12}, clear=False)
    @patch.dict("os.environ", {"TAVILY_API_KEY": "tvly-test"}, clear=False)
    @patch("src.ai.tools.tavily_client.requests.post")
    def test_tavily_extract_truncates_large_content(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {
                    "url": "https://example.com/article",
                    "title": "Article",
                    "raw_content": "abcdefghijklmnopqrstuvwxyz",
                }
            ],
            "failed_results": [],
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = tavily_extract("https://example.com/article")

        self.assertEqual(result.results[0].content, "abcdefghi...")

    @patch.dict(tavily_client.TAVILY_CONFIG, {"rate_limit_per_minute": 1}, clear=False)
    @patch.dict("os.environ", {"TAVILY_API_KEY": "tvly-test"}, clear=False)
    @patch("src.ai.tools.tavily_client.requests.post")
    def test_tavily_local_rate_limit_is_enforced(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"query": "one", "results": []}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        tavily_search("one")

        with self.assertRaises(TavilyRateLimitError):
            tavily_search("two")

    def test_mcp_registry_exposes_web_tools(self):
        names = {tool["name"] for tool in list_tools()}

        self.assertIn("web.search", names)
        self.assertIn("web.extract", names)
        self.assertIn("web.map", names)


if __name__ == "__main__":
    unittest.main()
