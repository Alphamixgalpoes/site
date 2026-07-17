from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.contato import Contato, ContatoResumido
from petrus.domain.repositories.contato_repo import ContatoRepository


class ContatoService:
    def __init__(self, repo: ContatoRepository) -> None:
        self._repo = repo

    async def list_active(self) -> list[Contato]:
        return await self._repo.list_active()

    async def get(self, contato_id: UUID) -> Contato | None:
        return await self._repo.get_by_id(contato_id)

    async def search(self, term: str) -> list[ContatoResumido]:
        return await self._repo.search(term)

    async def create(self, data: dict[str, Any]) -> Contato:
        return await self._repo.create(data)

    async def update(self, contato_id: UUID, data: dict[str, Any]) -> Contato:
        return await self._repo.update(contato_id, data)

    async def soft_delete(self, contato_id: UUID) -> None:
        await self._repo.soft_delete(contato_id)

    async def get_relationships(self, contato_id: UUID) -> dict[str, Any]:
        return await self._repo.get_relationships(contato_id)
