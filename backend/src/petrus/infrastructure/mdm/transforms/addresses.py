"""Address normalization: street canonicalization, complement extraction, sub-address detection."""

from __future__ import annotations

import re

from petrus.infrastructure.mdm.transforms.text import strip_accents

# ---------------------------------------------------------------------------
# Regex patterns for address components
# ---------------------------------------------------------------------------

# Complement in street name: G01, Lj06, L01, etc.
COMPLEMENT_RE = re.compile(
    r"\s+(G\s*\d+\w?|Lj?\s*\d+|L\s*\d+|loja?\s*\d+)(.*)$",
    re.IGNORECASE,
)

# Number leaked into street name with spaces: "Araguaia       910"
NUMBER_IN_STREET_RE = re.compile(r"^(.+?)\s{2,}(\d+)$")

# Sub-address qualifiers: Asia Térreo, Asia 1º andar, etc.
SUB_ENDERECO_RE = re.compile(
    r"\b(Térreo|Terreo|1º\s*andar|2º\s*andar|3º\s*andar|4º\s*andar|"
    r"Res|WLC|Euro)\s*$",
    re.IGNORECASE,
)

# Single letter sub-address: Amazonas A, Amazonas B
SUB_LETTER_RE = re.compile(r"^(.+?)\s+([A-Z])\s*$")


def canonicalize_street(
    raw_key: str,
    street_canonical: dict[str, str],
    street_info: dict[str, tuple[str, str]],
) -> tuple[str, str]:
    """Resolve a raw street key to (logradouro_tipo, nome_oficial).

    Falls back to accent-stripped lookup. Returns ("Rua", raw_key) if not found.
    """
    canonical = street_canonical.get(raw_key)
    if not canonical:
        canonical = street_canonical.get(strip_accents(raw_key))
    if canonical and canonical in street_info:
        return street_info[canonical]
    return ("Rua", raw_key if raw_key else "")


def normalize_address(
    rua: str,
    numero_raw: str,
    regiao: str,
    street_canonical: dict[str, str],
    street_info: dict[str, tuple[str, str]],
    region_city_map: dict[str, tuple[str, str]],
) -> dict[str, str]:
    """Normalize a raw address into structured components.

    Returns dict with keys: logradouro, numero, complemento, unidade, endereco_completo.
    """
    complement = ""
    unidade = None

    # Extract complement from street name (G01, Lj06, etc.)
    m_compl = COMPLEMENT_RE.search(rua)
    if m_compl:
        compl_text = m_compl.group(1).strip()
        if re.match(r"^G\s*\d", compl_text, re.IGNORECASE):
            unidade = re.sub(r"\s+", "", compl_text).upper()
        else:
            complement = compl_text
        rua = rua[: m_compl.start()].strip()

    # Extract sub-address qualifiers (Térreo, 1º andar, etc.)
    m_sub = SUB_ENDERECO_RE.search(rua)
    if m_sub:
        if complement:
            complement += " " + m_sub.group(1).strip()
        else:
            complement = m_sub.group(1).strip()
        rua = rua[: m_sub.start()].strip()

    # Single letter sub-address (Amazonas A, Amazonas B)
    if not complement:
        m_letter = SUB_LETTER_RE.match(rua)
        if m_letter:
            complement = m_letter.group(2)
            rua = m_letter.group(1).strip()

    # Detect leaked numbers (e.g., "Araguaia       910")
    leaked_number = ""
    m_leaked = NUMBER_IN_STREET_RE.search(rua)
    if m_leaked:
        leaked_number = m_leaked.group(2).strip()
        rua = m_leaked.group(1).strip()

    # Normalize street key
    street_key = rua.lower().strip()
    street_key = re.sub(r"\s+", " ", street_key).strip()
    street_key = re.sub(r"\s*\*+\s*$", "", street_key).strip()

    # Lookup canonical name
    logradouro_tipo, nome_oficial = canonicalize_street(
        street_key, street_canonical, street_info
    )

    # Clean number
    numero = numero_raw
    if leaked_number and not numero:
        numero = leaked_number
    if numero:
        if re.match(r"^[\d.]+$", numero):
            numero = numero.replace(".", "")
        elif re.match(r"^[\d.]+/[\d.]+$", numero):
            parts = numero.split("/")
            numero = "/".join(p.replace(".", "") for p in parts)

    # Build full address
    cidade, bairro = region_city_map.get(regiao, ("", ""))
    logradouro = f"{logradouro_tipo} {nome_oficial}".strip() if nome_oficial else ""
    parts = [logradouro] if logradouro else []
    addr_str = ", ".join(parts)
    if numero:
        addr_str += f", {numero}"
    if bairro:
        addr_str += f" - {bairro}"
    if cidade:
        addr_str += f", {cidade} - SP"

    return {
        "logradouro": logradouro,
        "numero": numero,
        "complemento": complement,
        "unidade": unidade,
        "endereco_completo": addr_str,
    }
