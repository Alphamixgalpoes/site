from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from petrus.domain.entities.imovel import Imovel, ImovelImagem, ImovelResumido


class ImovelRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[Imovel]: ...

    @abstractmethod
    async def list_published(self) -> list[Imovel]: ...

    @abstractmethod
    async def get_by_id(self, imovel_id: UUID) -> Imovel | None: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> Imovel: ...

    @abstractmethod
    async def update(self, imovel_id: UUID, data: dict[str, Any]) -> Imovel: ...

    @abstractmethod
    async def delete(self, imovel_id: UUID) -> None: ...

    @abstractmethod
    async def get_published_by_id(self, imovel_id: UUID) -> Imovel | None: ...

    @abstractmethod
    async def toggle_published(self, imovel_id: UUID, current: bool) -> None: ...

    @abstractmethod
    async def update_coords(self, imovel_id: UUID, lat: float, lng: float) -> None: ...

    @abstractmethod
    async def create_image(
        self, imovel_id: UUID, storage_path: str, ordem: int
    ) -> ImovelImagem: ...

    @abstractmethod
    async def delete_image_record(self, image_id: UUID) -> None: ...

    @abstractmethod
    async def reorder_images(self, images: list[dict[str, Any]]) -> None: ...

    @abstractmethod
    async def search(self, query: str, limit: int = 8) -> list[ImovelResumido]: ...
