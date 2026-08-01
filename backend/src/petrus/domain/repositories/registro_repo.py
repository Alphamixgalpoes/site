from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.registro import Registro


class RegistroRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[Registro]: ...

    @abstractmethod
    async def get_by_id(self, registro_id: UUID) -> Registro | None: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> Registro: ...

    @abstractmethod
    async def create_arquivo(self, data: dict[str, Any]) -> dict: ...

    @abstractmethod
    async def update(self, registro_id: UUID, data: dict[str, Any]) -> None: ...

    @abstractmethod
    async def delete(self, registro_id: UUID) -> None: ...

    @abstractmethod
    async def list_arquivos(self, registro_id: UUID) -> list[dict]: ...
