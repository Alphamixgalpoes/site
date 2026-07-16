from __future__ import annotations

from abc import ABC, abstractmethod


class ImageService(ABC):
    @abstractmethod
    async def get_watermarked(self, storage_path: str) -> bytes | None: ...
