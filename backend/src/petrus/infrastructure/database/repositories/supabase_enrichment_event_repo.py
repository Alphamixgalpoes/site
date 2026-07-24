from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.enrichment import EnrichmentEvent
from petrus.domain.repositories.enrichment_repo import EnrichmentEventRepository

TABLE = "enrichment_events"


def _to_event(row: dict) -> EnrichmentEvent:
    return EnrichmentEvent(
        id=row["id"],
        card_id=row["card_id"],
        tipo=row["tipo"],
        campo=row["campo"],
        valor_anterior=row.get("valor_anterior"),
        valor_novo=row["valor_novo"],
        origem_tipo=row.get("origem_tipo", "manual"),
        origem_id=row.get("origem_id"),
        destino_tipo=row["destino_tipo"],
        destino_id=row["destino_id"],
        undone=row.get("undone", False),
        created_at=row.get("created_at"),
    )


class SupabaseEnrichmentEventRepo(EnrichmentEventRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create(self, data: dict[str, Any]) -> EnrichmentEvent:
        res = self._sb.table(TABLE).insert(data).execute()
        return _to_event(res.data[0])

    async def get_by_card(self, card_id: UUID) -> list[EnrichmentEvent]:
        res = (
            self._sb.table(TABLE)
            .select("*")
            .eq("card_id", str(card_id))
            .order("created_at")
            .execute()
        )
        return [_to_event(row) for row in (res.data or [])]

    async def mark_undone(self, event_id: UUID) -> None:
        self._sb.table(TABLE).update({"undone": True}).eq("id", str(event_id)).execute()

    async def delete_by_card(self, card_id: UUID) -> int:
        res = (
            self._sb.table(TABLE)
            .delete()
            .eq("card_id", str(card_id))
            .execute()
        )
        return len(res.data or [])
