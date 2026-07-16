from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class LeadRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def toggle_contactado(self, lead_id: UUID, current: bool) -> None: ...
