from __future__ import annotations

import csv
import io
from typing import Any
from uuid import UUID

from petrus.domain.entities.mdm import Fonte
from petrus.domain.repositories.mdm_repo import (
    FonteRepository, FonteRegistroRepository, ScrapingRunRepository,
)
from petrus.domain.services.storage_service import StorageService


class MdmSubmissionService:
    """Handles admin-facing data submission (spreadsheet upload or URL)."""

    def __init__(
        self,
        fonte_repo: FonteRepository,
        registro_repo: FonteRegistroRepository,
        scraping_repo: ScrapingRunRepository,
        storage: StorageService,
    ) -> None:
        self._fonte_repo = fonte_repo
        self._reg_repo = registro_repo
        self._scraping_repo = scraping_repo
        self._storage = storage

    async def submit_spreadsheet(
        self,
        nome: str,
        file_content: bytes,
        filename: str,
        config: dict[str, Any] | None = None,
    ) -> Fonte:
        fonte_config = config or {}

        # 1. Create fonte
        fonte = await self._fonte_repo.create({
            "nome": nome,
            "tipo": fonte_config.get("adapter_type", "generic_csv"),
            "submission_type": "spreadsheet",
            "processing_status": "pendente_raw",
            "config": fonte_config,
        })

        # 2. Upload raw file to storage
        storage_path = f"{fonte.id}/{filename}"
        content_type = self._guess_content_type(filename)
        await self._storage.upload("mdm-raw", storage_path, file_content, content_type)

        # 3. Extract rows and insert as raw registros
        rows = list(self._iter_all_rows(file_content, filename))
        if rows:
            batch = [
                {
                    "fonte_id": str(fonte.id),
                    "dados_brutos": row,
                    "stage": "raw",
                }
                for row in rows
            ]
            await self._reg_repo.create_batch(batch)

        # 4. Update fonte status
        fonte = await self._fonte_repo.update(fonte.id, {
            "storage_path": storage_path,
            "processing_status": "tem_raw",
        })

        return fonte

    async def submit_url(
        self,
        nome: str,
        url: str,
        notas: str | None = None,
    ) -> Fonte:
        # 1. Create fonte
        fonte = await self._fonte_repo.create({
            "nome": nome,
            "tipo": "scraping",
            "submission_type": "url",
            "url": url,
            "scraping_status": "pendente",
            "processing_status": "pendente_raw",
            "notas": notas,
        })

        # 2. Create scraping queue entry
        await self._scraping_repo.create({
            "fonte_id": str(fonte.id),
            "url": url,
            "status": "pendente",
        })

        return fonte

    async def resubmit_spreadsheet(
        self,
        fonte_id: UUID,
        file_content: bytes,
        filename: str,
    ) -> Fonte:
        fonte = await self._fonte_repo.get_by_id(fonte_id)
        if not fonte:
            raise ValueError("Fonte nao encontrada")

        # 1. Delete old raw registros
        await self._reg_repo.delete_by_fonte_and_stage(fonte_id, "raw")

        # 2. Also delete clean (stale after resubmission)
        await self._reg_repo.delete_by_fonte_and_stage(fonte_id, "clean")

        # 3. Remove old file, upload new one
        if fonte.storage_path:
            try:
                await self._storage.remove("mdm-raw", [fonte.storage_path])
            except Exception:
                pass

        storage_path = f"{fonte_id}/{filename}"
        content_type = self._guess_content_type(filename)
        await self._storage.upload("mdm-raw", storage_path, file_content, content_type)

        # 4. Extract and insert new raw registros
        rows = list(self._iter_all_rows(file_content, filename))
        if rows:
            batch = [
                {
                    "fonte_id": str(fonte_id),
                    "dados_brutos": row,
                    "stage": "raw",
                }
                for row in rows
            ]
            await self._reg_repo.create_batch(batch)

        # 5. Reset processing status
        fonte = await self._fonte_repo.update(fonte_id, {
            "storage_path": storage_path,
            "processing_status": "tem_raw",
        })

        return fonte

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _guess_content_type(filename: str) -> str:
        lower = filename.lower()
        if lower.endswith(".xlsx"):
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if lower.endswith(".xls"):
            return "application/vnd.ms-excel"
        if lower.endswith(".tsv"):
            return "text/tab-separated-values"
        return "text/csv"

    @staticmethod
    def _iter_all_rows(content: bytes, filename: str):
        lower = filename.lower()
        if lower.endswith(".xlsx") or lower.endswith(".xls"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(
                    io.BytesIO(content), read_only=True, data_only=True,
                )
                ws = wb.active
                if ws:
                    rows = ws.iter_rows(values_only=True)
                    header = [
                        str(c) if c else f"col_{i}"
                        for i, c in enumerate(next(rows, ()) or ())
                    ]
                    for row in rows:
                        values = [
                            v.isoformat() if hasattr(v, "isoformat") else v
                            for v in row
                        ]
                        yield dict(zip(header, values))
                wb.close()
            except ImportError:
                pass
            return

        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1")

        first_line = text.split("\n")[0] if text else ""
        sep = ","
        if first_line.count(";") > first_line.count(","):
            sep = ";"
        elif first_line.count("\t") > first_line.count(","):
            sep = "\t"

        reader = csv.DictReader(io.StringIO(text), delimiter=sep)
        yield from reader
