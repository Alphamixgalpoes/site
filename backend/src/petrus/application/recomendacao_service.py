from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.recomendacao import Recomendacao
from petrus.domain.entities.mdm_types import CardResumo
from petrus.domain.repositories.recomendacao_repo import RecomendacaoRepository
from petrus.domain.repositories.imovel_repo import ImovelRepository
from petrus.domain.repositories.mdm_repo import ImovelFonteRepository


class RecomendacaoService:
    def __init__(
        self,
        rec_repo: RecomendacaoRepository,
        imovel_repo: ImovelRepository,
        imovel_fonte_repo: ImovelFonteRepository,
    ) -> None:
        self._rec_repo = rec_repo
        self._imovel_repo = imovel_repo
        self._imovel_fonte_repo = imovel_fonte_repo

    async def list_pendentes(self, filtros: dict[str, Any] | None = None) -> list[Recomendacao]:
        return await self._rec_repo.list_pendentes(filtros)

    async def get(self, rec_id: UUID) -> Recomendacao | None:
        return await self._rec_repo.get_by_id(rec_id)

    async def resumo(self) -> CardResumo:
        return await self._rec_repo.count_by_tipo()

    async def get_by_imovel(self, imovel_id: UUID) -> list[Recomendacao]:
        return await self._rec_repo.get_by_imovel(imovel_id)

    async def aprovar(
        self, rec_id: UUID, dados_editados: dict[str, Any] | None = None
    ) -> Recomendacao:
        card = await self._rec_repo.get_by_id(rec_id)
        if not card:
            raise ValueError("Card not found")

        dados_finais = dados_editados if dados_editados else card.dados_propostos

        if card.tipo == "criar":
            dados_finais["origem"] = "card"
            dados_finais["status"] = "novo"
            imovel = await self._imovel_repo.create(dados_finais)
            # Create lineage
            if card.fonte_registro_id:
                await self._imovel_fonte_repo.create({
                    "imovel_id": str(imovel.id),
                    "fonte_registro_id": str(card.fonte_registro_id),
                    "recomendacao_id": str(card.id),
                    "campos_usados": list(dados_finais.keys()),
                    "tipo_match": "criar",
                })

        elif card.tipo == "atualizar":
            if card.imovel_id:
                await self._imovel_repo.update(card.imovel_id, dados_finais)
                if card.fonte_registro_id:
                    await self._imovel_fonte_repo.create({
                        "imovel_id": str(card.imovel_id),
                        "fonte_registro_id": str(card.fonte_registro_id),
                        "recomendacao_id": str(card.id),
                        "campos_usados": card.campos_alterados,
                        "tipo_match": "atualizar",
                        "score_match": card.score_match,
                    })

        elif card.tipo == "mesclar":
            if card.imovel_id:
                await self._imovel_repo.update(card.imovel_id, dados_finais)
                # Archive secondary
                if card.imovel_secundario_id:
                    await self._imovel_repo.update(
                        card.imovel_secundario_id,
                        {"status": "arquivado", "motivo_arquivo": f"Mesclado com {card.imovel_id}"},
                    )

        elif card.tipo == "enriquecer":
            if card.imovel_id:
                update_data = {**dados_finais, "enriquecido_em": "now()"}
                await self._imovel_repo.update(card.imovel_id, update_data)

        return await self._rec_repo.update_status(rec_id, "aprovada", dados_aprovados=dados_finais)

    async def rejeitar(self, rec_id: UUID, notas: str | None = None) -> Recomendacao:
        return await self._rec_repo.update_status(rec_id, "rejeitada", notas=notas)

    async def batch_aprovar(self, ids: list[UUID]) -> int:
        count = 0
        for rec_id in ids:
            try:
                await self.aprovar(rec_id)
                count += 1
            except Exception:
                continue
        return count

    async def batch_rejeitar(self, ids: list[UUID], notas: str | None = None) -> int:
        return await self._rec_repo.batch_update_status(ids, "rejeitada", notas)
