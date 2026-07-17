from __future__ import annotations

from dataclasses import fields as dc_fields
from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.config_campo import ConfigCampo
from petrus.domain.entities.processo import (
    ProcessoTipo,
    ProcessoTipoCategoria,
    ProcessoTipoItem,
)
from petrus.domain.repositories.config_repo import ConfigRepository

_CAMPO_FIELDS = {f.name for f in dc_fields(ConfigCampo)}
_TIPO_FIELDS = {f.name for f in dc_fields(ProcessoTipo)}
_CAT_FIELDS = {f.name for f in dc_fields(ProcessoTipoCategoria)}
_ITEM_FIELDS = {f.name for f in dc_fields(ProcessoTipoItem)}


def _to_campo(row: dict) -> ConfigCampo:
    known = {k: v for k, v in row.items() if k in _CAMPO_FIELDS}
    return ConfigCampo(**known)


def _to_tipo(row: dict) -> ProcessoTipo:
    row = dict(row)
    cats_data = row.pop("processo_tipo_categorias", []) or []
    categorias = []
    for cat in cats_data:
        cat = dict(cat)
        itens_data = cat.pop("processo_tipo_itens", []) or []
        itens = [ProcessoTipoItem(**{k: v for k, v in item.items() if k in _ITEM_FIELDS}) for item in itens_data]
        cat_known = {k: v for k, v in cat.items() if k in _CAT_FIELDS}
        categorias.append(ProcessoTipoCategoria(**cat_known, processo_tipo_itens=itens))
    known = {k: v for k, v in row.items() if k in _TIPO_FIELDS}
    return ProcessoTipo(**known, processo_tipo_categorias=categorias)


def _to_cat(row: dict) -> ProcessoTipoCategoria:
    row = dict(row)
    itens_data = row.pop("processo_tipo_itens", []) or []
    itens = [ProcessoTipoItem(**{k: v for k, v in item.items() if k in _ITEM_FIELDS}) for item in itens_data]
    known = {k: v for k, v in row.items() if k in _CAT_FIELDS}
    return ProcessoTipoCategoria(**known, processo_tipo_itens=itens)


def _to_item(row: dict) -> ProcessoTipoItem:
    known = {k: v for k, v in row.items() if k in _ITEM_FIELDS}
    return ProcessoTipoItem(**known)


class SupabaseConfigRepo(ConfigRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_campos(self) -> list[ConfigCampo]:
        res = self._sb.table("config_campos").select("*").order("label").execute()
        return [_to_campo(row) for row in (res.data or [])]

    async def upsert_campos(self, campos: list[dict[str, Any]]) -> None:
        self._sb.table("config_campos").upsert(campos).execute()

    async def list_tipos(self) -> list[ProcessoTipo]:
        res = (
            self._sb.table("processo_tipos")
            .select("id, slug, label, descricao, ativo, ordem")
            .order("ordem")
            .execute()
        )
        return [_to_tipo(row) for row in (res.data or [])]

    async def list_tipos_full(self) -> list[ProcessoTipo]:
        res = (
            self._sb.table("processo_tipos")
            .select("*, processo_tipo_categorias(*, processo_tipo_itens(*))")
            .order("ordem")
            .execute()
        )
        return [_to_tipo(row) for row in (res.data or [])]

    async def get_tipo_with_template(self, tipo_id: UUID) -> ProcessoTipo | None:
        res = (
            self._sb.table("processo_tipos")
            .select("*, processo_tipo_categorias(*, processo_tipo_itens(*))")
            .eq("id", str(tipo_id))
            .maybe_single()
            .execute()
        )
        return _to_tipo(res.data) if res.data else None

    async def create_tipo(self, data: dict[str, Any]) -> ProcessoTipo:
        res = self._sb.table("processo_tipos").insert(data).execute()
        return _to_tipo(res.data[0])

    async def update_tipo(self, tipo_id: UUID, data: dict[str, Any]) -> ProcessoTipo:
        res = self._sb.table("processo_tipos").update(data).eq("id", str(tipo_id)).execute()
        return _to_tipo(res.data[0])

    async def delete_tipo(self, tipo_id: UUID) -> None:
        self._sb.table("processo_tipos").delete().eq("id", str(tipo_id)).execute()

    async def create_categoria(self, data: dict[str, Any]) -> ProcessoTipoCategoria:
        res = self._sb.table("processo_tipo_categorias").insert(data).execute()
        return _to_cat(res.data[0])

    async def update_categoria(self, cat_id: UUID, data: dict[str, Any]) -> ProcessoTipoCategoria:
        res = self._sb.table("processo_tipo_categorias").update(data).eq("id", str(cat_id)).execute()
        return _to_cat(res.data[0])

    async def delete_categoria(self, cat_id: UUID) -> None:
        self._sb.table("processo_tipo_categorias").delete().eq("id", str(cat_id)).execute()

    async def create_item(self, data: dict[str, Any]) -> ProcessoTipoItem:
        res = self._sb.table("processo_tipo_itens").insert(data).execute()
        return _to_item(res.data[0])

    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> ProcessoTipoItem:
        res = self._sb.table("processo_tipo_itens").update(data).eq("id", str(item_id)).execute()
        return _to_item(res.data[0])

    async def delete_item(self, item_id: UUID) -> None:
        self._sb.table("processo_tipo_itens").delete().eq("id", str(item_id)).execute()
