"""
database_service.py

Central data-access facade for the Ranting Chant backend.

Reads ``DATA_BACKEND`` from environment to decide which persistence
implementation is active:

    - ``json``     — original JSON file store (``src/utils/json_store.py``)
    - ``supabase`` — PostgreSQL via Supabase REST/SQL

The service exposes:
    - ``backend_name``  — ``"json"`` or ``"supabase"`` for health checks
    - ``is_supabase``   — boolean shorthand
    - ``supabase``      — the ``SupabaseClient`` singleton (only when active)

Future phases will add repository interfaces here; for now the service
is intentionally thin so routers can start checking the active backend
without changing their data-access code.
"""

import os
from functools import lru_cache

from src.utils.custom_logger import log_handler


# Valid backend identifiers
_VALID_BACKENDS = {"json", "supabase"}


class DatabaseService:
    """
    Lightweight facade that exposes which persistence backend is active
    and provides access to the Supabase client when the backend is
    ``supabase``.
    """

    def __init__(self) -> None:
        raw = os.getenv("DATA_BACKEND", "json").strip().lower()
        if raw not in _VALID_BACKENDS:
            log_handler.warning(
                f"[database_service] Unknown DATA_BACKEND='{raw}', "
                f"falling back to 'json'"
            )
            raw = "json"

        self._backend: str = raw
        self._supabase_client = None

        log_handler.info(
            f"[database_service] Persistence backend: {self._backend}"
        )

        # Initialize concrete repository instances
        from src.database.repositories.json_repo import (
            JSONTenantRepository,
            JSONPropertyRepository,
            JSONVendorRepository,
            JSONManagerRepository,
            JSONOwnerRepository,
            JSONRequestRepository,
        )
        from src.database.repositories.supabase_repo import (
            SupabaseTenantRepository,
            SupabasePropertyRepository,
            SupabaseVendorRepository,
            SupabaseManagerRepository,
            SupabaseOwnerRepository,
            SupabaseRequestRepository,
        )

        if self.is_supabase:
            self.tenants = SupabaseTenantRepository(self.supabase)
            self.properties = SupabasePropertyRepository(self.supabase)
            self.vendors = SupabaseVendorRepository(self.supabase)
            self.managers = SupabaseManagerRepository(self.supabase)
            self.owners = SupabaseOwnerRepository(self.supabase)
            self.requests = SupabaseRequestRepository(self.supabase)
        else:
            self.tenants = JSONTenantRepository()
            self.properties = JSONPropertyRepository()
            self.vendors = JSONVendorRepository()
            self.managers = JSONManagerRepository()
            self.owners = JSONOwnerRepository()
            self.requests = JSONRequestRepository()

    # ------------------------------------------------------------------
    # Public properties
    # ------------------------------------------------------------------

    @property
    def backend_name(self) -> str:
        """Return ``'json'`` or ``'supabase'``."""
        return self._backend

    @property
    def is_supabase(self) -> bool:
        """``True`` when the active backend is Supabase/PostgreSQL."""
        return self._backend == "supabase"

    @property
    def is_json(self) -> bool:
        """``True`` when the active backend is JSON file store."""
        return self._backend == "json"

    @property
    def supabase(self):
        """
        Return the ``SupabaseClient`` singleton.

        Lazily imported and constructed so that missing Supabase env vars
        do not crash the app when ``DATA_BACKEND=json``.

        Raises:
            RuntimeError: If called when the backend is ``json``.
        """
        if not self.is_supabase:
            raise RuntimeError(
                "Supabase client is not available when DATA_BACKEND='json'. "
                "Set DATA_BACKEND='supabase' in backend/.env to enable it."
            )
        if self._supabase_client is None:
            from src.database.supabase_client import get_supabase_client
            self._supabase_client = get_supabase_client()
        return self._supabase_client

    # ------------------------------------------------------------------
    # Health-check helper
    # ------------------------------------------------------------------

    def health_info(self) -> dict:
        """
        Return a dict suitable for the ``/`` health endpoint.

        Never exposes credentials — only the backend type and whether
        it is currently reachable.
        """
        info: dict = {
            "data_backend": self._backend,
        }

        if self.is_supabase:
            try:
                # Lightweight connectivity test: count a small table
                result = self.supabase.table("actors").select("id", count="exact").limit(1).execute()
                info["supabase_status"] = "connected"
                info["supabase_project"] = os.getenv("SUPABASE_URL", "").split("//")[1].split(".")[0] if os.getenv("SUPABASE_URL") else "unknown"
            except Exception as exc:
                info["supabase_status"] = "error"
                info["supabase_error"] = str(exc)
        else:
            info["json_store"] = "active"

        return info

    # ------------------------------------------------------------------
    # User-scoped client factory
    # ------------------------------------------------------------------

    def get_user_scoped_client(self, access_token: str, refresh_token: str | None = None):
        """
        Create a Supabase client with user authentication context for RLS.

        Uses the anon key to create a client and sets the session using both
        access_token and refresh_token so that auth.uid() resolves correctly
        in RLS policies for both RPC calls and table INSERT/UPDATE/DELETE.

        Args:
            access_token: The user's JWT access token from the auth response.
            refresh_token: The user's refresh token (optional but recommended).

        Returns:
            A supabase.Client instance configured with user context.

        Raises:
            RuntimeError: If called when the backend is ``json``.
        """
        if not self.is_supabase:
            raise RuntimeError(
                "User-scoped client is not available when DATA_BACKEND='json'. "
                "Set DATA_BACKEND='supabase' in backend/.env to enable it."
            )

        from supabase import create_client
        from src.database.supabase_client import _require_env

        url = _require_env("SUPABASE_URL")
        anon_key = _require_env("SUPABASE_ANON_KEY")

        client = create_client(url, anon_key)

        # set_session requires a real refresh_token to fully establish the
        # session so that auth.uid() resolves in ALL contexts (RPC + tables).
        # Fall back to using the access_token as a dummy refresh_token if
        # no refresh_token is provided — this is enough for single-request
        # scoped clients that never need to refresh.
        rt = refresh_token if refresh_token else access_token
        try:
            client.auth.set_session(access_token, rt)
        except Exception as e:
            log_handler.warning(f"[database_service] set_session failed: {e}")

        # Belt-and-suspenders: also set the PostgREST Authorization header
        client.postgrest.auth(access_token)

        log_handler.debug(
            f"[database_service] User-scoped client created "
            f"(token length: {len(access_token)}, has_refresh_token: {refresh_token is not None})"
        )
        return client


@lru_cache(maxsize=1)
def get_database_service() -> DatabaseService:
    """Return the global ``DatabaseService`` singleton."""
    return DatabaseService()
