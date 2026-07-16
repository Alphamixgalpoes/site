from __future__ import annotations

from supabase import Client

from petrus.domain.services.storage_service import StorageService


class SupabaseStorageService(StorageService):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def upload(self, bucket: str, path: str, file_bytes: bytes, content_type: str) -> str:
        self._sb.storage.from_(bucket).upload(
            path, file_bytes, file_options={"content-type": content_type}
        )
        return path

    async def remove(self, bucket: str, paths: list[str]) -> None:
        self._sb.storage.from_(bucket).remove(paths)

    async def get_public_url(self, bucket: str, path: str) -> str:
        return self._sb.storage.from_(bucket).get_public_url(path)

    async def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        res = self._sb.storage.from_(bucket).create_signed_url(path, expires_in)
        return res["signedURL"]

    async def download(self, bucket: str, path: str) -> bytes | None:
        try:
            return self._sb.storage.from_(bucket).download(path)
        except Exception:
            return None
