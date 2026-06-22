"""
#############################################################################
### Phase 7 route authorization tests
###
### @file test_phase7_route_auth.py
### @date 2026
#############################################################################

Tests that the auth dependency functions correctly gate access based on role.
All tests call the dependency functions directly (no HTTP layer needed).

Covers:
    - require_manager_or_owner: passes manager and owner, blocks tenant
    - require_owner: passes owner, blocks manager and tenant
    - require_manager: passes manager, blocks owner and tenant
"""

# Native imports
import asyncio
import unittest

# Third-party imports
from fastapi import HTTPException

# Other files imports
from src.api_endpoints.routers.owner_manager_routers.auth_router import (
    require_manager_or_owner,
    require_owner,
    require_manager,
)


"""HELPERS-----------------------------------------------------------"""


def _run(coro):
    """Run an async dependency function synchronously."""
    return asyncio.run(coro)


"""TESTS-----------------------------------------------------------"""


class TestRequireManagerOrOwner(unittest.TestCase):
    """Tests for require_manager_or_owner dependency."""

    def test_passes_manager_role(self):
        actor = {"id": "mgr-001", "role": "manager"}
        result = _run(require_manager_or_owner(actor))
        self.assertEqual(result, actor)

    def test_passes_owner_role(self):
        actor = {"id": "own-001", "role": "owner"}
        result = _run(require_manager_or_owner(actor))
        self.assertEqual(result, actor)

    def test_blocks_tenant_role(self):
        actor = {"id": "ten-001", "role": "tenant"}
        with self.assertRaises(HTTPException) as ctx:
            _run(require_manager_or_owner(actor))
        self.assertEqual(ctx.exception.status_code, 403)

    def test_blocks_unknown_role(self):
        actor = {"id": "xyz-001", "role": "unknown"}
        with self.assertRaises(HTTPException) as ctx:
            _run(require_manager_or_owner(actor))
        self.assertEqual(ctx.exception.status_code, 403)


class TestRequireOwner(unittest.TestCase):
    """Tests for require_owner dependency."""

    def test_passes_owner_role(self):
        actor = {"id": "own-001", "role": "owner"}
        result = _run(require_owner(actor))
        self.assertEqual(result, actor)

    def test_blocks_manager_role(self):
        actor = {"id": "mgr-001", "role": "manager"}
        with self.assertRaises(HTTPException) as ctx:
            _run(require_owner(actor))
        self.assertEqual(ctx.exception.status_code, 403)

    def test_blocks_tenant_role(self):
        actor = {"id": "ten-001", "role": "tenant"}
        with self.assertRaises(HTTPException) as ctx:
            _run(require_owner(actor))
        self.assertEqual(ctx.exception.status_code, 403)


class TestRequireManager(unittest.TestCase):
    """Tests for require_manager dependency."""

    def test_passes_manager_role(self):
        actor = {"id": "mgr-001", "role": "manager"}
        result = _run(require_manager(actor))
        self.assertEqual(result, actor)

    def test_blocks_owner_role(self):
        actor = {"id": "own-001", "role": "owner"}
        with self.assertRaises(HTTPException) as ctx:
            _run(require_manager(actor))
        self.assertEqual(ctx.exception.status_code, 403)

    def test_blocks_tenant_role(self):
        actor = {"id": "ten-001", "role": "tenant"}
        with self.assertRaises(HTTPException) as ctx:
            _run(require_manager(actor))
        self.assertEqual(ctx.exception.status_code, 403)


"""ENTRY POINT-----------------------------------------------------------"""
if __name__ == "__main__":
    unittest.main()
