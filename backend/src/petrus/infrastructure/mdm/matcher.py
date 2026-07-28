"""Scoring utility functions for property similarity.

Used by SimilarityRanker. Kept as a separate module for testability.
"""

from __future__ import annotations

import math


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
