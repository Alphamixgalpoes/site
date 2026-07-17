from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.config_campo import ConfigCampo
from petrus.domain.entities.processo import ProcessoTipo, ProcessoTipoCategoria, ProcessoTipoItem
from petrus.domain.repositories.config_repo import ConfigRepository


class ConfigService:
    def __init__(self, repo: ConfigRepository) -> None:
        self._repo = repo

    # --- Campos ---

    async def list_campos(self) -> list[ConfigCampo]:
        return await self._repo.list_campos()

    async def upsert_campos(self, campos: list[dict[str, Any]]) -> None:
        await self._repo.upsert_campos(campos)

    # --- Tipos ---

    async def list_tipos(self, full: bool = False) -> list[ProcessoTipo]:
        if full:
            return await self._repo.list_tipos_full()
        return await self._repo.list_tipos()

    async def get_tipo(self, tipo_id: UUID) -> ProcessoTipo | None:
        return await self._repo.get_tipo_with_template(tipo_id)

    async def create_tipo(self, data: dict[str, Any]) -> ProcessoTipo:
        return await self._repo.create_tipo(data)

    async def update_tipo(self, tipo_id: UUID, data: dict[str, Any]) -> ProcessoTipo:
        return await self._repo.update_tipo(tipo_id, data)

    async def delete_tipo(self, tipo_id: UUID) -> None:
        await self._repo.delete_tipo(tipo_id)

    # --- Categorias ---

    async def create_categoria(self, tipo_id: UUID, data: dict[str, Any]) -> ProcessoTipoCategoria:
        data["tipo_id"] = str(tipo_id)
        return await self._repo.create_categoria(data)

    async def update_categoria(self, cat_id: UUID, data: dict[str, Any]) -> ProcessoTipoCategoria:
        return await self._repo.update_categoria(cat_id, data)

    async def delete_categoria(self, cat_id: UUID) -> None:
        await self._repo.delete_categoria(cat_id)

    # --- Itens ---

    async def create_item(self, cat_id: UUID, data: dict[str, Any]) -> ProcessoTipoItem:
        data["categoria_id"] = str(cat_id)
        return await self._repo.create_item(data)

    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> ProcessoTipoItem:
        return await self._repo.update_item(item_id, data)

    async def delete_item(self, item_id: UUID) -> None:
        await self._repo.delete_item(item_id)
