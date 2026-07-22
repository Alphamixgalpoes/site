from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.publicacao import ImovelPublicacao


class PublicacaoRepository(ABC):
    @abstractmethod
    async def create(self, imovel_id: UUID, data: dict[str, Any]) -> ImovelPublicacao: ...

    @abstractmethod
    async def get_by_imovel(self, imovel_id: UUID) -> ImovelPublicacao | None: ...

    @abstractmethod
    async def update(self, imovel_id: UUID, data: dict[str, Any]) -> ImovelPublicacao: ...

    @abstractmethod
    async def delete(self, imovel_id: UUID) -> None: ...

    @abstractmethod
    async def list_ativos(self) -> list[ImovelPublicacao]: ...

    @abstractmethod
    async def get_by_slug(self, slug: str) -> ImovelPublicacao | None: ...
