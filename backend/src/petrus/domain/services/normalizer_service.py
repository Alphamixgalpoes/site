from __future__ import annotations

from abc import ABC, abstractmethod


class NormalizerService(ABC):
    @abstractmethod
    def normalize(self, raw: dict, schema_map: dict) -> dict: ...

    @abstractmethod
    def compute_hash(self, normalized: dict) -> str: ...
