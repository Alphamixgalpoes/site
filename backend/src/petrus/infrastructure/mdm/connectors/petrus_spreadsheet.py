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
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter
from petrus.infrastructure.mdm.connectors.petrus_config import (
    STREET_CANONICAL as _DEFAULT_STREET_CANONICAL,
    STREET_INFO as _DEFAULT_STREET_INFO,
)
from petrus.infrastructure.mdm.transforms.numbers import parse_area
from petrus.infrastructure.mdm.transforms.addresses import normalize_address
from petrus.infrastructure.mdm.transforms.observations import extract_observations
from petrus.infrastructure.mdm.transforms.values import classify_value
from petrus.infrastructure.mdm.transforms.contacts import extract_contact

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
# Row-level helpers
# ---------------------------------------------------------------------------

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
        addr = normalize_address(
            rua_original, numero_original, regiao,
            self._street_canonical, self._street_info, REGION_CITY_MAP,
        )

        # --- Unit detection from AT column ---
        unidade = None
        area_terreno = None
        if at_raw and re.match(r"^[A-Z]\d*$", at_raw, re.IGNORECASE):
            unidade = at_raw.upper()
        else:
            area_terreno = parse_area(at_raw)

        # --- Observation extraction ---
        obs_data = extract_observations(obs_raw)

        # --- Value classification ---
        valor_data = classify_value(valor_raw, obs_raw)

        # --- Contact extraction ---
        contact = extract_contact(proprietario_raw, telefones_raw)

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
            area_construida_m2=parse_area(ac_raw),
            area_piso_m2=parse_area(af_raw),
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
