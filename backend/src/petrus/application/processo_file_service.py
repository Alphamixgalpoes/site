from __future__ import annotations

from uuid import UUID

from petrus.domain.repositories.processo_repo import ProcessoRepository
from petrus.domain.services.storage_service import StorageService


class ProcessoFileService:
    def __init__(self, repo: ProcessoRepository, storage: StorageService) -> None:
        self._repo = repo
        self._storage = storage

    async def upload(
        self,
        processo_id: UUID,
        item_id: UUID,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> dict:
        # Remove old file if exists
        items = await self._repo.list_items(processo_id)
        old_item = next((i for i in items if str(i.id) == str(item_id)), None)
        if old_item and old_item.arquivo_path:
            try:
                await self._storage.remove("processos", [old_item.arquivo_path])
            except Exception:
                pass

        path = f"{processo_id}/{item_id}/{filename}"
        await self._storage.upload("processos", path, file_bytes, content_type)
        tipo = "pdf" if filename.lower().endswith(".pdf") else "imagem"
        await self._repo.update_item(
            item_id,
            {
                "arquivo_path": path,
                "arquivo_nome": filename,
                "arquivo_tipo": tipo,
                "feito": True,
            },
        )
        signed_url = await self._storage.create_signed_url("processos", path, 3600)
        return {"path": path, "nome": filename, "tipo": tipo, "signed_url": signed_url}

    async def remove(self, processo_id: UUID, item_id: UUID) -> None:
        items = await self._repo.list_items(processo_id)
        item = next((i for i in items if str(i.id) == str(item_id)), None)
        if item and item.arquivo_path:
            await self._storage.remove("processos", [item.arquivo_path])
        await self._repo.update_item(
            item_id,
            {"arquivo_path": None, "arquivo_nome": None, "arquivo_tipo": None},
        )

    async def get_signed_urls(self, processo_id: UUID) -> dict[str, str]:
        items = await self._repo.list_items(processo_id)
        urls: dict[str, str] = {}
        for item in items:
            if item.arquivo_path:
                try:
                    url = await self._storage.create_signed_url(
                        "processos", item.arquivo_path, 3600
                    )
                    urls[str(item.id)] = url
                except Exception:
                    pass
        return urls
