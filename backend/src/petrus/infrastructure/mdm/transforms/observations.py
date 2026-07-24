"""Extract structured fields from free-text observation fields."""

from __future__ import annotations

import re
from typing import Any

from petrus.infrastructure.mdm.transforms.numbers import parse_br_number

# ---------------------------------------------------------------------------
# Default observation extraction patterns
# ---------------------------------------------------------------------------

OBS_PATTERNS: dict[str, re.Pattern] = {
    "docas": re.compile(r"(\d+)\s*docas?|s/doca", re.IGNORECASE),
    "pe_direito": re.compile(
        r"(?:PD|P\.?\s*[Dd]ireito|Pd)\s*(\d+[.,]?\d*)|(\d+[.,]?\d*)\s*PD",
        re.IGNORECASE,
    ),
    "vagas": re.compile(r"(\d+)\s*vag(?:as?|s)", re.IGNORECASE),
    "area_escritorio": re.compile(
        r"(\d+[.]?\d*)\s*(?:escr|esc\b)", re.IGNORECASE
    ),
    "area_mezanino": re.compile(r"(\d+)\s*(?:mezan|mez\b)", re.IGNORECASE),
    "kva": re.compile(r"(\d+)\s*[Kk][Vv][Aa]", re.IGNORECASE),
    "elevador": re.compile(r"\b(?:Elev(?:ador)?)\b", re.IGNORECASE),
    "gerador": re.compile(r"\b(?:Gerador|gerad)\b", re.IGNORECASE),
    "cab_primaria": re.compile(
        r"(?:cab\.?\s*prim|cabine?\s*prim)", re.IGNORECASE
    ),
    "ponte_rolante": re.compile(
        r"(?:ponte\s*rolante|(\d+)\s*ton\b)", re.IGNORECASE
    ),
    "iptu": re.compile(r"IPTU\s*(?:R\$\s*)?(\d+[.,]?\d*)", re.IGNORECASE),
    "condominio": re.compile(
        r"cond\.?\s*(?:R\$\s*)?(\d+[.,]?\d*)", re.IGNORECASE
    ),
    "avcb": re.compile(r"\bAVCB\b", re.IGNORECASE),
    "zoneamento": re.compile(
        r"\b(ZUD|ZUP\s*\d*|ZPEI[- ]?\d*|Zind)\b", re.IGNORECASE
    ),
}

STATUS_RE = re.compile(
    r"\b(vago|vendido|obra|reformado|alugado)\b", re.IGNORECASE
)

# Words to skip when detecting tenant names
_TENANT_SKIP = {
    "PD", "KVA", "IPTU", "AVCB", "ESCR", "ESC", "CAB", "PRIM",
    "DOCA", "DOCAS", "VAGA", "VAGAS", "VAGO", "VENDIDO", "MEZ",
    "GERADOR", "ELEV", "ELEVADOR", "ZUP", "ZUD", "ZPEI", "ZIND",
}


def extract_observations(
    obs: str,
    patterns: dict[str, re.Pattern] | None = None,
) -> dict[str, Any]:
    """Extract structured fields from a free-text observation string.

    Returns dict with keys like: docas, pe_direito, vagas, area_escritorio,
    area_mezanino, kva, elevador, gerador, cab_primaria, ponte_rolante,
    iptu, condominio_valor, avcb, zoneamento, status, inquilino.
    """
    result: dict[str, Any] = {}
    if not obs:
        return result

    active_patterns = patterns if patterns is not None else OBS_PATTERNS

    for field_name, pattern in active_patterns.items():
        m = pattern.search(obs)
        if not m:
            continue

        raw_val = m.group(1) if m.lastindex and m.lastindex >= 1 else None
        if raw_val is None and m.lastindex and m.lastindex >= 2:
            raw_val = m.group(2)

        if field_name == "docas":
            if raw_val:
                try:
                    result["docas"] = int(re.sub(r"\D", "", raw_val))
                except ValueError:
                    pass
        elif field_name == "pe_direito":
            if raw_val:
                try:
                    result["pe_direito"] = float(
                        raw_val.replace(",", ".").strip()
                    )
                except ValueError:
                    pass
        elif field_name == "vagas":
            if raw_val:
                try:
                    result["vagas"] = int(re.sub(r"\D", "", raw_val))
                except ValueError:
                    pass
        elif field_name == "area_escritorio":
            if raw_val:
                v = parse_br_number(raw_val)
                if v:
                    result["area_escritorio"] = v
        elif field_name == "area_mezanino":
            if raw_val:
                try:
                    result["area_mezanino"] = float(raw_val)
                except ValueError:
                    pass
        elif field_name == "kva":
            if raw_val:
                try:
                    result["kva"] = int(re.sub(r"\D", "", raw_val))
                except ValueError:
                    pass
        elif field_name == "elevador":
            result["elevador"] = True
        elif field_name == "gerador":
            result["gerador"] = True
        elif field_name == "cab_primaria":
            result["cab_primaria"] = True
        elif field_name == "ponte_rolante":
            result["ponte_rolante"] = True
        elif field_name == "avcb":
            result["avcb"] = True
        elif field_name == "zoneamento":
            if raw_val:
                result["zoneamento"] = raw_val.strip()
        elif field_name == "iptu":
            if raw_val:
                v = parse_br_number(raw_val)
                if v:
                    result["iptu"] = v
        elif field_name == "condominio":
            if raw_val:
                v = parse_br_number(raw_val)
                if v:
                    result["condominio_valor"] = v

    # Status
    m_status = STATUS_RE.search(obs)
    if m_status:
        result["status"] = m_status.group(1).lower()

    # Inquilino: uppercase company names
    tenants = []
    for m_t in re.finditer(r"\b([A-Z][A-Z\s&.'-]{2,})\b", obs):
        name = m_t.group(1).strip()
        if name not in _TENANT_SKIP and len(name) > 2:
            tenants.append(name)
    if tenants:
        result["inquilino"] = "; ".join(tenants[:3])

    return result
