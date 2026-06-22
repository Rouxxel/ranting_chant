"""
Database module for Supabase integration.

Exports are lazily resolved so the application does not crash on import
when ``DATA_BACKEND=json`` and Supabase environment variables are absent.

Usage:
    from src.database import get_database_service
    db = get_database_service()
    if db.is_supabase:
        client = db.supabase
"""

from .database_service import get_database_service, DatabaseService

# SupabaseClient and get_supabase_client are intentionally NOT imported
# at module level to avoid crashing when Supabase env vars are missing.
# Import them explicitly when needed:
#
#     from src.database.supabase_client import get_supabase_client

__all__ = [
    "get_database_service",
    "DatabaseService",
]
