"""Ports for scraping observability repositories."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.scraping import RequestLog


class RequestLogRepository(ABC):
    """Port: persistence for HTTP request logs."""

    @abstractmethod
    async def create_batch(self, logs: list[dict[str, Any]]) -> int:
        """Insert multiple request logs. Returns count inserted."""
        ...

    @abstractmethod
    async def get_by_run(self, run_id: UUID) -> list[RequestLog]:
        """Get all request logs for a run, ordered by created_at."""
        ...

    @abstractmethod
    async def count_by_run(self, run_id: UUID) -> dict[str, int]:
        """Aggregate counts: {total, successful, failed, cached}."""
        ...
