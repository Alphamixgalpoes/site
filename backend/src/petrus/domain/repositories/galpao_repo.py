from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class GalpaoRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def list_published(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def get_by_id(self, galpao_id: UUID) -> dict[str, Any] | None: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def update(self, galpao_id: UUID, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def delete(self, galpao_id: UUID) -> None: ...

    @abstractmethod
    async def toggle_published(self, galpao_id: UUID, current: bool) -> None: ...

    @abstractmethod
    async def update_coords(self, galpao_id: UUID, lat: float, lng: float) -> None: ...

    @abstractmethod
    async def upload_image(
        self, galpao_id: UUID, file_bytes: bytes, filename: str, ordem: int
    ) -> dict[str, Any]: ...

    @abstractmethod
    async def delete_image(self, image_id: UUID, storage_path: str) -> None: ...

    @abstractmethod
    async def reorder_images(self, images: list[dict[str, Any]]) -> None: ...

    @abstractmethod
    async def search(self, query: str, limit: int = 8) -> list[dict[str, Any]]: ...
