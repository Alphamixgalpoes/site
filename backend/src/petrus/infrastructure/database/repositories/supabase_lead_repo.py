from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.repositories.lead_repo import LeadRepository


class SupabaseLeadRepo(LeadRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[dict[str, Any]]:
        res = self._sb.table("leads").select("*").order("created_at", desc=True).execute()
        return res.data or []

    async def create(self, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("leads").insert(data).execute()
        return res.data[0]

    async def toggle_contactado(self, lead_id: UUID, current: bool) -> None:
        self._sb.table("leads").update({"contactado": not current}).eq(
            "id", str(lead_id)
        ).execute()
