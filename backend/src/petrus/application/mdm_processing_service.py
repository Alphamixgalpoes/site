from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.repositories.mdm_repo import (
    FonteRepository, FonteRegistroRepository,
)
from petrus.domain.repositories.recomendacao_repo import RecomendacaoRepository
from petrus.domain.repositories.imovel_repo import ImovelRepository
from petrus.infrastructure.mdm.normalizer import DefaultNormalizer
from petrus.infrastructure.mdm.matcher import AdaptiveMatcher
from petrus.infrastructure.mdm.card_generator import generate_cards

# Importing connectors triggers auto-registration in AdapterRegistry
import petrus.infrastructure.mdm.connectors  # noqa: F401
from petrus.infrastructure.mdm.connectors.registry import AdapterRegistry


class MdmProcessingService:
    """Developer-facing service for processing Raw->Clean and generating Cards."""

    def __init__(
        self,
        fonte_repo: FonteRepository,
        registro_repo: FonteRegistroRepository,
        rec_repo: RecomendacaoRepository,
        imovel_repo: ImovelRepository,
    ) -> None:
        self._fonte_repo = fonte_repo
        self._reg_repo = registro_repo
        self._rec_repo = rec_repo
        self._imovel_repo = imovel_repo
        self._normalizer = DefaultNormalizer()
        self._matcher = AdaptiveMatcher()

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

    async def generate_cards_for_fonte(self, fonte_id: UUID) -> dict[str, Any]:
        fonte = await self._fonte_repo.get_by_id(fonte_id)
        if not fonte:
            raise ValueError("Fonte nao encontrada")

        # Load clean registros
        cleans = await self._reg_repo.get_by_fonte_and_stage(fonte_id, "clean")
        if not cleans:
            raise ValueError("Nenhum registro clean encontrado. Execute process_raw_to_clean primeiro.")

        # Load golden records (imoveis)
        golden = await self._imovel_repo.list_all()

        cards_criar = 0
        cards_atualizar = 0
        cards_mesclar = 0
        cards_total = 0

        for reg in cleans:
            if not reg.dados_normalizados:
                continue

            matches = self._matcher.find_matches(reg.dados_normalizados, golden)
            cards = generate_cards(
                reg.dados_normalizados,
                matches,
                fonte_id=str(fonte_id),
                fonte_registro_id=str(reg.id),
            )

            for card in cards:
                await self._rec_repo.create(card)
                cards_total += 1
                tipo = card.get("tipo", "")
                if tipo == "criar":
                    cards_criar += 1
                elif tipo == "atualizar":
                    cards_atualizar += 1
                elif tipo == "mesclar":
                    cards_mesclar += 1

        await self._fonte_repo.update(fonte_id, {
            "processing_status": "cards_gerados",
        })

        return {
            "cards_criar": cards_criar,
            "cards_atualizar": cards_atualizar,
            "cards_mesclar": cards_mesclar,
            "cards_total": cards_total,
        }

    async def process_full(self, fonte_id: UUID) -> dict[str, Any]:
        raw_stats = await self.process_raw_to_clean(fonte_id)
        card_stats = await self.generate_cards_for_fonte(fonte_id)
        return {**raw_stats, **card_stats}
