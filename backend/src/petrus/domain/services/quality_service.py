from __future__ import annotations

from abc import ABC, abstractmethod

from petrus.domain.entities.imovel import Imovel
from petrus.domain.entities.mdm_types import QualidadeCampo


class QualityService(ABC):
    @abstractmethod
    def avaliar(self, imovel: Imovel) -> list[QualidadeCampo]: ...

    @abstractmethod
    def score_geral(self, campos: list[QualidadeCampo]) -> float: ...
