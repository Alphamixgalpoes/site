from __future__ import annotations

from typing import Any

from petrus.domain.entities.imovel import Imovel
from petrus.domain.entities.mdm_types import MatchResult


def generate_cards(
    registro: dict,
    matches: list[MatchResult],
    fonte_id: str | None = None,
    fonte_registro_id: str | None = None,
    importacao_id: str | None = None,
) -> list[dict[str, Any]]:
    """Generate recommendation cards from match results."""
    cards: list[dict[str, Any]] = []

    base = {
        "fonte_id": fonte_id,
        "fonte_registro_id": fonte_registro_id,
        "importacao_id": importacao_id,
        "cidade": registro.get("cidade"),
        "bairro": registro.get("bairro"),
        "area": registro.get("area_construida_m2") or registro.get("area_total_m2"),
        "valor": registro.get("valor"),
    }

    if not matches:
        # No match → card criar
        cards.append({
            **base,
            "tipo": "criar",
            "dados_propostos": registro,
            "confianca": 0.0,
        })
        return cards

    for match in matches:
        if match.tipo == "match":
            if match.campos_diferentes:
                cards.append({
                    **base,
                    "tipo": "atualizar",
                    "imovel_id": match.imovel_id,
                    "dados_propostos": {k: registro.get(k) for k in match.campos_diferentes if k in registro},
                    "campos_alterados": match.campos_diferentes,
                    "confianca": match.score,
                    "score_match": match.score,
                })
            # If no differences, no card needed
        elif match.tipo == "candidato":
            cards.append({
                **base,
                "tipo": "mesclar",
                "imovel_id": match.imovel_id,
                "dados_propostos": registro,
                "confianca": match.score,
                "score_match": match.score,
                "mensagem": f"Score {match.score:.0%} — verificar se é o mesmo imóvel",
            })

    return cards
