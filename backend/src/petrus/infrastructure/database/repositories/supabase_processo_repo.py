from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.repositories.processo_repo import ProcessoRepository


class SupabaseProcessoRepo(ProcessoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[dict[str, Any]]:
        res = self._sb.table("processos").select("*").order("created_at", desc=True).execute()
        return res.data or []

    async def get_by_id(self, processo_id: UUID) -> dict[str, Any] | None:
        res = (
            self._sb.table("processos")
            .select("*, proprietario:contatos!processos_proprietario_id_fkey(id, nome, tipo_principal), cliente:contatos!processos_cliente_id_fkey(id, nome, tipo_principal)")
            .eq("id", str(processo_id))
            .maybe_single()
            .execute()
        )
        return res.data

    async def create(self, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("processos").insert(data).execute()
        return res.data[0]

    async def update(self, processo_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        res = (
            self._sb.table("processos")
            .update(data)
            .eq("id", str(processo_id))
            .execute()
        )
        return res.data[0]

    async def delete(self, processo_id: UUID) -> None:
        self._sb.table("processos").delete().eq("id", str(processo_id)).execute()

    # Items
    async def list_items(self, processo_id: UUID) -> list[dict[str, Any]]:
        res = (
            self._sb.table("processo_itens")
            .select("*")
            .eq("processo_id", str(processo_id))
            .order("ordem")
            .execute()
        )
        return res.data or []

    async def create_item(self, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("processo_itens").insert(data).execute()
        return res.data[0]

    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        res = (
            self._sb.table("processo_itens")
            .update(data)
            .eq("id", str(item_id))
            .execute()
        )
        return res.data[0]

    async def delete_item(self, item_id: UUID) -> None:
        self._sb.table("processo_itens").delete().eq("id", str(item_id)).execute()

    async def reorder_items(self, items: list[dict[str, Any]]) -> None:
        for item in items:
            self._sb.table("processo_itens").update({"ordem": item["ordem"]}).eq(
                "id", item["id"]
            ).execute()

    # Categories
    async def list_categories(self, processo_id: UUID) -> list[dict[str, Any]]:
        res = (
            self._sb.table("processo_categorias")
            .select("*")
            .eq("processo_id", str(processo_id))
            .order("ordem")
            .execute()
        )
        return res.data or []

    async def create_categories(self, categories: list[dict[str, Any]]) -> None:
        if categories:
            self._sb.table("processo_categorias").insert(categories).execute()

    async def reorder_categories(self, categories: list[dict[str, Any]]) -> None:
        for cat in categories:
            self._sb.table("processo_categorias").update({"ordem": cat["ordem"]}).eq(
                "id", cat["id"]
            ).execute()

    # Contacts
    async def list_contacts(self, processo_id: UUID) -> list[dict[str, Any]]:
        res = (
            self._sb.table("processo_contatos")
            .select("id, contato_id, papel, contatos(id, nome, tipo_principal)")
            .eq("processo_id", str(processo_id))
            .execute()
        )
        return res.data or []

    async def link_contact(
        self, processo_id: UUID, contato_id: UUID, papel: str
    ) -> dict[str, Any]:
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
        return full.data or link

    async def unlink_contact(self, link_id: UUID) -> None:
        self._sb.table("processo_contatos").delete().eq("id", str(link_id)).execute()

    # Galpao
    async def link_galpao(self, processo_id: UUID, galpao_id: UUID) -> None:
        self._sb.table("processos").update({"galpao_id": str(galpao_id)}).eq(
            "id", str(processo_id)
        ).execute()

    async def unlink_galpao(self, processo_id: UUID) -> None:
        self._sb.table("processos").update({"galpao_id": None}).eq(
            "id", str(processo_id)
        ).execute()

    # Templates
    async def get_type_template(self, tipo_slug: str) -> dict[str, Any] | None:
        res = (
            self._sb.table("processo_tipos")
            .select("id, processo_tipo_categorias(id, slug, label, ordem, processo_tipo_itens(titulo, descricao, ordem))")
            .eq("slug", tipo_slug)
            .maybe_single()
            .execute()
        )
        return res.data
