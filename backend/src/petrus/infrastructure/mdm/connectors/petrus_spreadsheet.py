"""Adapter for the Petrus broker spreadsheet format.

Handles the specific CSV format used by the broker:
- Section markers (BARUERI, STA PARNAÍBA, etc.) that define regions
- Abbreviated street names mapped to canonical forms
- Structured data embedded in the Observações free-text field
- Owner/contact info mixed into property data
- Value field that can be rent, sale, or price/m²

The heavy config data (street mappings, section markers) is loaded from
a companion module (petrus_config) that can be regenerated from the
original pipeline/config.py.
"""

from __future__ import annotations

import csv
import io
import re
import unicodedata
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.connectors.petrus_config import (
    STREET_CANONICAL as _DEFAULT_STREET_CANONICAL,
    STREET_INFO as _DEFAULT_STREET_INFO,
)

# ---------------------------------------------------------------------------
# Section markers: map header strings to region names
# ---------------------------------------------------------------------------
SECTION_MARKERS: dict[str, str] = {
    "BARUERI": "Barueri",
    "STA PARNAÍBA": "Santana de Parnaíba",
    "STA PARNA\u00cdBA": "Santana de Parnaíba",
    "STA PARNAIBA": "Santana de Parnaíba",
    "COTIA": "Cotia",
    "CARAPICUÍBA": "Carapicuíba",
    "CARAPICU\u00cdBA": "Carapicuíba",
    "CARAPICUIBA": "Carapicuíba",
    "RAPOSO": "Raposo Tavares",
    "OSASCO": "Osasco",
    "OSASCO ": "Osasco",
    "POLO JANDIRA": "Polo Industrial Jandira",
    "FAZENDINHA": "Fazendinha",
    "ITAPEVI": "Itapevi",
    "ARAÇARIGUAMA": "Araçariguama",
    "ARA\u00c7ARIGUAMA": "Araçariguama",
    "ARACARIGUAMA": "Araçariguama",
    "SÃO ROQUE": "São Roque",
    "S\u00c3O ROQUE": "São Roque",
    "SAO ROQUE": "São Roque",
    "TERRENOS": "Terrenos",
}

# Region -> (cidade, bairro_default)
REGION_CITY_MAP: dict[str, tuple[str, str]] = {
    "Alphaville": ("Barueri", "Alphaville Industrial"),
    "Barueri": ("Barueri", ""),
    "Santana de Parnaíba": ("Santana de Parnaíba", ""),
    "Cotia": ("Cotia", ""),
    "Carapicuíba": ("Carapicuíba", ""),
    "Osasco": ("Osasco", ""),
    "Polo Industrial Jandira": ("Jandira", "Polo Industrial"),
    "Fazendinha": ("Santana de Parnaíba", "Fazendinha"),
    "Itapevi": ("Itapevi", ""),
    "Araçariguama": ("Araçariguama", ""),
    "São Roque": ("São Roque", ""),
    "Terrenos": ("", ""),
    "Raposo Tavares": ("Cotia", ""),
}

# Expected CSV columns
CSV_COLUMNS = ["End", "nº", "AT", "AC", "AF", "Observ.", "Valor",
               "Proprietário", "Telefones", "Local"]

# ---------------------------------------------------------------------------
# Regex patterns
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

# Observation field extraction patterns
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

# Value patterns
MILHOES_RE = re.compile(r"(\d+[.,]?\d*)\s*milh[oõô]", re.IGNORECASE)
PM2_RE = re.compile(
    r"([\d.,]+)\s*(?:p/?m²|por\s*m²|p/\s*m²)", re.IGNORECASE
)
STATUS_RE = re.compile(
    r"\b(vago|vendido|obra|reformado|alugado)\b", re.IGNORECASE
)

# Phone: sequences of 4+ digits
PHONE_RE = re.compile(r"[\d][\d.\-\s]{3,}[\d]")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.\w{2,}", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def _strip_accents(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.category(c).startswith("M"))


def _parse_br_number(s: str | None) -> float | None:
    if not s:
        return None
    s = s.strip()
    if not s:
        return None
    s = s.replace("..", ".").replace("R$", "").replace("r$", "").strip()
    cleaned = re.sub(r"[^\d.,\-]", "", s)
    if not cleaned or not re.search(r"\d", cleaned):
        return None
    if "," in cleaned:
        parts = cleaned.rsplit(",", 1)
        integer_part = parts[0].replace(".", "")
        decimal_part = parts[1] if len(parts) > 1 else "0"
        try:
            return float(f"{integer_part}.{decimal_part}")
        except ValueError:
            return None
    else:
        try:
            return float(cleaned.replace(".", ""))
        except ValueError:
            return None


def _parse_area(raw: str) -> float | None:
    if not raw:
        return None
    if re.search(r"[a-zA-Z]", raw) and not re.match(r"^[\d.,]+$", raw):
        return None
    return _parse_br_number(raw)


def _normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11:
        return f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
    elif len(digits) == 10:
        return f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
    elif len(digits) == 9:
        return f"{digits[:5]}-{digits[5:]}"
    elif len(digits) == 8:
        return f"{digits[:4]}-{digits[4:]}"
    elif len(digits) >= 4:
        return digits
    return raw.strip()


def _is_empty_row(row: dict[str, str]) -> bool:
    return all(not v or not v.strip() for v in row.values())


def _is_section_header(row: dict[str, str]) -> str | None:
    end = (row.get("End") or "").strip()
    if not end:
        return None
    other_cols = [c for c in CSV_COLUMNS if c != "End"]
    all_others_empty = all(not (row.get(c) or "").strip() for c in other_cols)
    if all_others_empty and end in SECTION_MARKERS:
        return SECTION_MARKERS[end]
    return None


# ---------------------------------------------------------------------------
# Adapter
# ---------------------------------------------------------------------------

class PetrusSpreadsheetAdapter(SourceAdapter):
    """Adapter for the Petrus broker's warehouse spreadsheet.

    Handles: section-based regions, abbreviated street names, observation
    field parsing, contact extraction, and value classification.

    Config options:
        street_canonical: dict — override street name mappings
        street_info: dict — override street type+name data
        default_region: str — region for rows before first section marker
    """

    def __init__(self, config: dict) -> None:
        self._config = config
        self._street_canonical: dict[str, str] = config.get(
            "street_canonical", _DEFAULT_STREET_CANONICAL
        )
        self._street_info: dict[str, tuple[str, str]] = config.get(
            "street_info", _DEFAULT_STREET_INFO
        )
        self._default_region = config.get("default_region", "Alphaville")

    @property
    def source_type(self) -> str:
        return "petrus_spreadsheet"

    def extract(self, content: bytes, config: dict) -> list[dict[str, Any]]:
        """Parse CSV, detect sections, assign regions to each row."""
        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            text = content.decode("utf-8", errors="replace")

        reader = csv.DictReader(io.StringIO(text))
        current_region = self._default_region
        rows: list[dict[str, Any]] = []

        for row in reader:
            region = _is_section_header(row)
            if region is not None:
                current_region = region
                continue
            if _is_empty_row(row):
                continue

            row["__regiao"] = current_region
            rows.append(dict(row))

        return rows

    def transform(self, raw: dict[str, Any]) -> CanonicalRecord:
        """Transform one raw spreadsheet row into CanonicalRecord."""
        regiao = raw.get("__regiao", self._default_region)
        rua_original = (raw.get("End") or "").strip()
        numero_original = (raw.get("nº") or "").strip()
        at_raw = (raw.get("AT") or "").strip()
        ac_raw = (raw.get("AC") or "").strip()
        af_raw = (raw.get("AF") or "").strip()
        obs_raw = (raw.get("Observ.") or "").strip()
        valor_raw = (raw.get("Valor") or "").strip()
        proprietario_raw = (raw.get("Proprietário") or "").strip()
        telefones_raw = (raw.get("Telefones") or "").strip()

        # --- Address normalization ---
        addr = self._normalize_address(rua_original, numero_original, regiao)

        # --- Unit detection from AT column ---
        unidade = None
        area_terreno = None
        if at_raw and re.match(r"^[A-Z]\d*$", at_raw, re.IGNORECASE):
            # AT contains unit identifier (G1, G2, etc.), not area
            unidade = at_raw.upper()
        else:
            area_terreno = _parse_area(at_raw)

        # --- Observation extraction ---
        obs_data = self._extract_observations(obs_raw)

        # --- Value classification ---
        valor_data = self._classify_value(valor_raw, obs_raw)

        # --- Contact extraction ---
        contact = self._extract_contact(proprietario_raw, telefones_raw)

        # --- Determine tipo ---
        tipo = "terreno" if regiao == "Terrenos" else "galpao"

        # --- Build canonical record ---
        cidade, bairro = REGION_CITY_MAP.get(regiao, ("", ""))

        return CanonicalRecord(
            # Location
            endereco=addr.get("endereco_completo"),
            logradouro=addr.get("logradouro"),
            numero=addr.get("numero"),
            complemento=addr.get("complemento") or None,
            unidade=unidade or addr.get("unidade"),
            bairro=bairro or None,
            cidade=cidade or None,
            uf="SP",
            # Areas
            area_total_m2=area_terreno,
            area_construida_m2=_parse_area(ac_raw),
            area_piso_m2=_parse_area(af_raw),
            area_escritorio_m2=obs_data.get("area_escritorio"),
            area_mezanino_m2=obs_data.get("area_mezanino"),
            # Physical
            pe_direito_m=obs_data.get("pe_direito"),
            numero_docas=obs_data.get("docas"),
            vagas_estacionamento=obs_data.get("vagas"),
            potencia_eletrica_kva=obs_data.get("kva"),
            elevador=obs_data.get("elevador"),
            gerador=obs_data.get("gerador"),
            ponte_rolante=obs_data.get("ponte_rolante"),
            zoneamento=obs_data.get("zoneamento"),
            # Commercial
            tipo=tipo,
            tipo_operacao=valor_data.get("tipo_operacao"),
            valor_locacao=valor_data.get("valor_locacao"),
            valor_venda=valor_data.get("valor_venda"),
            iptu_valor=obs_data.get("iptu"),
            valor_condominio=obs_data.get("condominio_valor"),
            status=obs_data.get("status") or valor_data.get("status"),
            inquilino=obs_data.get("inquilino"),
            # Contact
            proprietario_nome=contact.get("nome"),
            proprietario_telefone=contact.get("telefones"),
            proprietario_email=contact.get("email"),
            # Metadata
            observacoes=obs_raw or None,
            dados_extras={
                k: v for k, v in {
                    "regiao": regiao,
                    "rua_original": rua_original,
                    "avcb": obs_data.get("avcb"),
                    "cab_primaria": obs_data.get("cab_primaria"),
                    "preco_m2": valor_data.get("preco_m2"),
                }.items() if v
            },
        )

    # ------------------------------------------------------------------
    # Address normalization
    # ------------------------------------------------------------------

    def _normalize_address(
        self, rua: str, numero_raw: str, regiao: str
    ) -> dict[str, str]:
        complement = ""
        unidade = None

        # Extract complement from street name (G01, Lj06, etc.)
        m_compl = COMPLEMENT_RE.search(rua)
        if m_compl:
            compl_text = m_compl.group(1).strip()
            # If it starts with G and has a digit, it's a unit
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
        canonical = self._street_canonical.get(street_key)
        if not canonical:
            canonical = self._street_canonical.get(_strip_accents(street_key))
        if canonical and canonical in self._street_info:
            logradouro_tipo, nome_oficial = self._street_info[canonical]
        else:
            logradouro_tipo = "Rua"
            nome_oficial = rua if rua else ""

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
        cidade, bairro = REGION_CITY_MAP.get(regiao, ("", ""))
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

    # ------------------------------------------------------------------
    # Observation extraction
    # ------------------------------------------------------------------

    def _extract_observations(self, obs: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        if not obs:
            return result

        for field_name, pattern in OBS_PATTERNS.items():
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
                    v = _parse_br_number(raw_val)
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
                    v = _parse_br_number(raw_val)
                    if v:
                        result["iptu"] = v
            elif field_name == "condominio":
                if raw_val:
                    v = _parse_br_number(raw_val)
                    if v:
                        result["condominio_valor"] = v

        # Status
        m_status = STATUS_RE.search(obs)
        if m_status:
            result["status"] = m_status.group(1).lower()

        # Inquilino: uppercase company names
        skip = {
            "PD", "KVA", "IPTU", "AVCB", "ESCR", "ESC", "CAB", "PRIM",
            "DOCA", "DOCAS", "VAGA", "VAGAS", "VAGO", "VENDIDO", "MEZ",
            "GERADOR", "ELEV", "ELEVADOR", "ZUP", "ZUD", "ZPEI", "ZIND",
        }
        tenants = []
        for m_t in re.finditer(r"\b([A-Z][A-Z\s&.'-]{2,})\b", obs):
            name = m_t.group(1).strip()
            if name not in skip and len(name) > 2:
                tenants.append(name)
        if tenants:
            result["inquilino"] = "; ".join(tenants[:3])

        return result

    # ------------------------------------------------------------------
    # Value classification
    # ------------------------------------------------------------------

    def _classify_value(self, valor_raw: str, obs: str) -> dict[str, Any]:
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

        # Millions in text
        m_milh = re.search(r"([\d.,]+)\s*MILH", upper)
        if m_milh:
            try:
                val = float(
                    m_milh.group(1).replace(".", "").replace(",", ".")
                )
                result["valor_venda"] = val * 1_000_000
                result["tipo_operacao"] = "venda"
            except ValueError:
                pass
            return result

        # Price per m²
        m_pm2 = PM2_RE.search(valor_raw)
        if m_pm2:
            v = _parse_br_number(m_pm2.group(1))
            if v:
                result["preco_m2"] = v
            return result

        # Parse as number
        val = _parse_br_number(valor_raw)
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

    # ------------------------------------------------------------------
    # Contact extraction
    # ------------------------------------------------------------------

    def _extract_contact(
        self, proprietario_raw: str, telefones_raw: str
    ) -> dict[str, str]:
        result: dict[str, str] = {}
        if not proprietario_raw and not telefones_raw:
            return result

        # --- From proprietario field ---
        remaining = proprietario_raw

        # Extract emails
        emails = EMAIL_RE.findall(remaining)
        if emails:
            result["email"] = "; ".join(emails)
            for email in emails:
                remaining = remaining.replace(email, "")

        # Remove phone numbers from proprietario
        for ph in PHONE_RE.findall(remaining):
            digits = re.sub(r"\D", "", ph)
            if len(digits) >= 4:
                remaining = remaining.replace(ph, "")

        # Clean name
        remaining = re.sub(r"\(.*?\)", "", remaining)
        remaining = re.sub(r"[/\-,]+\s*$", "", remaining)
        remaining = re.sub(r"^\s*[/\-,]+", "", remaining)
        remaining = re.sub(r"\s{2,}", " ", remaining).strip()
        if remaining:
            result["nome"] = remaining

        # --- From telefones field ---
        phones: list[str] = []
        segments = telefones_raw.split("/") if telefones_raw else []
        for seg in segments:
            seg = seg.strip()
            if not seg:
                continue
            for ph in PHONE_RE.findall(seg):
                digits = re.sub(r"\D", "", ph)
                if len(digits) >= 4:
                    phones.append(_normalize_phone(ph))

        if phones:
            result["telefones"] = "; ".join(phones)

        return result
