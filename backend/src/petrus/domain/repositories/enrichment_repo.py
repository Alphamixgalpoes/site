from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.enrichment import EnrichmentCard, EnrichmentEvent


class EnrichmentCardRepository(ABC):
    @abstractmethod
    async def create_batch(self, cards: list[dict[str, Any]]) -> int:
        """Batch insert cards. Returns count inserted."""

    @abstractmethod
    async def delete_by_fonte(self, fonte_id: UUID) -> int:
        """Delete all cards for a fonte (for recalculation). Returns count deleted."""

    @abstractmethod
    async def get_by_id(self, card_id: UUID) -> EnrichmentCard | None: ...

    @abstractmethod
    async def list_by_status(
        self, status: str = "pendente", filters: dict | None = None,
        limit: int = 50, offset: int = 0,
    ) -> list[EnrichmentCard]: ...

    @abstractmethod
    async def count_by_status(self) -> dict[str, int]: ...

    @abstractmethod
    async def update_status(self, card_id: UUID, status: str) -> EnrichmentCard: ...


class EnrichmentEventRepository(ABC):
    @abstractmethod
    async def create(self, data: dict[str, Any]) -> EnrichmentEvent: ...

    @abstractmethod
    async def get_by_card(self, card_id: UUID) -> list[EnrichmentEvent]:
        """All events for a card, ordered by created_at."""

    @abstractmethod
    async def mark_undone(self, event_id: UUID) -> None: ...

    @abstractmethod
    async def delete_by_card(self, card_id: UUID) -> int:
        """Delete all events for a card (for discard)."""
