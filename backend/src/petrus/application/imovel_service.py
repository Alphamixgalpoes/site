from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.imovel import Imovel, ImovelResumido
from petrus.domain.repositories.imovel_repo import ImovelRepository


class ImovelService:
    def __init__(self, repo: ImovelRepository) -> None:
        self._repo = repo

    async def list_for_public(self) -> list[Imovel]:
        return await self._repo.list_published()

    async def list_for_admin(self) -> list[Imovel]:
        return await self._repo.list_all()

    async def get_public(self, imovel_id: UUID) -> Imovel | None:
        return await self._repo.get_published_by_id(imovel_id)

    async def get_admin(self, imovel_id: UUID) -> Imovel | None:
        return await self._repo.get_by_id(imovel_id)

    async def create(self, data: dict[str, Any]) -> Imovel:
        return await self._repo.create(data)

    async def update(self, imovel_id: UUID, data: dict[str, Any]) -> Imovel:
        return await self._repo.update(imovel_id, data)

    async def delete(self, imovel_id: UUID) -> None:
        await self._repo.delete(imovel_id)

    async def toggle_published(self, imovel_id: UUID, current: bool) -> None:
        await self._repo.toggle_published(imovel_id, current)

    async def update_coords(self, imovel_id: UUID, lat: float, lng: float) -> None:
        await self._repo.update_coords(imovel_id, lat, lng)

    async def search(self, query: str) -> list[ImovelResumido]:
        return await self._repo.search(query)

    async def reorder_images(self, images: list[dict[str, Any]]) -> None:
        await self._repo.reorder_images(images)
