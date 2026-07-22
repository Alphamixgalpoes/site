from __future__ import annotations

from datetime import datetime, timezone

from petrus.domain.entities.imovel import Imovel
from petrus.domain.entities.mdm_types import QualidadeCampo
from petrus.domain.services.quality_service import QualityService

# Fields that contribute to quality
CAMPOS_AVALIADOS = [
    "titulo", "tipo", "categoria", "cidade", "endereco", "logradouro",
    "area_construida_m2", "area_total_m2", "valor",
    "pe_direito_m", "numero_docas", "latitude", "longitude",
    "descricao",
]

# Weight per field
PESOS = {
    "titulo": 1.0, "tipo": 0.5, "categoria": 0.5, "cidade": 1.0,
    "endereco": 0.8, "logradouro": 0.8, "area_construida_m2": 1.0,
    "area_total_m2": 0.8, "valor": 1.0, "pe_direito_m": 0.6,
    "numero_docas": 0.4, "latitude": 0.7, "longitude": 0.7,
    "descricao": 0.5,
}


class DefaultQualityService(QualityService):
    def avaliar(self, imovel: Imovel) -> list[QualidadeCampo]:
        result = []
        for campo in CAMPOS_AVALIADOS:
            valor = getattr(imovel, campo, None)
            completude = 1.0 if valor is not None and str(valor).strip() else 0.0

            # Frescor based on updated_at
            frescor = 0.0
            if imovel.updated_at:
                try:
                    updated = datetime.fromisoformat(imovel.updated_at.replace("Z", "+00:00"))
                    age_days = (datetime.now(timezone.utc) - updated).days
                    frescor = max(0.0, 1.0 - age_days / 365)
                except (ValueError, TypeError):
                    pass

            score = completude * 0.6 + frescor * 0.4

            result.append(QualidadeCampo(
                campo=campo,
                completude=completude,
                frescor=round(frescor, 2),
                score=round(score, 2),
            ))
        return result

    def score_geral(self, campos: list[QualidadeCampo]) -> float:
        if not campos:
            return 0.0
        total_weight = sum(PESOS.get(c.campo, 0.5) for c in campos)
        weighted_sum = sum(c.score * PESOS.get(c.campo, 0.5) for c in campos)
        return round(weighted_sum / total_weight, 2) if total_weight > 0 else 0.0
