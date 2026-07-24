"""Tests for AdaptiveMatcher: find_matches, geo distance, fuzzy ratio."""

from __future__ import annotations

from uuid import uuid4

from petrus.domain.entities.imovel import Imovel
from petrus.infrastructure.mdm.matcher import (
    AdaptiveMatcher,
    _fuzzy_ratio,
    _geo_distance_km,
)


def _make_imovel(**kwargs) -> Imovel:
    defaults = {
        "id": uuid4(),
        "titulo": "Galpão Teste",
        "tipo": "galpao",
        "categoria": "logistico",
        "cidade": "Barueri",
        "publicado": False,
    }
    defaults.update(kwargs)
    return Imovel(**defaults)


class TestGeoDistance:
    def test_same_point(self):
        assert _geo_distance_km(-23.5, -46.8, -23.5, -46.8) == 0.0

    def test_known_distance(self):
        # Barueri to São Paulo centro ~25km
        d = _geo_distance_km(-23.5115, -46.8764, -23.5505, -46.6333)
        assert 20 < d < 30

    def test_very_close(self):
        d = _geo_distance_km(-23.5, -46.8, -23.501, -46.801)
        assert d < 0.2


class TestFuzzyRatio:
    def test_identical(self):
        assert _fuzzy_ratio("Rua Amazonas", "Rua Amazonas") == 1.0

    def test_similar(self):
        r = _fuzzy_ratio("Rua Amazonas", "Rua Amazonaz")
        assert r > 0.7

    def test_different(self):
        r = _fuzzy_ratio("Rua Amazonas", "Av Paulista")
        assert r < 0.3

    def test_empty(self):
        assert _fuzzy_ratio("", "Rua A") == 0.0
        assert _fuzzy_ratio("Rua A", "") == 0.0

    def test_short_identical_strings(self):
        # Identical strings return 1.0 via early exit, even if short
        assert _fuzzy_ratio("ab", "ab") == 1.0

    def test_short_different_strings(self):
        # Different strings shorter than 3 chars produce no trigrams
        assert _fuzzy_ratio("ab", "cd") == 0.0


class TestAdaptiveMatcher:
    def setup_method(self):
        self.matcher = AdaptiveMatcher()
        self.imovel = _make_imovel(
            cidade="Barueri",
            logradouro="Rua Amazonas",
            numero="100",
            bairro="Alphaville",
            latitude=-23.5,
            longitude=-46.8,
            area_construida_m2=1500.0,
        )

    def test_high_score_match(self):
        registro = {
            "__id": "r1",
            "cidade": "Barueri",
            "logradouro": "Rua Amazonas",
            "numero": "100",
            "bairro": "Alphaville",
            "latitude": -23.5,
            "longitude": -46.8,
            "area_construida_m2": 1500.0,
        }
        results = self.matcher.find_matches(registro, [self.imovel])
        assert len(results) == 1
        assert results[0].tipo == "match"
        assert results[0].score >= 0.75

    def test_different_city_blocked(self):
        registro = {
            "__id": "r1",
            "cidade": "Osasco",
            "logradouro": "Rua Amazonas",
        }
        results = self.matcher.find_matches(registro, [self.imovel])
        assert len(results) == 0

    def test_no_golden_records(self):
        registro = {"__id": "r1", "cidade": "Barueri"}
        results = self.matcher.find_matches(registro, [])
        assert results == []

    def test_low_score_skipped(self):
        registro = {
            "__id": "r1",
            "cidade": "Barueri",
            "logradouro": "Av Paulista",
            "bairro": "Centro",
            "area_construida_m2": 50.0,
        }
        results = self.matcher.find_matches(registro, [self.imovel])
        # Low similarity address + very different area = low score
        assert all(r.score < 0.75 for r in results) or len(results) == 0

    def test_candidate_threshold(self):
        registro = {
            "__id": "r1",
            "cidade": "Barueri",
            "logradouro": "Rua Amazonia",  # similar but not exact
            "bairro": "Alphaville",
            "area_construida_m2": 1400.0,  # close area
        }
        results = self.matcher.find_matches(registro, [self.imovel])
        assert len(results) >= 1
        # Could be match or candidato depending on exact scores

    def test_results_sorted_by_score(self):
        imovel2 = _make_imovel(
            cidade="Barueri",
            logradouro="Rua Amazonas",
            numero="200",
            bairro="Alphaville",
            area_construida_m2=1500.0,
        )
        registro = {
            "__id": "r1",
            "cidade": "Barueri",
            "logradouro": "Rua Amazonas",
            "numero": "100",
            "bairro": "Alphaville",
            "area_construida_m2": 1500.0,
        }
        results = self.matcher.find_matches(registro, [self.imovel, imovel2])
        if len(results) >= 2:
            assert results[0].score >= results[1].score
