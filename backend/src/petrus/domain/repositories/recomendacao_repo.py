from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.recomendacao import Recomendacao
from petrus.domain.entities.mdm_types import CardResumo


class RecomendacaoRepository(ABC):
    @abstractmethod
    async def create(self, data: dict[str, Any]) -> Recomendacao: ...

    @abstractmethod
    async def get_by_id(self, rec_id: UUID) -> Recomendacao | None: ...

    @abstractmethod
    async def update_status(
        self, rec_id: UUID, status: str, dados_aprovados: dict | None = None, notas: str | None = None
    ) -> Recomendacao: ...

    @abstractmethod
    async def list_pendentes(self, filtros: dict[str, Any] | None = None) -> list[Recomendacao]: ...

    @abstractmethod
    async def count_by_tipo(self) -> CardResumo: ...

    @abstractmethod
    async def get_by_importacao(self, importacao_id: UUID) -> list[Recomendacao]: ...

    @abstractmethod
    async def get_by_imovel(self, imovel_id: UUID) -> list[Recomendacao]: ...

    @abstractmethod
    async def batch_update_status(self, ids: list[UUID], status: str, notas: str | None = None) -> int: ...
