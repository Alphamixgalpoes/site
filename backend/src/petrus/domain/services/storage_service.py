from __future__ import annotations

from abc import ABC, abstractmethod


class StorageService(ABC):
    @abstractmethod
    async def upload(self, bucket: str, path: str, file_bytes: bytes, content_type: str) -> str: ...

    @abstractmethod
    async def remove(self, bucket: str, paths: list[str]) -> None: ...

    @abstractmethod
    async def get_public_url(self, bucket: str, path: str) -> str: ...

    @abstractmethod
    async def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str: ...

    @abstractmethod
    async def download(self, bucket: str, path: str) -> bytes | None: ...
