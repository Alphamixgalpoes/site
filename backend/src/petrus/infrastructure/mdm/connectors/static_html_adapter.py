"""SourceAdapter for static HTML scraper data."""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.transforms.numbers import parse_br_number


class StaticHtmlAdapter(SourceAdapter):
    """Transforms raw dicts from StaticHtmlScraper into CanonicalRecords.

    Handles data from: Imob. Cajamar, 4R, Alpha Marco, Francis.
    """

    source_type = "static_html"

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
            cidade=_extract_city(raw),
            bairro=raw.get("neighborhood"),
            area_total_m2=_parse_num(raw.get("area_total") or raw.get("totalArea")),
            area_construida_m2=_parse_num(raw.get("area_construida") or raw.get("builtArea")),
            pe_direito_m=_parse_num(raw.get("pe_direito") or raw.get("ceilingHeight")),
            numero_docas=_parse_int(raw.get("docas") or raw.get("docks")),
            vagas_estacionamento=_parse_int(raw.get("vagas") or raw.get("parkingSpots")),
            valor_locacao=_extract_price(raw, "locacao"),
            valor_venda=_extract_price(raw, "venda"),
            tipo_operacao=raw.get("tipo_operacao", _detect_operation(raw)),
            tipo=raw.get("tipo", "galpao"),
            observacoes=raw.get("description"),
            source_url=raw.get("url"),
            source_id=raw.get("reference"),
            data_coleta=datetime.now(),
            dados_extras=_build_extras(raw),
        )


def _parse_num(val: Any) -> float | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    try:
        return parse_br_number(str(val))
    except (ValueError, TypeError):
        return None


def _parse_int(val: Any) -> int | None:
    num = _parse_num(val)
    return int(num) if num is not None else None


def _extract_city(raw: dict) -> str | None:
    city = raw.get("city") or raw.get("cidade")
    if city:
        return city
    address = raw.get("address") or raw.get("location_text") or ""
    parts = [p.strip() for p in address.split("-")]
    return parts[-1] if len(parts) > 1 else None


def _extract_price(raw: dict, op: str) -> float | None:
    price_text = raw.get("price_text", "")
    if not price_text:
        if op == "locacao":
            return _parse_num(raw.get("rentPrice") or raw.get("valor_locacao"))
        return _parse_num(raw.get("salePrice") or raw.get("valor_venda"))

    price_text_lower = price_text.lower()
    nums = re.findall(r"[\d.,]+", price_text.replace(".", "").replace(",", "."))
    if not nums:
        return None

    val = _parse_num(nums[0])
    is_monthly = "mês" in price_text_lower or "mes" in price_text_lower or "/m" in price_text_lower
    if op == "locacao" and is_monthly:
        return val
    if op == "venda" and ("venda" in price_text_lower or "vend" in price_text_lower):
        return val
    return None


def _detect_operation(raw: dict) -> str:
    text = (raw.get("price_text", "") + " " + raw.get("title", "")).lower()
    if "venda" in text:
        if "locação" in text or "aluguel" in text or "locacao" in text:
            return "ambos"
        return "venda"
    return "locacao"


def _build_extras(raw: dict) -> dict:
    extras: dict = {}
    if raw.get("images"):
        extras["imagens_fonte"] = raw["images"][:20]
    if raw.get("description"):
        extras["descricao_fonte"] = raw["description"][:1000]
    return extras
