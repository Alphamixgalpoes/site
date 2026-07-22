from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.mdm import Fonte
from petrus.domain.repositories.mdm_repo import FonteRepository


class MdmFonteService:
    def __init__(self, repo: FonteRepository) -> None:
        self._repo = repo

    async def list_all(self) -> list[Fonte]:
        return await self._repo.list_all()

    async def get(self, fonte_id: UUID) -> Fonte | None:
        return await self._repo.get_by_id(fonte_id)

    async def create(self, data: dict[str, Any]) -> Fonte:
        return await self._repo.create(data)

    async def update(self, fonte_id: UUID, data: dict[str, Any]) -> Fonte:
        return await self._repo.update(fonte_id, data)

    async def delete(self, fonte_id: UUID) -> None:
        await self._repo.delete(fonte_id)
