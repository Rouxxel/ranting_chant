"""
supabase_client.py

Shared Supabase client module for the Ranting Chant backend.

Provides:
  - A singleton service-role client for privileged server-side operations.
  - A factory for user-scoped clients that inject a user JWT for RLS.

Credentials are read from environment variables and never exposed beyond
this module.
"""

import os
from functools import lru_cache

from supabase import create_client, Client
from src.utils.custom_logger import log_handler


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _require_env(name: str) -> str:
    """Return the value of an environment variable or raise."""
    value = os.getenv(name)
    if not value:
        raise EnvironmentError(
            f"Missing required environment variable: {name}. "
            f"Set it in backend/.env before using Supabase."
        )
    return value


# ---------------------------------------------------------------------------
# Service-role client (singleton)
# ---------------------------------------------------------------------------

class SupabaseClient:
    """
    Lazy singleton wrapper around the Supabase service-role client.

    The service-role key bypasses RLS and should only be used for
    server-side operations that are not scoped to a specific user
    (e.g. admin lookups, seed verification, auth administration).
    """

    _instance: "SupabaseClient | None" = None
    _client: Client | None = None

    def __new__(cls) -> "SupabaseClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _ensure_client(self) -> Client:
        """Create the client on first access."""
        if self._client is None:
            url = _require_env("SUPABASE_URL")
            service_key = _require_env("SUPABASE_SERVICE_KEY")
            self._client = create_client(url, service_key)
            log_handler.info(
                "[supabase_client] Service-role client initialized "
                f"(project: {url.split('//')[1].split('.')[0]})"
            )
        return self._client

    @property
    def client(self) -> Client:
        """The underlying ``supabase.Client`` instance."""
        return self._ensure_client()

    # Convenience passthrough ------------------------------------------------
    @property
    def table(self):
        """Shortcut for ``client.table(...)``."""
        return self.client.table

    @property
    def auth(self):
        """Shortcut for ``client.auth``."""
        return self.client.auth

    @property
    def rpc(self):
        """Shortcut for ``client.rpc(...)``."""
        return self.client.rpc


@lru_cache(maxsize=1)
def get_supabase_client() -> SupabaseClient:
    """Return the global ``SupabaseClient`` singleton."""
    return SupabaseClient()


# ---------------------------------------------------------------------------
# User-scoped client factory
# ---------------------------------------------------------------------------

def get_user_client(access_token: str) -> Client:
    """
    Create a Supabase client scoped to a specific user JWT.

    This client uses the **anon key** combined with the user's access token
    so that Supabase applies Row Level Security policies based on the
    authenticated user's identity (``auth.uid()``).

    Args:
        access_token: A valid Supabase access token (JWT) obtained from
                      ``/auth/login`` or ``/auth/refresh``.

    Returns:
        A ``supabase.Client`` with the user's JWT set in the auth headers.
    """
    url = _require_env("SUPABASE_URL")
    anon_key = _require_env("SUPABASE_ANON_KEY")
    client = create_client(url, anon_key)
    client.auth.set_session(access_token, "")
    log_handler.debug("[supabase_client] User-scoped client created")
    return client
