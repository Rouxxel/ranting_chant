"""
#############################################################################
### Phase 7 auth unit tests
###
### @file test_phase7_auth.py
### @date 2026
#############################################################################

Unit tests for auth_router.py. All Supabase calls are mocked so these
tests run without a real Supabase connection.

Covers:
    - Valid manager and owner login flows
    - Invalid credentials (bad password, unknown username, tenant with no account)
    - require_manager_or_owner, require_owner, require_manager dependency guards
"""

# Native imports
import asyncio
import unittest
from unittest.mock import MagicMock, patch

# Third-party imports
from fastapi import HTTPException

# Other files imports
from src.api_endpoints.routers.owner_manager_routers.auth_router import (
    LoginRequest,
    login,
    get_current_actor,
    require_manager_or_owner,
    require_owner,
    require_manager,
)


"""HELPERS-----------------------------------------------------------"""

_AUTH_MODULE = "src.api_endpoints.routers.owner_manager_routers.auth_router.supabase_client"


def _make_starlette_request():
    """Build a minimal starlette Request for rate-limiter-decorated endpoints."""
    from starlette.requests import Request
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/auth/login",
        "headers": [],
        "query_string": b"",
        "server": ("localhost", 8000),
        "client": ("127.0.0.1", 9000),
    })


def _make_mock_supabase(
    sign_in_side_effect=None,
    user_accounts_by_username=None,
    user_accounts_by_auth_id=None,
    manager_row=None,
    actor_row=None,
    managed_property_ids=None,
    owner_row=None,
    owned_property_ids=None,
):
    """Build a chainable MagicMock for supabase_client."""
    mock_sb = MagicMock()

    # --- sign_in_with_password ---
    if sign_in_side_effect is not None:
        mock_sb.auth.sign_in_with_password.side_effect = sign_in_side_effect
    else:
        mock_session = MagicMock()
        mock_session.access_token = "fake_access_token"
        mock_session.refresh_token = "fake_refresh_token"
        mock_user = MagicMock()
        mock_user.id = "auth-uuid-1234"
        mock_auth_response = MagicMock()
        mock_auth_response.user = mock_user
        mock_auth_response.session = mock_session
        mock_sb.auth.sign_in_with_password.return_value = mock_auth_response

    # The table mock uses a side_effect dict keyed by table name.
    table_mocks = {}

    # --- user_accounts by username lookup (for non-email identifier) ---
    if user_accounts_by_username is not None:
        ua_by_username = MagicMock()
        ua_by_username.data = user_accounts_by_username
        table_mocks[("user_accounts", "email", "username")] = ua_by_username

    # --- user_accounts by auth_user_id lookup ---
    if user_accounts_by_auth_id is not None:
        ua_by_auth = MagicMock()
        ua_by_auth.data = user_accounts_by_auth_id
        table_mocks[("user_accounts", "*", "auth_user_id")] = ua_by_auth

    # --- property_managers ---
    if manager_row is not None:
        mgr_mock = MagicMock()
        mgr_mock.data = manager_row
        table_mocks[("property_managers",)] = mgr_mock

    # --- actors ---
    if actor_row is not None:
        actor_mock = MagicMock()
        actor_mock.data = actor_row
        table_mocks[("actors",)] = actor_mock

    # --- manager_properties ---
    if managed_property_ids is not None:
        mp_mock = MagicMock()
        mp_mock.data = [{"property_id": pid} for pid in managed_property_ids]
        table_mocks[("manager_properties",)] = mp_mock

    # --- owners ---
    if owner_row is not None:
        own_mock = MagicMock()
        own_mock.data = owner_row
        table_mocks[("owners",)] = own_mock

    # --- owner_properties ---
    if owned_property_ids is not None:
        op_mock = MagicMock()
        op_mock.data = [{"property_id": pid} for pid in owned_property_ids]
        table_mocks[("owner_properties",)] = op_mock

    return mock_sb, table_mocks


def _make_full_manager_mock():
    """Return a mock_sb pre-configured for a successful manager login via email."""
    mock_sb = MagicMock()

    # sign_in_with_password
    mock_session = MagicMock()
    mock_session.access_token = "fake_access_token"
    mock_session.refresh_token = "fake_refresh_token"
    mock_user = MagicMock()
    mock_user.id = "auth-uuid-1234"
    mock_auth_resp = MagicMock()
    mock_auth_resp.user = mock_user
    mock_auth_resp.session = mock_session
    mock_sb.auth.sign_in_with_password.return_value = mock_auth_resp

    # We need table() calls to return specific results based on call order.
    # Order of table() calls in login() for a manager via email:
    #   1. table("user_accounts").select("*").eq("auth_user_id", ...).execute()
    #   2. table("property_managers").select("*").eq("id", ...).execute()
    #   3. table("actors").select("*").eq("id", ...).execute()
    #   4. table("manager_properties").select("property_id").eq("manager_id", ...).execute()

    ua_result = MagicMock()
    ua_result.data = [{"role": "manager", "actor_id": "mgr-actor-001"}]

    mgr_result = MagicMock()
    mgr_result.data = [{"id": "mgr-actor-001", "name": "Manager One"}]

    actor_result = MagicMock()
    actor_result.data = [{"display_name": "Manager One", "email": "manager@gmail.com", "phone": "+16505554321"}]

    mp_result = MagicMock()
    mp_result.data = [{"property_id": "prop-001"}]

    call_counter = {"n": 0}
    results = [ua_result, mgr_result, actor_result, mp_result]

    def table_side_effect(table_name):
        tbl = MagicMock()
        tbl.select.return_value = tbl
        tbl.eq.return_value = tbl

        def execute_side_effect():
            idx = call_counter["n"]
            call_counter["n"] += 1
            return results[idx] if idx < len(results) else MagicMock(data=[])

        tbl.execute.side_effect = execute_side_effect
        return tbl

    mock_sb.table.side_effect = table_side_effect
    return mock_sb


def _make_full_owner_mock():
    """Return a mock_sb pre-configured for a successful owner login via email."""
    mock_sb = MagicMock()

    mock_session = MagicMock()
    mock_session.access_token = "owner_access_token"
    mock_session.refresh_token = "owner_refresh_token"
    mock_user = MagicMock()
    mock_user.id = "auth-uuid-owner"
    mock_auth_resp = MagicMock()
    mock_auth_resp.user = mock_user
    mock_auth_resp.session = mock_session
    mock_sb.auth.sign_in_with_password.return_value = mock_auth_resp

    # Order of table() calls in login() for an owner via email:
    #   1. table("user_accounts").select("*").eq("auth_user_id", ...).execute()
    #   2. table("owners").select("*").eq("id", ...).execute()
    #   3. table("actors").select("*").eq("id", ...).execute()
    #   4. table("owner_properties").select("property_id").eq("owner_id", ...).execute()

    ua_result = MagicMock()
    ua_result.data = [{"role": "owner", "actor_id": "own-actor-001"}]

    own_result = MagicMock()
    own_result.data = [{"id": "own-actor-001", "name": "Owner One"}]

    actor_result = MagicMock()
    actor_result.data = [{"display_name": "Owner One", "email": "owner@gmail.com", "phone": "+16505559876"}]

    op_result = MagicMock()
    op_result.data = [{"property_id": "prop-002"}]

    call_counter = {"n": 0}
    results = [ua_result, own_result, actor_result, op_result]

    def table_side_effect(table_name):
        tbl = MagicMock()
        tbl.select.return_value = tbl
        tbl.eq.return_value = tbl

        def execute_side_effect():
            idx = call_counter["n"]
            call_counter["n"] += 1
            return results[idx] if idx < len(results) else MagicMock(data=[])

        tbl.execute.side_effect = execute_side_effect
        return tbl

    mock_sb.table.side_effect = table_side_effect
    return mock_sb


"""TESTS-----------------------------------------------------------"""


class TestAuthLogin(unittest.IsolatedAsyncioTestCase):
    """Tests for the login() endpoint function."""

    async def test_valid_manager_login(self):
        """Successful manager login returns AuthResponse with role=manager and access_token."""
        mock_sb = _make_full_manager_mock()
        with patch(_AUTH_MODULE, mock_sb):
            creds = LoginRequest(identifier="manager@gmail.com", password="Secret1!")
            response = await login(_make_starlette_request(), creds)

        self.assertEqual(response.role, "manager")
        self.assertEqual(response.access_token, "fake_access_token")
        self.assertIn("managed_properties", response.actor)

    async def test_valid_owner_login(self):
        """Successful owner login returns AuthResponse with role=owner and access_token."""
        mock_sb = _make_full_owner_mock()
        with patch(_AUTH_MODULE, mock_sb):
            creds = LoginRequest(identifier="owner@gmail.com", password="Secret1!")
            response = await login(_make_starlette_request(), creds)

        self.assertEqual(response.role, "owner")
        self.assertEqual(response.access_token, "owner_access_token")
        self.assertIn("owned_properties", response.actor)

    async def test_invalid_password_raises_401(self):
        """sign_in_with_password raising an exception should produce HTTPException 401."""
        mock_sb = MagicMock()
        mock_sb.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")

        with patch(_AUTH_MODULE, mock_sb):
            creds = LoginRequest(identifier="someone@gmail.com", password="WrongPass!")
            with self.assertRaises(HTTPException) as ctx:
                await login(_make_starlette_request(), creds)

        self.assertEqual(ctx.exception.status_code, 401)

    async def test_unknown_username_raises_401(self):
        """Username with no matching user_accounts row raises HTTPException 401."""
        mock_sb = MagicMock()
        # Username path: table("user_accounts").select("email").eq("username", ...).execute()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        with patch(_AUTH_MODULE, mock_sb):
            creds = LoginRequest(identifier="unknownuser", password="Secret1!")
            with self.assertRaises(HTTPException) as ctx:
                await login(_make_starlette_request(), creds)

        self.assertEqual(ctx.exception.status_code, 401)

    async def test_tenant_cannot_login(self):
        """
        A tenant who successfully authenticates but has no user_accounts row
        should receive HTTPException 401.
        """
        mock_sb = MagicMock()

        # sign_in_with_password succeeds
        mock_session = MagicMock()
        mock_session.access_token = "tenant_token"
        mock_user = MagicMock()
        mock_user.id = "auth-uuid-tenant"
        mock_auth_resp = MagicMock()
        mock_auth_resp.user = mock_user
        mock_auth_resp.session = mock_session
        mock_sb.auth.sign_in_with_password.return_value = mock_auth_resp

        # user_accounts lookup by auth_user_id returns empty (no account row for tenant)
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        with patch(_AUTH_MODULE, mock_sb):
            creds = LoginRequest(identifier="tenant@gmail.com", password="Secret1!")
            with self.assertRaises(HTTPException) as ctx:
                await login(_make_starlette_request(), creds)

        self.assertEqual(ctx.exception.status_code, 401)


"""DEPENDENCY GUARD TESTS-----------------------------------------------------------"""


class TestAuthDependencyGuards(unittest.IsolatedAsyncioTestCase):
    """Tests for require_manager_or_owner, require_owner, require_manager."""

    async def test_require_manager_or_owner_passes_manager(self):
        """Manager role is allowed through require_manager_or_owner."""
        actor = {"id": "mgr-001", "role": "manager"}
        result = await require_manager_or_owner(actor)
        self.assertEqual(result, actor)

    async def test_require_manager_or_owner_passes_owner(self):
        """Owner role is allowed through require_manager_or_owner."""
        actor = {"id": "own-001", "role": "owner"}
        result = await require_manager_or_owner(actor)
        self.assertEqual(result, actor)

    async def test_require_manager_or_owner_blocks_tenant(self):
        """Tenant role is blocked by require_manager_or_owner with HTTPException 403."""
        actor = {"id": "ten-001", "role": "tenant"}
        with self.assertRaises(HTTPException) as ctx:
            await require_manager_or_owner(actor)
        self.assertEqual(ctx.exception.status_code, 403)

    async def test_require_owner_passes(self):
        """Owner role passes require_owner."""
        actor = {"id": "own-001", "role": "owner"}
        result = await require_owner(actor)
        self.assertEqual(result, actor)

    async def test_require_owner_blocks_manager(self):
        """Manager role is blocked by require_owner with HTTPException 403."""
        actor = {"id": "mgr-001", "role": "manager"}
        with self.assertRaises(HTTPException) as ctx:
            await require_owner(actor)
        self.assertEqual(ctx.exception.status_code, 403)

    async def test_require_manager_passes(self):
        """Manager role passes require_manager."""
        actor = {"id": "mgr-001", "role": "manager"}
        result = await require_manager(actor)
        self.assertEqual(result, actor)

    async def test_require_manager_blocks_owner(self):
        """Owner role is blocked by require_manager with HTTPException 403."""
        actor = {"id": "own-001", "role": "owner"}
        with self.assertRaises(HTTPException) as ctx:
            await require_manager(actor)
        self.assertEqual(ctx.exception.status_code, 403)


"""ENTRY POINT-----------------------------------------------------------"""
if __name__ == "__main__":
    unittest.main()
