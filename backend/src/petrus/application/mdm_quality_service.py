from __future__ import annotations

from uuid import UUID

from petrus.domain.entities.mdm_types import QualidadeCampo
from petrus.domain.repositories.imovel_repo import ImovelRepository
from petrus.domain.services.quality_service import QualityService


class MdmQualityService:
    def __init__(self, imovel_repo: ImovelRepository, quality: QualityService) -> None:
        self._imovel_repo = imovel_repo
        self._quality = quality

    async def avaliar_imovel(self, imovel_id: UUID) -> tuple[list[QualidadeCampo], float]:
        imovel = await self._imovel_repo.get_by_id(imovel_id)
        if not imovel:
            raise ValueError("Imovel não encontrado")
        campos = self._quality.avaliar(imovel)
        score = self._quality.score_geral(campos)
        return campos, score

    async def recalcular_todos(self) -> int:
        imoveis = await self._imovel_repo.list_all()
        count = 0
        for imovel in imoveis:
            campos = self._quality.avaliar(imovel)
            score = self._quality.score_geral(campos)
            campos_dict = {c.campo: {"completude": c.completude, "frescor": c.frescor, "score": c.score} for c in campos}
            await self._imovel_repo.update(imovel.id, {
                "qualidade_campos": campos_dict,
                "qualidade_score": score,
            })
            count += 1
        return count

    async def ranking(self, limit: int = 20) -> list[dict]:
        imoveis = await self._imovel_repo.list_all()
        ranked = sorted(imoveis, key=lambda i: i.qualidade_score, reverse=True)[:limit]
        return [
            {"id": str(i.id), "titulo": i.titulo, "cidade": i.cidade, "qualidade_score": i.qualidade_score}
            for i in ranked
        ]
