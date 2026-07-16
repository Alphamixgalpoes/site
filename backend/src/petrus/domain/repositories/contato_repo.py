from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class ContatoRepository(ABC):
    @abstractmethod
    async def list_active(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def get_by_id(self, contato_id: UUID) -> dict[str, Any] | None: ...

    @abstractmethod
    async def search(self, term: str) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def update(self, contato_id: UUID, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def soft_delete(self, contato_id: UUID) -> None: ...

    @abstractmethod
    async def get_relationships(self, contato_id: UUID) -> dict[str, Any]: ...
