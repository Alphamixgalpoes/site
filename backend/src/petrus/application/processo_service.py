from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.processo import (
    Processo,
    ProcessoCategoria,
    ProcessoContato,
    ProcessoItem,
)
from petrus.domain.repositories.processo_repo import ProcessoRepository


class ProcessoAppService:
    def __init__(self, repo: ProcessoRepository) -> None:
        self._repo = repo

    # --- Processos CRUD ---

    async def list_all(self) -> list[Processo]:
        return await self._repo.list_all()

    async def get(self, processo_id: UUID) -> Processo | None:
        return await self._repo.get_by_id(processo_id)

    async def create_with_template(
        self, data: dict[str, Any], tipo_slug: str
    ) -> Processo:
        proc = await self._repo.create(data)
        proc_id = str(proc.id)

        template = await self._repo.get_type_template(tipo_slug)
        if not template or not template.processo_tipo_categorias:
            return proc

        categorias = sorted(
            template.processo_tipo_categorias, key=lambda c: c.ordem
        )

        await self._repo.create_categories(
            [
                {
                    "processo_id": proc_id,
                    "slug": c.slug,
                    "label": c.label,
                    "ordem": c.ordem,
                }
                for c in categorias
            ]
        )

        itens = []
        for cat in categorias:
            for item in cat.processo_tipo_itens:
                itens.append(
                    {
                        "processo_id": proc_id,
                        "categoria": cat.slug,
                        "titulo": item.titulo,
                        "descricao": item.descricao,
                        "ordem": item.ordem,
                    }
                )

        if itens:
            for item in itens:
                await self._repo.create_item(item)

        return proc

    async def update(self, processo_id: UUID, data: dict[str, Any]) -> Processo:
        return await self._repo.update(processo_id, data)

    async def delete(self, processo_id: UUID) -> None:
        await self._repo.delete(processo_id)

    # --- Items ---

    async def list_items(self, processo_id: UUID) -> list[ProcessoItem]:
        return await self._repo.list_items(processo_id)

    async def create_item(self, processo_id: UUID, data: dict[str, Any]) -> ProcessoItem:
        data["processo_id"] = str(processo_id)
        return await self._repo.create_item(data)

    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> ProcessoItem:
        return await self._repo.update_item(item_id, data)

    async def delete_item(self, item_id: UUID) -> None:
        await self._repo.delete_item(item_id)

    async def reorder_items(self, items: list[dict[str, Any]]) -> None:
        await self._repo.reorder_items(items)

    # --- Categories ---

    async def list_categories(self, processo_id: UUID) -> list[ProcessoCategoria]:
        return await self._repo.list_categories(processo_id)

    async def reorder_categories(self, categories: list[dict[str, Any]]) -> None:
        await self._repo.reorder_categories(categories)

    # --- Contacts ---

    async def list_contacts(self, processo_id: UUID) -> list[ProcessoContato]:
        return await self._repo.list_contacts(processo_id)

    async def link_contact(self, processo_id: UUID, contato_id: UUID, papel: str) -> ProcessoContato:
        return await self._repo.link_contact(processo_id, contato_id, papel)

    async def unlink_contact(self, link_id: UUID) -> None:
        await self._repo.unlink_contact(link_id)

    # --- Galpao link ---

    async def link_galpao(self, processo_id: UUID, galpao_id: UUID) -> None:
        await self._repo.link_galpao(processo_id, galpao_id)

    async def unlink_galpao(self, processo_id: UUID) -> None:
        await self._repo.unlink_galpao(processo_id)
