from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.galpao import Galpao, GalpaoResumido
from petrus.domain.repositories.galpao_repo import GalpaoRepository


class GalpaoService:
    def __init__(self, repo: GalpaoRepository) -> None:
        self._repo = repo

    async def list_for_public(self) -> list[Galpao]:
        return await self._repo.list_published()

    async def list_for_admin(self) -> list[Galpao]:
        return await self._repo.list_all()

    async def get_public(self, galpao_id: UUID) -> Galpao | None:
        g = await self._repo.get_by_id(galpao_id)
        if g and not g.publicado:
            return None
        return g

    async def get_admin(self, galpao_id: UUID) -> Galpao | None:
        return await self._repo.get_by_id(galpao_id)

    async def create(self, data: dict[str, Any]) -> Galpao:
        return await self._repo.create(data)

    async def update(self, galpao_id: UUID, data: dict[str, Any]) -> Galpao:
        return await self._repo.update(galpao_id, data)

    async def delete(self, galpao_id: UUID) -> None:
        await self._repo.delete(galpao_id)

    async def toggle_published(self, galpao_id: UUID, current: bool) -> None:
        await self._repo.toggle_published(galpao_id, current)

    async def update_coords(self, galpao_id: UUID, lat: float, lng: float) -> None:
        await self._repo.update_coords(galpao_id, lat, lng)

    async def search(self, query: str) -> list[GalpaoResumido]:
        return await self._repo.search(query)

    async def reorder_images(self, images: list[dict[str, Any]]) -> None:
        await self._repo.reorder_images(images)
