from __future__ import annotations

from uuid import UUID, uuid4

from petrus.domain.entities.registro import Registro
from petrus.domain.repositories.registro_repo import RegistroRepository
from petrus.domain.services.storage_service import StorageService

BUCKET = "registros"


class RegistroAppService:
    def __init__(self, repo: RegistroRepository, storage: StorageService) -> None:
        self._repo = repo
        self._storage = storage

    async def create(
        self,
        texto: str | None,
        metadata: dict | None,
        files: list[tuple[bytes, str, str]] | None = None,
    ) -> Registro:
        data: dict = {"texto": texto, "metadata": metadata or {}}
        registro = await self._repo.create(data)

        if files:
            for file_bytes, filename, content_type in files:
                path = f"{registro.id}/{uuid4()}_{filename}"
                await self._storage.upload(BUCKET, path, file_bytes, content_type)
                await self._repo.create_arquivo({
                    "registro_id": str(registro.id),
                    "tipo": "foto",
                    "storage_path": path,
                    "nome": filename,
                    "content_type": content_type,
                })

        return await self._repo.get_by_id(registro.id) or registro

    async def list_all(self) -> list[Registro]:
        return await self._repo.list_all()

    async def get(self, registro_id: UUID) -> Registro | None:
        return await self._repo.get_by_id(registro_id)

    async def delete(self, registro_id: UUID) -> None:
        arquivos = await self._repo.list_arquivos(registro_id)
        if arquivos:
            paths = [a["storage_path"] for a in arquivos]
            await self._storage.remove(BUCKET, paths)
        await self._repo.delete(registro_id)

    async def append_nota(self, registro_id: UUID, nota: str) -> None:
        reg = await self._repo.get_by_id(registro_id)
        if not reg:
            return
        current = reg.texto or ""
        new_texto = f"{current}\n{nota}" if current else nota
        await self._repo.update(registro_id, {"texto": new_texto})

    async def add_arquivo(
        self,
        registro_id: UUID,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> dict:
        tipo = "audio" if content_type.startswith("audio/") else "foto"
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
        safe_name = f"{uuid4()}.{ext}"
        path = f"{registro_id}/{safe_name}"
        await self._storage.upload(BUCKET, path, file_bytes, content_type)
        return await self._repo.create_arquivo({
            "registro_id": str(registro_id),
            "tipo": tipo,
            "storage_path": path,
            "nome": filename,
            "content_type": content_type,
        })

    async def get_signed_url(self, storage_path: str) -> str:
        return await self._storage.create_signed_url(BUCKET, storage_path)
