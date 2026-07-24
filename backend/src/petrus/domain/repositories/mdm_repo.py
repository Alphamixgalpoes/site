from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.mdm import (
    Fonte, FonteRegistro, ImovelFonte, ScrapingRun,
)


class FonteRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[Fonte]: ...

    @abstractmethod
    async def get_by_id(self, fonte_id: UUID) -> Fonte | None: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> Fonte: ...

    @abstractmethod
    async def update(self, fonte_id: UUID, data: dict[str, Any]) -> Fonte: ...

    @abstractmethod
    async def delete(self, fonte_id: UUID) -> None: ...


class FonteRegistroRepository(ABC):
    @abstractmethod
    async def create_batch(self, registros: list[dict[str, Any]]) -> int: ...

    @abstractmethod
    async def get_by_importacao(self, importacao_id: UUID) -> list[FonteRegistro]: ...

    @abstractmethod
    async def get_by_fonte(self, fonte_id: UUID) -> list[FonteRegistro]: ...

    @abstractmethod
    async def get_by_fonte_and_stage(self, fonte_id: UUID, stage: str) -> list[FonteRegistro]: ...

    @abstractmethod
    async def delete_by_fonte_and_stage(self, fonte_id: UUID, stage: str) -> int: ...

    @abstractmethod
    async def get_by_hash(self, hash_dedup: str) -> FonteRegistro | None: ...


class ImovelFonteRepository(ABC):
    @abstractmethod
    async def create(self, data: dict[str, Any]) -> ImovelFonte: ...

    @abstractmethod
    async def get_by_imovel(self, imovel_id: UUID) -> list[ImovelFonte]: ...


class ScrapingRunRepository(ABC):
    @abstractmethod
    async def create(self, data: dict[str, Any]) -> ScrapingRun: ...

    @abstractmethod
    async def update(self, run_id: UUID, data: dict[str, Any]) -> ScrapingRun: ...

    @abstractmethod
    async def get_by_fonte(self, fonte_id: UUID) -> list[ScrapingRun]: ...

    @abstractmethod
    async def list_pending(self) -> list[ScrapingRun]: ...
