"""SourceAdapter for Union Softwares platform scraper data."""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.transforms.numbers import parse_br_number


class UnionAdapter(SourceAdapter):
    """Transforms raw dicts from UnionScraper into CanonicalRecords.

    Handles data from: Galpoes Gerais, Goldville, Nova Merito.
    """

    source_type = "union"

    def __init__(self, config: dict | None = None) -> None:
        self._config = config or {}

    def extract(self, content: bytes, config: dict) -> list[dict[str, Any]]:
        try:
            return json.loads(content)
        except (json.JSONDecodeError, ValueError):
            return []

    def transform(self, raw: dict[str, Any]) -> CanonicalRecord:
        cidade, bairro = _parse_location(raw)

        return CanonicalRecord(
            titulo=raw.get("title"),
            endereco=raw.get("address"),
            cidade=cidade,
            bairro=bairro,
            area_total_m2=_p(raw.get("area_total")),
            area_construida_m2=_p(raw.get("area_construida")),
            pe_direito_m=_p(raw.get("pe_direito")),
            numero_docas=_i(raw.get("docas")),
            vagas_estacionamento=_i(raw.get("vagas")),
            valor_locacao=_extract_price(raw, "locacao"),
            valor_venda=_extract_price(raw, "venda"),
            tipo_operacao=raw.get("tipo_operacao", "locacao"),
            tipo=raw.get("tipo", "galpao"),
            observacoes=raw.get("description"),
            source_url=raw.get("url"),
            source_id=raw.get("reference"),
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


def _parse_location(raw: dict) -> tuple[str | None, str | None]:
    location_text = raw.get("location_text", "")
    if not location_text:
        return raw.get("city"), raw.get("neighborhood")

    parts = [p.strip() for p in re.split(r"[-,/]", location_text)]
    if len(parts) >= 2:
        return parts[-1], parts[0]
    return parts[0] if parts else None, None


def _extract_price(raw: dict, op: str) -> float | None:
    price_text = raw.get("price_text", "")
    if not price_text:
        return None

    price_lower = price_text.lower()
    nums = re.findall(r"\d[\d.,]*", price_text)
    if not nums:
        return None

    cleaned = nums[0].replace(".", "").replace(",", ".")
    try:
        val = float(cleaned)
    except ValueError:
        return None

    if op == "locacao" and ("mês" in price_lower or "mes" in price_lower or "/m" in price_lower):
        return val
    if op == "venda" and ("venda" in price_lower):
        return val
    if op == "locacao" and "venda" not in price_lower:
        return val
    return None


def _extras(raw: dict) -> dict:
    extras: dict = {}
    if raw.get("images"):
        extras["imagens_fonte"] = raw["images"][:20]
    return extras
