from __future__ import annotations

from uuid import UUID, uuid4

from petrus.domain.entities.galpao import GalpaoImagem
from petrus.domain.repositories.galpao_repo import GalpaoRepository
from petrus.domain.services.storage_service import StorageService


class GalpaoImageService:
    def __init__(self, repo: GalpaoRepository, storage: StorageService) -> None:
        self._repo = repo
        self._storage = storage

    async def upload(
        self, galpao_id: UUID, file_bytes: bytes, filename: str, ordem: int
    ) -> GalpaoImagem:
        path = f"{galpao_id}/{uuid4()}_{filename}"
        await self._storage.upload("galpoes", path, file_bytes, "image/*")
        return await self._repo.create_image(galpao_id, path, ordem)

    async def delete(self, image_id: UUID, storage_path: str) -> None:
        await self._storage.remove("galpoes", [storage_path])
        await self._repo.delete_image_record(image_id)
