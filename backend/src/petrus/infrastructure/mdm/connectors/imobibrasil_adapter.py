"""SourceAdapter for ImobiBrasil platform scraper data."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.transforms.numbers import parse_br_number


class ImobiBrasilAdapter(SourceAdapter):
    """Transforms raw dicts from ImobiBrasilScraper into CanonicalRecords.

    Handles data from: Morar Imoveis Cajamar.
    """

    source_type = "imobibrasil"

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
            cidade=raw.get("city"),
            bairro=raw.get("neighborhood"),
            area_total_m2=_p(raw.get("area_total")),
            area_construida_m2=_p(raw.get("area_construida")),
            pe_direito_m=_p(raw.get("pe_direito")),
            numero_docas=_i(raw.get("docas")),
            vagas_estacionamento=_i(raw.get("vagas")),
            valor_locacao=_extract_price(raw, "locacao"),
            valor_venda=_extract_price(raw, "venda"),
            tipo_operacao=_detect_op(raw),
            tipo="galpao",
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


def _extract_price(raw: dict, op: str) -> float | None:
    import re
    price_text = raw.get("price_text", "")
    if not price_text:
        return None

    nums = re.findall(r"\d[\d.,]*", price_text)
    if not nums:
        return None

    cleaned = nums[0].replace(".", "").replace(",", ".")
    try:
        val = float(cleaned)
    except ValueError:
        return None

    lower = price_text.lower()
    if op == "locacao" and ("mês" in lower or "/m" in lower or "aluguel" in lower):
        return val
    if op == "venda" and "venda" in lower:
        return val
    if op == "locacao" and "venda" not in lower:
        return val
    return None


def _detect_op(raw: dict) -> str:
    title = (raw.get("title") or "").lower()
    if "venda" in title:
        return "venda"
    return "locacao"


def _extras(raw: dict) -> dict:
    extras: dict = {}
    if raw.get("images"):
        extras["imagens_fonte"] = raw["images"][:20]
    return extras
