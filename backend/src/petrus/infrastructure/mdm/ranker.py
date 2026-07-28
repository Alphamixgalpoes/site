"""Rank golden records by similarity to a clean registro.

Reuses scoring logic from the AdaptiveMatcher but returns top N
results regardless of threshold. Designed for batch operation
and future cloud execution (stateless, no side effects).
"""

from __future__ import annotations

from petrus.domain.entities.imovel import Imovel
from petrus.infrastructure.mdm.matcher import (
    _area_similarity,
    _fuzzy_ratio,
    _geo_distance_km,
)

# Fields to snapshot from an Imovel for comparison in the workspace
SNAPSHOT_FIELDS = [
    "titulo",
    "tipo",
    "cidade",
    "bairro",
    "logradouro",
    "numero",
    "complemento",
    "endereco",
    "uf",
    "cep",
    "latitude",
    "longitude",
    "area_total_m2",
    "area_construida_m2",
    "area_piso_m2",
    "area_escritorio_m2",
    "pe_direito_m",
    "numero_docas",
    "vagas_estacionamento",
    "potencia_eletrica_kva",
    "valor",
    "valor_condominio",
    "observacoes",
    "status",
    "descricao",
]


def _imovel_snapshot(imovel: Imovel) -> dict:
    """Extract a dict snapshot of the imovel's current data."""
    snap = {}
    for f in SNAPSHOT_FIELDS:
        v = getattr(imovel, f, None)
        if v is not None:
            snap[f] = v
    # Include dados_extras if present
    if imovel.dados_extras:
        snap["dados_extras"] = dict(imovel.dados_extras)
    return snap


def _score_pair(
    registro: dict,
    imovel: Imovel,
    w_address: float = 0.4,
    w_geo: float = 0.3,
    w_area: float = 0.3,
) -> float:
    """Score similarity between a registro and an imovel.

    Same algorithm as AdaptiveMatcher._score but as a pure function.
    """
    # Address similarity
    reg_addr = " ".join(
        filter(
            None,
            [
                registro.get("logradouro"),
                registro.get("numero"),
                registro.get("bairro"),
            ],
        )
    )
    im_addr = " ".join(
        filter(
            None,
            [
                imovel.logradouro,
                imovel.numero,
                imovel.bairro,
            ],
        )
    )
    addr_score = _fuzzy_ratio(reg_addr, im_addr) if reg_addr and im_addr else 0.0

    # Geo similarity
    geo_score = 0.0
    reg_lat = registro.get("latitude")
    reg_lng = registro.get("longitude")
    if reg_lat and reg_lng and imovel.latitude and imovel.longitude:
        dist = _geo_distance_km(float(reg_lat), float(reg_lng), imovel.latitude, imovel.longitude)
        geo_score = max(0.0, 1.0 - dist / 0.5)

    # Area similarity
    reg_area = registro.get("area_construida_m2") or registro.get("area_total_m2")
    im_area = imovel.area_construida_m2 or imovel.area_total_m2
    area_score = _area_similarity(
        float(reg_area) if reg_area else None,
        im_area,
    )

    # Always divide by total weight (1.0) to avoid inflating scores
    # when only one component matches.
    return w_address * addr_score + w_geo * geo_score + w_area * area_score


class SimilarityRanker:
    """Rank golden records by similarity. Stateless, batch-friendly.

    Usage:
        ranker = SimilarityRanker(top_n=5)
        results = ranker.rank(registro, golden_records)
        # results = [{imovel_id, score, rank, snapshot}, ...]
    """

    def __init__(self, top_n: int = 5) -> None:
        self.top_n = top_n

    def rank(self, registro: dict, golden: list[Imovel]) -> list[dict]:
        """Score all golden records and return top N.

        Applies city blocking to reduce comparisons.
        Returns list sorted by score descending, with rank 1..N.
        """
        reg_cidade = (registro.get("cidade") or "").lower().strip()
        scored: list[tuple[float, Imovel]] = []

        for imovel in golden:
            # City blocking: skip different cities
            if reg_cidade and imovel.cidade and imovel.cidade.lower().strip() != reg_cidade:
                continue

            score = _score_pair(registro, imovel)
            if score > 0:
                scored.append((score, imovel))

        # Sort descending by score, take top N
        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[: self.top_n]

        results = []
        for rank_idx, (score, imovel) in enumerate(top, start=1):
            results.append(
                {
                    "imovel_id": str(imovel.id),
                    "score": round(score, 3),
                    "rank": rank_idx,
                    "snapshot": _imovel_snapshot(imovel),
                }
            )

        return results

    def rank_batch(
        self,
        registros: list[dict],
        golden: list[Imovel],
    ) -> list[list[dict]]:
        """Rank multiple registros against the same golden set.

        Designed for bulk generation. Golden records are loaded once,
        then each registro is ranked against them. This method is
        the hot path — keep it CPU-only, no I/O.
        """
        return [self.rank(reg, golden) for reg in registros]
