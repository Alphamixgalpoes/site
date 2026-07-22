from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.publicacao import ImovelPublicacao
from petrus.domain.repositories.publicacao_repo import PublicacaoRepository


def _to_pub(row: dict) -> ImovelPublicacao:
    return ImovelPublicacao(
        imovel_id=row["imovel_id"],
        titulo=row.get("titulo"),
        descricao=row.get("descricao"),
        slug=row.get("slug"),
        destaque=row.get("destaque", False),
        ativo=row.get("ativo", True),
        ordem_fotos=row.get("ordem_fotos"),
        seo_title=row.get("seo_title"),
        seo_description=row.get("seo_description"),
        published_at=row.get("published_at"),
        updated_at=row.get("updated_at"),
    )


class SupabasePublicacaoRepo(PublicacaoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create(self, imovel_id: UUID, data: dict[str, Any]) -> ImovelPublicacao:
        payload = {"imovel_id": str(imovel_id), **data}
        res = self._sb.table("imovel_publicacao").insert(payload).execute()
        self._sb.table("imoveis").update({"publicado": True}).eq("id", str(imovel_id)).execute()
        return _to_pub(res.data[0])

    async def get_by_imovel(self, imovel_id: UUID) -> ImovelPublicacao | None:
        res = (
            self._sb.table("imovel_publicacao")
            .select("*")
            .eq("imovel_id", str(imovel_id))
            .maybe_single()
            .execute()
        )
        return _to_pub(res.data) if res.data else None

    async def update(self, imovel_id: UUID, data: dict[str, Any]) -> ImovelPublicacao:
        res = (
            self._sb.table("imovel_publicacao")
            .update(data)
            .eq("imovel_id", str(imovel_id))
            .execute()
        )
        return _to_pub(res.data[0])

    async def delete(self, imovel_id: UUID) -> None:
        self._sb.table("imovel_publicacao").delete().eq("imovel_id", str(imovel_id)).execute()
        self._sb.table("imoveis").update({"publicado": False}).eq("id", str(imovel_id)).execute()

    async def list_ativos(self) -> list[ImovelPublicacao]:
        res = (
            self._sb.table("imovel_publicacao")
            .select("*")
            .eq("ativo", True)
            .order("published_at", desc=True)
            .execute()
        )
        return [_to_pub(row) for row in (res.data or [])]

    async def get_by_slug(self, slug: str) -> ImovelPublicacao | None:
        res = (
            self._sb.table("imovel_publicacao")
            .select("*")
            .eq("slug", slug)
            .maybe_single()
            .execute()
        )
        return _to_pub(res.data) if res.data else None
