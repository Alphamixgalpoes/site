"""Tests for scoring utility functions used by SimilarityRanker."""

from __future__ import annotations

from petrus.infrastructure.mdm.matcher import (
    _fuzzy_ratio,
    _geo_distance_km,
)


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
        assert _fuzzy_ratio("ab", "ab") == 1.0

    def test_short_different_strings(self):
        assert _fuzzy_ratio("ab", "cd") == 0.0
