from __future__ import annotations

import math

from petrus.domain.entities.imovel import Imovel
from petrus.domain.entities.mdm_types import MatchResult
from petrus.domain.services.matcher_service import MatcherService

MATCH_THRESHOLD = 0.75
CANDIDATE_THRESHOLD = 0.50


def _geo_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _fuzzy_ratio(a: str, b: str) -> float:
    """Simple character-level similarity (Jaccard on trigrams)."""
    if not a or not b:
        return 0.0
    a, b = a.lower().strip(), b.lower().strip()
    if a == b:
        return 1.0
    tri_a = {a[i : i + 3] for i in range(len(a) - 2)}
    tri_b = {b[i : i + 3] for i in range(len(b) - 2)}
    if not tri_a or not tri_b:
        return 0.0
    return len(tri_a & tri_b) / len(tri_a | tri_b)


def _area_similarity(a: float | None, b: float | None) -> float:
    if a is None or b is None or a == 0 or b == 0:
        return 0.0
    ratio = min(a, b) / max(a, b)
    return ratio


class AdaptiveMatcher(MatcherService):
    def __init__(
        self,
        w_address: float = 0.4,
        w_geo: float = 0.3,
        w_area: float = 0.3,
    ) -> None:
        self.w_address = w_address
        self.w_geo = w_geo
        self.w_area = w_area

    def find_matches(
        self, registro: dict, golden_records: list[Imovel]
    ) -> list[MatchResult]:
        reg_cidade = (registro.get("cidade") or "").lower().strip()
        results: list[MatchResult] = []

        for imovel in golden_records:
            # Blocking: same city
            if reg_cidade and imovel.cidade and imovel.cidade.lower().strip() != reg_cidade:
                continue

            score = self._score(registro, imovel)
            campos_diferentes = self._diff_campos(registro, imovel)

            if score >= MATCH_THRESHOLD:
                tipo = "match"
            elif score >= CANDIDATE_THRESHOLD:
                tipo = "candidato"
            else:
                continue  # skip low scores

            results.append(MatchResult(
                registro_id=registro.get("__id", ""),
                imovel_id=str(imovel.id),
                score=round(score, 3),
                tipo=tipo,
                campos_diferentes=campos_diferentes,
            ))

        return sorted(results, key=lambda r: r.score, reverse=True)

    def _score(self, registro: dict, imovel: Imovel) -> float:
        # Address similarity
        reg_addr = " ".join(filter(None, [
            registro.get("logradouro"), registro.get("numero"), registro.get("bairro"),
        ]))
        im_addr = " ".join(filter(None, [
            imovel.logradouro, imovel.numero, imovel.bairro,
        ]))
        addr_score = _fuzzy_ratio(reg_addr, im_addr) if reg_addr and im_addr else 0.0

        # Geo similarity
        geo_score = 0.0
        reg_lat = registro.get("latitude")
        reg_lng = registro.get("longitude")
        if reg_lat and reg_lng and imovel.latitude and imovel.longitude:
            dist = _geo_distance_km(float(reg_lat), float(reg_lng), imovel.latitude, imovel.longitude)
            geo_score = max(0.0, 1.0 - dist / 0.5)  # 0.5km = 0 similarity

        # Area similarity
        reg_area = registro.get("area_construida_m2") or registro.get("area_total_m2")
        im_area = imovel.area_construida_m2 or imovel.area_total_m2
        area_score = _area_similarity(
            float(reg_area) if reg_area else None,
            im_area,
        )

        total_weight = 0.0
        total_score = 0.0
        if addr_score > 0:
            total_weight += self.w_address
            total_score += self.w_address * addr_score
        if geo_score > 0:
            total_weight += self.w_geo
            total_score += self.w_geo * geo_score
        if area_score > 0:
            total_weight += self.w_area
            total_score += self.w_area * area_score

        if total_weight == 0:
            return 0.0
        return total_score / total_weight

    def _diff_campos(self, registro: dict, imovel: Imovel) -> list[str]:
        diff = []
        compare_fields = [
            "titulo", "valor", "area_construida_m2", "area_total_m2",
            "pe_direito_m", "numero_docas", "endereco", "bairro",
        ]
        for f in compare_fields:
            reg_val = registro.get(f)
            im_val = getattr(imovel, f, None)
            if reg_val is not None and im_val is not None and str(reg_val) != str(im_val):
                diff.append(f)
            elif reg_val is not None and im_val is None:
                diff.append(f)
        return diff
