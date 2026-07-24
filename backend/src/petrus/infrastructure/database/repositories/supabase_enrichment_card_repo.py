from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.enrichment import EnrichmentCard
from petrus.domain.repositories.enrichment_repo import EnrichmentCardRepository

TABLE = "enrichment_cards"


def _to_card(row: dict) -> EnrichmentCard:
    return EnrichmentCard(
        id=row["id"],
        fonte_id=row["fonte_id"],
        fonte_registro_id=row["fonte_registro_id"],
        registro_snapshot=row.get("registro_snapshot", {}),
        similares=row.get("similares", []),
        status=row.get("status", "pendente"),
        cidade=row.get("cidade"),
        bairro=row.get("bairro"),
        logradouro=row.get("logradouro"),
        area=row.get("area"),
        score_max=row.get("score_max"),
        finalizado_em=row.get("finalizado_em"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


class SupabaseEnrichmentCardRepo(EnrichmentCardRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create_batch(self, cards: list[dict[str, Any]]) -> int:
        if not cards:
            return 0
        # Supabase supports batch insert natively
        res = self._sb.table(TABLE).insert(cards).execute()
        return len(res.data or [])

    async def delete_by_fonte(self, fonte_id: UUID) -> int:
        # CASCADE deletes events too
        res = (
            self._sb.table(TABLE)
            .delete()
            .eq("fonte_id", str(fonte_id))
            .in_("status", ["pendente", "em_andamento"])
            .execute()
        )
        return len(res.data or [])

    async def get_by_id(self, card_id: UUID) -> EnrichmentCard | None:
        res = (
            self._sb.table(TABLE)
            .select("*")
            .eq("id", str(card_id))
            .maybe_single()
            .execute()
        )
        return _to_card(res.data) if res.data else None

    async def list_by_status(
        self, status: str = "pendente", filters: dict | None = None,
        limit: int = 50, offset: int = 0,
    ) -> list[EnrichmentCard]:
        q = self._sb.table(TABLE).select("*").eq("status", status)
        if filters:
            if filters.get("cidade"):
                q = q.eq("cidade", filters["cidade"])
            if filters.get("fonte_id"):
                q = q.eq("fonte_id", filters["fonte_id"])
            if filters.get("score_min"):
                q = q.gte("score_max", filters["score_min"])
        q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
        res = q.execute()
        return [_to_card(row) for row in (res.data or [])]

    async def count_by_status(self) -> dict[str, int]:
        res = self._sb.table(TABLE).select("status").execute()
        counts: dict[str, int] = {}
        for row in (res.data or []):
            s = row["status"]
            counts[s] = counts.get(s, 0) + 1
        return counts

    async def update_status(self, card_id: UUID, status: str) -> EnrichmentCard:
        update: dict[str, Any] = {"status": status}
        if status == "concluido":
            update["finalizado_em"] = "now()"
        res = (
            self._sb.table(TABLE)
            .update(update)
            .eq("id", str(card_id))
            .execute()
        )
        return _to_card(res.data[0])
