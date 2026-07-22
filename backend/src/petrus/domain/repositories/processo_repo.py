from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.processo import (
    Processo,
    ProcessoCategoria,
    ProcessoContato,
    ProcessoItem,
    ProcessoTipo,
)


class ProcessoRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[Processo]: ...

    @abstractmethod
    async def get_by_id(self, processo_id: UUID) -> Processo | None: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> Processo: ...

    @abstractmethod
    async def update(self, processo_id: UUID, data: dict[str, Any]) -> Processo: ...

    @abstractmethod
    async def delete(self, processo_id: UUID) -> None: ...

    # Items
    @abstractmethod
    async def list_items(self, processo_id: UUID) -> list[ProcessoItem]: ...

    @abstractmethod
    async def create_item(self, data: dict[str, Any]) -> ProcessoItem: ...

    @abstractmethod
    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> ProcessoItem: ...

    @abstractmethod
    async def delete_item(self, item_id: UUID) -> None: ...

    @abstractmethod
    async def reorder_items(self, items: list[dict[str, Any]]) -> None: ...

    # Categories
    @abstractmethod
    async def list_categories(self, processo_id: UUID) -> list[ProcessoCategoria]: ...

    @abstractmethod
    async def create_categories(self, categories: list[dict[str, Any]]) -> None: ...

    @abstractmethod
    async def reorder_categories(self, categories: list[dict[str, Any]]) -> None: ...

    # Contacts
    @abstractmethod
    async def list_contacts(self, processo_id: UUID) -> list[ProcessoContato]: ...

    @abstractmethod
    async def link_contact(
        self, processo_id: UUID, contato_id: UUID, papel: str
    ) -> ProcessoContato: ...

    @abstractmethod
    async def unlink_contact(self, link_id: UUID) -> None: ...

    # Imovel
    @abstractmethod
    async def link_imovel(self, processo_id: UUID, imovel_id: UUID) -> None: ...

    @abstractmethod
    async def unlink_imovel(self, processo_id: UUID) -> None: ...

    # Templates
    @abstractmethod
    async def get_type_template(self, tipo_slug: str) -> ProcessoTipo | None: ...
