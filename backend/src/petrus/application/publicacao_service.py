from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.publicacao import ImovelPublicacao
from petrus.domain.repositories.publicacao_repo import PublicacaoRepository


class PublicacaoService:
    def __init__(self, repo: PublicacaoRepository) -> None:
        self._repo = repo

    async def publicar(self, imovel_id: UUID, data: dict[str, Any] | None = None) -> ImovelPublicacao:
        existing = await self._repo.get_by_imovel(imovel_id)
        if existing:
            return await self._repo.update(imovel_id, {"ativo": True, **(data or {})})
        return await self._repo.create(imovel_id, data or {})

    async def despublicar(self, imovel_id: UUID) -> None:
        await self._repo.delete(imovel_id)

    async def atualizar(self, imovel_id: UUID, data: dict[str, Any]) -> ImovelPublicacao:
        return await self._repo.update(imovel_id, data)

    async def get(self, imovel_id: UUID) -> ImovelPublicacao | None:
        return await self._repo.get_by_imovel(imovel_id)

    async def list_publicados(self) -> list[ImovelPublicacao]:
        return await self._repo.list_ativos()

    async def get_by_slug(self, slug: str) -> ImovelPublicacao | None:
        return await self._repo.get_by_slug(slug)
