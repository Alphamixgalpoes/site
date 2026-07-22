from __future__ import annotations

from uuid import UUID, uuid4

from petrus.domain.entities.imovel import ImovelImagem
from petrus.domain.repositories.imovel_repo import ImovelRepository
from petrus.domain.services.storage_service import StorageService


class ImovelImageService:
    def __init__(self, repo: ImovelRepository, storage: StorageService) -> None:
        self._repo = repo
        self._storage = storage

    async def upload(
        self, imovel_id: UUID, file_bytes: bytes, filename: str, ordem: int
    ) -> ImovelImagem:
        path = f"{imovel_id}/{uuid4()}_{filename}"
        await self._storage.upload("galpoes", path, file_bytes, "image/*")
        return await self._repo.create_image(imovel_id, path, ordem)

    async def delete(self, image_id: UUID, storage_path: str) -> None:
        await self._storage.remove("galpoes", [storage_path])
        await self._repo.delete_image_record(image_id)
