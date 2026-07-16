from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class GeoResult:
    lat: float | None = None
    lng: float | None = None


@dataclass
class ReverseGeoResult:
    logradouro: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    cep: str | None = None


class GeocodingService(ABC):
    @abstractmethod
    async def forward(
        self,
        endereco: str = "",
        bairro: str = "",
        cidade: str = "",
        cep: str = "",
    ) -> GeoResult: ...

    @abstractmethod
    async def reverse(self, lat: float, lng: float) -> ReverseGeoResult: ...
