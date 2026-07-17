from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.lead import Lead


class LeadRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[Lead]: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> Lead: ...

    @abstractmethod
    async def toggle_contactado(self, lead_id: UUID, current: bool) -> None: ...
