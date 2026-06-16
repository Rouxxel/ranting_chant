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


@lru_cache(maxsize=1)
def get_database_service() -> DatabaseService:
    """Return the global ``DatabaseService`` singleton."""
    return DatabaseService()
