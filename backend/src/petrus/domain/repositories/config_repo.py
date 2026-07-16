from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class ConfigRepository(ABC):
    @abstractmethod
    async def list_campos(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def upsert_campos(self, campos: list[dict[str, Any]]) -> None: ...

    @abstractmethod
    async def list_tipos(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def get_tipo_with_template(self, tipo_id: UUID) -> dict[str, Any] | None: ...

    @abstractmethod
    async def create_tipo(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def update_tipo(self, tipo_id: UUID, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def delete_tipo(self, tipo_id: UUID) -> None: ...

    # Categorias
    @abstractmethod
    async def create_categoria(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def update_categoria(self, cat_id: UUID, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def delete_categoria(self, cat_id: UUID) -> None: ...

    # Itens
    @abstractmethod
    async def create_item(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def delete_item(self, item_id: UUID) -> None: ...
