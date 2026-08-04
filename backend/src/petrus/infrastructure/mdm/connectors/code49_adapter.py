"""SourceAdapter for Code49 platform scraper data."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.transforms.numbers import parse_br_number

# Regions that appear as "cidade" but are actually neighborhoods/regions
_REGION_TO_CITY: dict[str, tuple[str, str]] = {
    "alphaville": ("Barueri", "SP"),
    "alphaville industrial": ("Barueri", "SP"),
    "alphaville empresarial": ("Barueri", "SP"),
    "tamboré": ("Barueri", "SP"),
    "tambore": ("Barueri", "SP"),
}


class Code49Adapter(SourceAdapter):
    """Transforms raw dicts from Code49Scraper into CanonicalRecords.

    Handles data from: Caixeta, IMOBPARC, MK Prime, Claudio Alphaville.
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
        # Ensure price fields are populated (fallback from price_text)
        _ensure_prices(raw)

        # Parse city + UF if combined (e.g. "Barueri - SP")
        city = raw.get("city") or raw.get("cidade") or ""
        uf = None
        if " - " in city:
            city, uf = city.rsplit(" - ", 1)
            city = city.strip()
            uf = uf.strip()

        # Normalize region names used as city (e.g. "Alphaville" → "Barueri")
        region = raw.get("region")
        city_lower = city.lower()
        if city_lower in _REGION_TO_CITY:
            real_city, real_uf = _REGION_TO_CITY[city_lower]
            if not region:
                region = city  # preserve original as region
            city = real_city
            uf = uf or real_uf

        return CanonicalRecord(
            titulo=raw.get("title"),
            endereco=raw.get("address"),
            cidade=city or None,
            uf=uf,
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
            source_id=str(
                raw.get("_source_id")
                or raw.get("source_id")
                or raw.get("id")
                or raw.get("code")
                or ""
            ),
            data_coleta=datetime.now(),
            dados_extras=_extras(raw),
        )


def _ensure_prices(raw: dict) -> None:
    """Populate rentPrice/salePrice from price_text if missing."""
    if raw.get("rentPrice") or raw.get("salePrice"):
        return
    price_text = raw.get("price_text", "")
    if not price_text:
        return
    import re

    prices = re.findall(r"R\$\s*([\d.,]+)", price_text)
    text_lower = price_text.lower()
    if "venda" in text_lower and "locacao" in text_lower and len(prices) >= 2:
        raw["salePrice"] = prices[0]
        raw["rentPrice"] = prices[1]
    elif "venda" in text_lower and prices:
        raw["salePrice"] = prices[0]
    elif any(w in text_lower for w in ("locacao", "locação", "aluguel")) and prices:
        raw["rentPrice"] = prices[0]
    elif prices:
        raw["salePrice"] = prices[0]


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
    prop_type = (raw.get("property_type") or raw.get("type") or "").lower()
    title = (raw.get("title") or "").lower()
    text = f"{prop_type} {title}"

    if "galp" in text or "barrac" in text:
        return "galpao"
    if "terreno" in text or "lote" in text:
        return "terreno"
    if "apartamento" in text or "duplex" in text or "cobertura" in text:
        return "apartamento"
    if "prédio" in text or "predio" in text or "andar" in text:
        return "predio_comercial"
    if "sobreloja" in text:
        return "loja"
    if "loja" in text:
        return "loja"
    if "sala" in text:
        return "sala"
    if "casa" in text or "mansão" in text or "mansao" in text or "sobrado" in text:
        return "casa"
    if "rural" in text or "chácara" in text or "chacara" in text or "sítio" in text:
        return "rural"
    return "outro"


def _extras(raw: dict) -> dict:
    extras: dict = {}
    if raw.get("images"):
        extras["imagens_fonte"] = raw["images"][:20]
    price_text = raw.get("price_text")
    if price_text:
        extras["price_text_original"] = price_text
    return extras
