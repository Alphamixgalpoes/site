from __future__ import annotations

from dataclasses import fields as dc_fields
from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.lead import Lead
from petrus.domain.repositories.lead_repo import LeadRepository

_LEAD_FIELDS = {f.name for f in dc_fields(Lead)}


def _to_lead(row: dict) -> Lead:
    known = {k: v for k, v in row.items() if k in _LEAD_FIELDS}
    return Lead(**known)


class SupabaseLeadRepo(LeadRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[Lead]:
        res = self._sb.table("leads").select("*").order("created_at", desc=True).execute()
        return [_to_lead(row) for row in (res.data or [])]

    async def create(self, data: dict[str, Any]) -> Lead:
        res = self._sb.table("leads").insert(data).execute()
        return _to_lead(res.data[0])

    async def toggle_contactado(self, lead_id: UUID, current: bool) -> None:
        self._sb.table("leads").update({"contactado": not current}).eq(
            "id", str(lead_id)
        ).execute()
