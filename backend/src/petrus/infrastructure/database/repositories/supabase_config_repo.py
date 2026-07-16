from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.repositories.config_repo import ConfigRepository


class SupabaseConfigRepo(ConfigRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_campos(self) -> list[dict[str, Any]]:
        res = self._sb.table("config_campos").select("*").order("label").execute()
        return res.data or []

    async def upsert_campos(self, campos: list[dict[str, Any]]) -> None:
        self._sb.table("config_campos").upsert(campos).execute()

    async def list_tipos(self) -> list[dict[str, Any]]:
        res = (
            self._sb.table("processo_tipos")
            .select("id, slug, label, descricao, ativo, ordem")
            .order("ordem")
            .execute()
        )
        return res.data or []

    async def list_tipos_full(self) -> list[dict[str, Any]]:
        res = (
            self._sb.table("processo_tipos")
            .select("*, processo_tipo_categorias(*, processo_tipo_itens(*))")
            .order("ordem")
            .execute()
        )
        return res.data or []

    async def get_tipo_with_template(self, tipo_id: UUID) -> dict[str, Any] | None:
        res = (
            self._sb.table("processo_tipos")
            .select("*, processo_tipo_categorias(*, processo_tipo_itens(*))")
            .eq("id", str(tipo_id))
            .maybe_single()
            .execute()
        )
        return res.data

    async def create_tipo(self, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("processo_tipos").insert(data).execute()
        return res.data[0]

    async def update_tipo(self, tipo_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("processo_tipos").update(data).eq("id", str(tipo_id)).execute()
        return res.data[0]

    async def delete_tipo(self, tipo_id: UUID) -> None:
        self._sb.table("processo_tipos").delete().eq("id", str(tipo_id)).execute()

    async def create_categoria(self, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("processo_tipo_categorias").insert(data).execute()
        return res.data[0]

    async def update_categoria(self, cat_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("processo_tipo_categorias").update(data).eq("id", str(cat_id)).execute()
        return res.data[0]

    async def delete_categoria(self, cat_id: UUID) -> None:
        self._sb.table("processo_tipo_categorias").delete().eq("id", str(cat_id)).execute()

    async def create_item(self, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("processo_tipo_itens").insert(data).execute()
        return res.data[0]

    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("processo_tipo_itens").update(data).eq("id", str(item_id)).execute()
        return res.data[0]

    async def delete_item(self, item_id: UUID) -> None:
        self._sb.table("processo_tipo_itens").delete().eq("id", str(item_id)).execute()
