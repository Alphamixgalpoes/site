from __future__ import annotations

from supabase import create_client, Client

from petrus.config import settings

_client: Client | None = None


def init_supabase() -> None:
    global _client
    _client = create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase() -> Client:
    if _client is None:
        raise RuntimeError("Supabase client not initialized. Call init_supabase() first.")
    return _client
