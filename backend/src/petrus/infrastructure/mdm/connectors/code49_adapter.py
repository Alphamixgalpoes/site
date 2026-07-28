"""SourceAdapter for Code49 platform scraper data."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.transforms.numbers import parse_br_number


class Code49Adapter(SourceAdapter):
    """Transforms raw dicts from Code49Scraper into CanonicalRecords.

    Handles data from: Caixeta, IMOBPARC, MK Prime.
    """

    source_type = "code49"

    def __init__(self, config: dict | None = None) -> None:
        self._config = config or {}

    def extract(self, content: bytes, config: dict) -> list[dict[str, Any]]:
        try:
            return json.loads(content)
        except (json.JSONDecodeError, ValueError):
            return []

    def transform(self, raw: dict[str, Any]) -> CanonicalRecord:
        return CanonicalRecord(
            titulo=raw.get("title"),
            endereco=raw.get("address"),
            cidade=raw.get("city") or raw.get("cidade"),
            bairro=raw.get("neighborhood") or raw.get("bairro"),
            area_total_m2=_p(raw.get("totalArea") or raw.get("area_total")),
            area_construida_m2=_p(raw.get("builtArea") or raw.get("area_construida")),
            pe_direito_m=_p(raw.get("ceilingHeight") or raw.get("pe_direito")),
            numero_docas=_i(raw.get("docks") or raw.get("docas")),
            vagas_estacionamento=_i(raw.get("parkingSpots") or raw.get("vagas")),
            potencia_eletrica_kva=_i(raw.get("electricPower") or raw.get("eletrica")),
            valor_locacao=_p(raw.get("rentPrice") or raw.get("valor_locacao")),
            valor_venda=_p(raw.get("salePrice") or raw.get("valor_venda")),
            tipo_operacao=_detect_op(raw),
            tipo=_detect_tipo(raw),
            status=raw.get("status"),
            observacoes=raw.get("description"),
            source_url=raw.get("url"),
            source_id=str(raw.get("id", raw.get("code", ""))),
            data_coleta=datetime.now(),
            dados_extras=_extras(raw),
        )


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
    if raw.get("salePrice") or raw.get("valor_venda"):
        return "venda"
    text = ((raw.get("title") or "") + " " + (raw.get("type") or "")).lower()
    if "venda" in text:
        return "venda"
    return "locacao"


def _detect_tipo(raw: dict) -> str:
    text = ((raw.get("type") or "") + " " + (raw.get("title") or "")).lower()
    if "terreno" in text:
        return "terreno"
    if "sala" in text:
        return "sala"
    if "loja" in text:
        return "loja"
    return "galpao"


def _extras(raw: dict) -> dict:
    extras: dict = {}
    if raw.get("images"):
        extras["imagens_fonte"] = raw["images"][:20]
    price_text = raw.get("price_text")
    if price_text:
        extras["price_text_original"] = price_text
    return extras
