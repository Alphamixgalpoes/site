"""SourceAdapter for WordPress + Houzez platform scraper data."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.transforms.numbers import parse_br_number


class WordPressAdapter(SourceAdapter):
    """Transforms raw dicts from WordPressScraper into CanonicalRecords.

    Handles data from: Sempre Negocios.
    Key advantage: JSON-LD often contains GPS coordinates.
    """

    source_type = "wordpress_houzez"

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
            uf=raw.get("state", "SP"),
            cep=raw.get("cep"),
            latitude=lat,
            longitude=lng,
            area_total_m2=_p(raw.get("area_total")),
            area_construida_m2=_p(raw.get("area_construida")),
            pe_direito_m=_p(raw.get("pe_direito")),
            numero_docas=_i(raw.get("docas")),
            vagas_estacionamento=_i(raw.get("vagas")),
            valor_locacao=_extract_wp_price(raw, "locacao"),
            valor_venda=_extract_wp_price(raw, "venda"),
            tipo_operacao=_detect_op(raw),
            tipo=_detect_tipo(raw),
            observacoes=raw.get("description"),
            source_url=raw.get("url"),
            source_id=raw.get("source_id"),
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


def _extract_wp_price(raw: dict, op: str) -> float | None:
    import re
    price_text = raw.get("price_text", "")
    if not price_text:
        return None

    lower = price_text.lower()
    nums = re.findall(r"\d[\d.,]*", price_text)
    if not nums:
        return None

    cleaned = nums[0].replace(".", "").replace(",", ".")
    try:
        val = float(cleaned)
    except ValueError:
        return None

    if op == "locacao" and ("mês" in lower or "/m" in lower or "aluguel" in lower):
        return val
    if op == "venda" and ("venda" in lower):
        return val
    if op == "locacao" and "venda" not in lower:
        return val
    return None


def _detect_op(raw: dict) -> str:
    title = (raw.get("title") or "").lower()
    if "venda" in title:
        if "locação" in title or "aluguel" in title:
            return "ambos"
        return "venda"
    return "locacao"


def _detect_tipo(raw: dict) -> str:
    title = (raw.get("title") or "").lower()
    if "terreno" in title:
        return "terreno"
    if "sala" in title:
        return "sala"
    if "loja" in title:
        return "loja"
    return "galpao"


def _extras(raw: dict) -> dict:
    extras: dict = {}
    if raw.get("images"):
        extras["imagens_fonte"] = raw["images"][:20]
    jsonld = raw.get("jsonld")
    if jsonld:
        extras["jsonld_type"] = jsonld.get("@type")
    return extras
