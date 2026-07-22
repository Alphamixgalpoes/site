from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.mdm import (
    Fonte, Importacao, FonteRegistro, ImovelFonte,
    ConsolidacaoLog, RegraEnriquecimento, RegraAprovacao,
    MercadoSnapshot, CacheConsulta,
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


class ImportacaoRepository(ABC):
    @abstractmethod
    async def create(self, data: dict[str, Any]) -> Importacao: ...

    @abstractmethod
    async def update(self, imp_id: UUID, data: dict[str, Any]) -> Importacao: ...

    @abstractmethod
    async def get_by_fonte(self, fonte_id: UUID) -> list[Importacao]: ...

    @abstractmethod
    async def get_by_id(self, imp_id: UUID) -> Importacao | None: ...


class FonteRegistroRepository(ABC):
    @abstractmethod
    async def create_batch(self, registros: list[dict[str, Any]]) -> int: ...

    @abstractmethod
    async def get_by_importacao(self, importacao_id: UUID) -> list[FonteRegistro]: ...

    @abstractmethod
    async def get_by_fonte(self, fonte_id: UUID) -> list[FonteRegistro]: ...

    @abstractmethod
    async def get_by_hash(self, hash_dedup: str) -> FonteRegistro | None: ...


class ImovelFonteRepository(ABC):
    @abstractmethod
    async def create(self, data: dict[str, Any]) -> ImovelFonte: ...

    @abstractmethod
    async def get_by_imovel(self, imovel_id: UUID) -> list[ImovelFonte]: ...


class ConsolidacaoLogRepository(ABC):
    @abstractmethod
    async def create(self, data: dict[str, Any]) -> ConsolidacaoLog: ...

    @abstractmethod
    async def update(self, log_id: UUID, data: dict[str, Any]) -> ConsolidacaoLog: ...

    @abstractmethod
    async def list_all(self) -> list[ConsolidacaoLog]: ...


class RegraEnriquecimentoRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[RegraEnriquecimento]: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> RegraEnriquecimento: ...

    @abstractmethod
    async def update(self, regra_id: UUID, data: dict[str, Any]) -> RegraEnriquecimento: ...


class RegraAprovacaoRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[RegraAprovacao]: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> RegraAprovacao: ...


class MercadoSnapshotRepository(ABC):
    @abstractmethod
    async def create(self, data: dict[str, Any]) -> MercadoSnapshot: ...

    @abstractmethod
    async def list_all(self, limit: int = 100) -> list[MercadoSnapshot]: ...


class CacheConsultaRepository(ABC):
    @abstractmethod
    async def get(self, tipo: str, chave: str) -> CacheConsulta | None: ...

    @abstractmethod
    async def set(self, tipo: str, chave: str, dados: dict, expires_at: str) -> CacheConsulta: ...
