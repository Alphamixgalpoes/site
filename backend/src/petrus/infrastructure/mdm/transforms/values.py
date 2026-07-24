"""Value classification: rent vs sale detection, millions parsing, price/m2 extraction."""

from __future__ import annotations

import re
from typing import Any

from petrus.infrastructure.mdm.transforms.numbers import parse_br_number

# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

# "18milhões", "9,5milhões", "16milh", "13M", "9 mihões" (common typo)
MILHOES_RE = re.compile(
    r"(\d+[.,]?\d*)\s*(?:milh[oõôã]|milh\b|mihõ|mih[oô])", re.IGNORECASE
)
# "350mil", "40mil" — thousands, not millions
MIL_RE = re.compile(r"(\d+[.,]?\d*)\s*mil\b", re.IGNORECASE)
# "13M" — abbreviation for millions (uppercase M after digits)
M_ABBREV_RE = re.compile(r"(\d+[.,]?\d*)\s*M\b")
PM2_RE = re.compile(
    r"([\d.,]+)\s*(?:p/?m²|por\s*m²|p/\s*m²)", re.IGNORECASE
)
# Non-value text patterns — skip these entirely
SKIP_RE = re.compile(r"(?:ALUG\w*\s+\w+/|LOCAD|ALUGAD)", re.IGNORECASE)


def classify_value(valor_raw: str, obs: str = "") -> dict[str, Any]:
    """Classify a value field into rent, sale, or price/m2.

    Logic:
    - "VENDIDO" -> status vendido
    - Skip notes like "ALUG FEV/22" (not a value)
    - "X milhões/milh/M" -> sale price * 1_000_000
    - "X mil" -> value * 1_000
    - "X p/m²" -> price per square meter
    - Numeric > 1_000_000 -> sale
    - Numeric <= 1_000_000 -> rent
    - Also checks obs for secondary sale price in millions

    Returns dict with optional keys: tipo_operacao, valor_locacao, valor_venda,
    preco_m2, status.
    """
    result: dict[str, Any] = {}
    if not valor_raw:
        # Check obs for sale price
        m = MILHOES_RE.search(obs)
        if m:
            try:
                val = float(m.group(1).replace(",", "."))
                result["valor_venda"] = val * 1_000_000
                result["tipo_operacao"] = "venda"
            except ValueError:
                pass
        return result

    upper = valor_raw.upper().strip()

    if "VENDIDO" in upper:
        result["status"] = "vendido"
        return result

    # Skip non-value notes like "ALUG FEV/22", "LOCADO", "ALUGADO"
    if SKIP_RE.search(valor_raw):
        return result

    # Millions in text: "18milhões", "9,5milhões", "16milh", "9 mihões"
    # In the milhões context the number is always a small multiplier (1-100),
    # so treat both dot and comma as decimal separators (not thousands).
    m_milh = MILHOES_RE.search(upper)
    if m_milh:
        try:
            val = float(m_milh.group(1).replace(",", "."))
            result["valor_venda"] = val * 1_000_000
            result["tipo_operacao"] = "venda"
        except ValueError:
            pass
        return result

    # "13M" — uppercase M abbreviation for millions
    m_abbrev = M_ABBREV_RE.search(valor_raw)
    if m_abbrev:
        try:
            val = float(m_abbrev.group(1).replace(",", "."))
            result["valor_venda"] = val * 1_000_000
            result["tipo_operacao"] = "venda"
        except ValueError:
            pass
        return result

    # Thousands: "350mil", "40mil"
    m_mil = MIL_RE.search(upper)
    if m_mil:
        try:
            val = float(m_mil.group(1).replace(",", "."))
            parsed = val * 1_000
            if parsed > 1_000_000:
                result["valor_venda"] = parsed
                result["tipo_operacao"] = "venda"
            else:
                result["valor_locacao"] = parsed
                result["tipo_operacao"] = "locacao"
        except ValueError:
            pass
        return result

    # Price per m²
    m_pm2 = PM2_RE.search(valor_raw)
    if m_pm2:
        v = parse_br_number(m_pm2.group(1))
        if v:
            result["preco_m2"] = v
        return result

    # Parse as number
    val = parse_br_number(valor_raw)
    if val is None:
        return result

    if val > 1_000_000:
        result["valor_venda"] = val
        result["tipo_operacao"] = "venda"
    else:
        result["valor_locacao"] = val
        result["tipo_operacao"] = "locacao"

    # Also check obs for sale price
    m_obs = MILHOES_RE.search(obs)
    if m_obs and result.get("valor_venda") is None:
        try:
            v2 = float(m_obs.group(1).replace(",", "."))
            result["valor_venda"] = v2 * 1_000_000
            if result.get("valor_locacao"):
                result["tipo_operacao"] = "ambos"
            else:
                result["tipo_operacao"] = "venda"
        except ValueError:
            pass

    return result
