"""
Tavily client and MCP registry tests.
"""

import unittest
from unittest.mock import MagicMock, patch

from src.ai.tools.tavily_client import tavily_map, tavily_search
from src.mcp.mcp_registry import list_tools


class TestTavilyClient(unittest.TestCase):
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

    def test_mcp_registry_exposes_web_tools(self):
        names = {tool["name"] for tool in list_tools()}

        self.assertIn("web.search", names)
        self.assertIn("web.extract", names)
        self.assertIn("web.map", names)


if __name__ == "__main__":
    unittest.main()
