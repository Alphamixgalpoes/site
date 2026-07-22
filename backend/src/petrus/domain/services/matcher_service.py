from __future__ import annotations

from abc import ABC, abstractmethod

from petrus.domain.entities.imovel import Imovel
from petrus.domain.entities.mdm_types import MatchResult


class MatcherService(ABC):
    @abstractmethod
    def find_matches(
        self, registro: dict, golden_records: list[Imovel]
    ) -> list[MatchResult]: ...
