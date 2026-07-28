from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.repositories.mdm_repo import (
    FonteRepository, FonteRegistroRepository,
)
from petrus.infrastructure.mdm.normalizer import DefaultNormalizer

# Importing connectors triggers auto-registration in AdapterRegistry
import petrus.infrastructure.mdm.connectors  # noqa: F401
from petrus.infrastructure.mdm.connectors.registry import AdapterRegistry


class MdmProcessingService:
    """Developer-facing service for processing Raw->Clean."""

    def __init__(
        self,
        fonte_repo: FonteRepository,
        registro_repo: FonteRegistroRepository,
    ) -> None:
        self._fonte_repo = fonte_repo
        self._reg_repo = registro_repo
        self._normalizer = DefaultNormalizer()

    async def process_raw_to_clean(self, fonte_id: UUID) -> dict[str, Any]:
        fonte = await self._fonte_repo.get_by_id(fonte_id)
        if not fonte:
            raise ValueError("Fonte nao encontrada")

        # Resolve adapter
        adapter = AdapterRegistry.resolve_for_fonte(fonte.tipo, fonte.config)

        # Load raw registros
        raws = await self._reg_repo.get_by_fonte_and_stage(fonte_id, "raw")
        if not raws:
            raise ValueError("Nenhum registro raw encontrado para esta fonte")

        # Delete existing clean (idempotent re-run)
        await self._reg_repo.delete_by_fonte_and_stage(fonte_id, "clean")

        processados = 0
        erros_count = 0
        erros: list[dict] = []
        batch: list[dict[str, Any]] = []

        for raw_reg in raws:
            try:
                canonical: CanonicalRecord = adapter.transform(raw_reg.dados_brutos)
                normalized = canonical.to_dict()
                hash_dedup = self._normalizer.compute_hash(normalized)

                batch.append({
                    "fonte_id": str(fonte_id),
                    "dados_brutos": raw_reg.dados_brutos,
                    "dados_normalizados": normalized,
                    "hash_dedup": hash_dedup,
                    "stage": "clean",
                    "raw_registro_id": str(raw_reg.id),
                })
                processados += 1
            except Exception as e:
                erros_count += 1
                erros.append({"registro_id": str(raw_reg.id), "erro": str(e)})

        if batch:
            await self._reg_repo.create_batch(batch)

        await self._fonte_repo.update(fonte_id, {
            "processing_status": "tem_clean",
            "last_processed_at": "now()",
        })

        return {
            "total_raw": len(raws),
            "processados": processados,
            "erros": erros_count,
            "erros_detalhe": erros[:50],
        }
