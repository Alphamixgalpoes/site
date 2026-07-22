from __future__ import annotations

from dataclasses import fields as dc_fields
from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.contato import ContatoResumido
from petrus.domain.entities.processo import (
    Processo,
    ProcessoCategoria,
    ProcessoContato,
    ProcessoItem,
    ProcessoTipo,
    ProcessoTipoCategoria,
    ProcessoTipoItem,
)
from petrus.domain.repositories.processo_repo import ProcessoRepository

_PROCESSO_FIELDS = {f.name for f in dc_fields(Processo)}
_ITEM_FIELDS = {f.name for f in dc_fields(ProcessoItem)}
_CATEGORIA_FIELDS = {f.name for f in dc_fields(ProcessoCategoria)}


def _to_processo(row: dict, with_joins: bool = False) -> Processo:
    row = dict(row)
    prop_data = row.pop("proprietario", None) if with_joins else None
    cli_data = row.pop("cliente", None) if with_joins else None

    proprietario = ContatoResumido(**prop_data) if prop_data else None
    cliente = ContatoResumido(**cli_data) if cli_data else None

    known = {k: v for k, v in row.items() if k in _PROCESSO_FIELDS}
    return Processo(**known, proprietario=proprietario, cliente=cliente)


def _to_item(row: dict) -> ProcessoItem:
    known = {k: v for k, v in row.items() if k in _ITEM_FIELDS}
    return ProcessoItem(**known)


def _to_categoria(row: dict) -> ProcessoCategoria:
    known = {k: v for k, v in row.items() if k in _CATEGORIA_FIELDS}
    return ProcessoCategoria(**known)


def _to_contato(row: dict) -> ProcessoContato:
    contato = row.get("contatos") or {}
    return ProcessoContato(
        id=row["id"],
        contato_id=row["contato_id"],
        papel=row["papel"],
        processo_id=row.get("processo_id"),
        nome=contato.get("nome", ""),
        tipo_principal=contato.get("tipo_principal", ""),
    )


def _to_tipo(row: dict) -> ProcessoTipo:
    row = dict(row)
    cats_data = row.pop("processo_tipo_categorias", []) or []
    categorias = []
    for cat in cats_data:
        cat = dict(cat)
        itens_data = cat.pop("processo_tipo_itens", []) or []
        itens = [ProcessoTipoItem(**item) for item in itens_data]
        categorias.append(ProcessoTipoCategoria(**cat, processo_tipo_itens=itens))
    known = {k: v for k, v in row.items() if k in {f.name for f in dc_fields(ProcessoTipo)}}
    return ProcessoTipo(**known, processo_tipo_categorias=categorias)


class SupabaseProcessoRepo(ProcessoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[Processo]:
        res = self._sb.table("processos").select("*").order("created_at", desc=True).execute()
        return [_to_processo(row) for row in (res.data or [])]

    async def get_by_id(self, processo_id: UUID) -> Processo | None:
        res = (
            self._sb.table("processos")
            .select("*, proprietario:contatos!processos_proprietario_id_fkey(id, nome, empresa, tipo_principal), cliente:contatos!processos_cliente_id_fkey(id, nome, empresa, tipo_principal)")
            .eq("id", str(processo_id))
            .maybe_single()
            .execute()
        )
        return _to_processo(res.data, with_joins=True) if res.data else None

    async def create(self, data: dict[str, Any]) -> Processo:
        res = self._sb.table("processos").insert(data).execute()
        return _to_processo(res.data[0])

    async def update(self, processo_id: UUID, data: dict[str, Any]) -> Processo:
        res = (
            self._sb.table("processos")
            .update(data)
            .eq("id", str(processo_id))
            .execute()
        )
        return _to_processo(res.data[0])

    async def delete(self, processo_id: UUID) -> None:
        self._sb.table("processos").delete().eq("id", str(processo_id)).execute()

    # Items
    async def list_items(self, processo_id: UUID) -> list[ProcessoItem]:
        res = (
            self._sb.table("processo_itens")
            .select("*")
            .eq("processo_id", str(processo_id))
            .order("ordem")
            .execute()
        )
        return [_to_item(row) for row in (res.data or [])]

    async def create_item(self, data: dict[str, Any]) -> ProcessoItem:
        res = self._sb.table("processo_itens").insert(data).execute()
        return _to_item(res.data[0])

    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> ProcessoItem:
        res = (
            self._sb.table("processo_itens")
            .update(data)
            .eq("id", str(item_id))
            .execute()
        )
        return _to_item(res.data[0])

    async def delete_item(self, item_id: UUID) -> None:
        self._sb.table("processo_itens").delete().eq("id", str(item_id)).execute()

    async def reorder_items(self, items: list[dict[str, Any]]) -> None:
        for item in items:
            self._sb.table("processo_itens").update({"ordem": item["ordem"]}).eq(
                "id", item["id"]
            ).execute()

    # Categories
    async def list_categories(self, processo_id: UUID) -> list[ProcessoCategoria]:
        res = (
            self._sb.table("processo_categorias")
            .select("*")
            .eq("processo_id", str(processo_id))
            .order("ordem")
            .execute()
        )
        return [_to_categoria(row) for row in (res.data or [])]

    async def create_categories(self, categories: list[dict[str, Any]]) -> None:
        if categories:
            self._sb.table("processo_categorias").insert(categories).execute()

    async def reorder_categories(self, categories: list[dict[str, Any]]) -> None:
        for cat in categories:
            self._sb.table("processo_categorias").update({"ordem": cat["ordem"]}).eq(
                "id", cat["id"]
            ).execute()

    # Contacts
    async def list_contacts(self, processo_id: UUID) -> list[ProcessoContato]:
        res = (
            self._sb.table("processo_contatos")
            .select("id, contato_id, papel, contatos(id, nome, tipo_principal)")
            .eq("processo_id", str(processo_id))
            .execute()
        )
        return [_to_contato(row) for row in (res.data or [])]

    async def link_contact(
        self, processo_id: UUID, contato_id: UUID, papel: str
    ) -> ProcessoContato:
        res = (
            self._sb.table("processo_contatos")
            .insert(
                {
                    "processo_id": str(processo_id),
                    "contato_id": str(contato_id),
                    "papel": papel,
                }
            )
            .execute()
        )
        # Re-fetch with joins to get contato data
        link = res.data[0]
        full = (
            self._sb.table("processo_contatos")
            .select("id, contato_id, papel, contatos(id, nome, tipo_principal)")
            .eq("id", link["id"])
            .maybe_single()
            .execute()
        )
        return _to_contato(full.data or link)

    async def unlink_contact(self, link_id: UUID) -> None:
        self._sb.table("processo_contatos").delete().eq("id", str(link_id)).execute()

    # Imovel
    async def link_imovel(self, processo_id: UUID, imovel_id: UUID) -> None:
        self._sb.table("processos").update({"imovel_id": str(imovel_id)}).eq(
            "id", str(processo_id)
        ).execute()

    async def unlink_imovel(self, processo_id: UUID) -> None:
        self._sb.table("processos").update({"imovel_id": None}).eq(
            "id", str(processo_id)
        ).execute()

    # Templates
    async def get_type_template(self, tipo_slug: str) -> ProcessoTipo | None:
        res = (
            self._sb.table("processo_tipos")
            .select("id, slug, label, processo_tipo_categorias(id, tipo_id, slug, label, ordem, processo_tipo_itens(id, categoria_id, titulo, descricao, ordem))")
            .eq("slug", tipo_slug)
            .maybe_single()
            .execute()
        )
        return _to_tipo(res.data) if res.data else None
