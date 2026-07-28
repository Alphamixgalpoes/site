"""SourceAdapter for ClickGalpoes (Next.js) scraper data."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.transforms.numbers import parse_br_number


class ClickGalpoesAdapter(SourceAdapter):
    """Transforms raw dicts from NextJsScraper into CanonicalRecords.

    Handles data from: ClickGalpoes.
    Key feature: coordinates from Next.js hydration payload.
    """

    source_type = "clickgalpoes"

    def __init__(self, config: dict | None = None) -> None:
        self._config = config or {}

    def extract(self, content: bytes, config: dict) -> list[dict[str, Any]]:
        try:
            return json.loads(content)
        except (json.JSONDecodeError, ValueError):
            return []

    def transform(self, raw: dict[str, Any]) -> CanonicalRecord:
        lat = _safe_float(raw.get("latitude"))
        lng = _safe_float(raw.get("longitude"))

        return CanonicalRecord(
            titulo=raw.get("title"),
            endereco=raw.get("address"),
            cidade=raw.get("city"),
            bairro=raw.get("neighborhood"),
            latitude=lat,
            longitude=lng,
            area_total_m2=_p(raw.get("totalArea")),
            area_construida_m2=_p(raw.get("builtArea")),
            pe_direito_m=_p(raw.get("ceilingHeight")),
            numero_docas=_i(raw.get("docks")),
            vagas_estacionamento=_i(raw.get("parkingSpots")),
            valor_locacao=_p(raw.get("rentPrice")),
            valor_venda=_p(raw.get("salePrice")),
            tipo_operacao=_detect_op(raw),
            tipo="galpao",
            observacoes=raw.get("description"),
            source_url=raw.get("url"),
            source_id=_extract_slug(raw),
            data_coleta=datetime.now(),
            dados_extras=_extras(raw),
        )


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return f if f != 0.0 else None
    except (ValueError, TypeError):
        return None


def _p(val: Any) -> float | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    try:
        return parse_br_number(str(val))
    except (ValueError, TypeError):
        return None


def _i(val: Any) -> int | None:
    n = _p(val)
    return int(n) if n is not None else None


def _detect_op(raw: dict) -> str:
    if raw.get("rentPrice") and raw.get("salePrice"):
        return "ambos"
    if raw.get("salePrice"):
        return "venda"
    return "locacao"


def _extract_slug(raw: dict) -> str:
    url = raw.get("url", "")
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""


def _extras(raw: dict) -> dict:
    extras: dict = {}
    if raw.get("images"):
        extras["imagens_fonte"] = raw["images"][:20]
    return extras
