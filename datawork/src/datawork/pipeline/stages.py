"""Composable pipeline stages: DataFrame -> DataFrame.

Each stage wraps backend transform functions for vectorized DataFrame operations.
Import backend transforms via datawork.setup() before using these.
"""

from __future__ import annotations

import hashlib
from typing import Any

import pandas as pd


def drop_empty_rows(
    df: pd.DataFrame,
    required_cols: list[str] | None = None,
) -> pd.DataFrame:
    """Drop rows where all required columns are empty.

    If required_cols is None, drops rows where ALL columns are empty.
    """
    if required_cols:
        return df.dropna(subset=required_cols, how="all").reset_index(drop=True)
    return df.dropna(how="all").reset_index(drop=True)


def parse_sections(
    df: pd.DataFrame,
    section_markers: dict[str, str],
    end_col: str = "End",
    default_region: str = "Alphaville",
) -> pd.DataFrame:
    """Detect section headers, assign region column, drop header/empty rows.

    Section markers are rows where the End column matches a marker key
    and all other columns are empty.
    """
    from petrus.infrastructure.mdm.transforms.text import is_empty

    regions = []
    is_data_row = []
    current_region = default_region

    cols = [c for c in df.columns if c != end_col]

    for _, row in df.iterrows():
        end_val = str(row.get(end_col, "") or "").strip()
        others_empty = all(is_empty(str(row.get(c, ""))) for c in cols)

        if end_val in section_markers and others_empty:
            current_region = section_markers[end_val]
            is_data_row.append(False)
        elif is_empty(end_val) and others_empty:
            is_data_row.append(False)
        else:
            is_data_row.append(True)

        regions.append(current_region)

    result = df.copy()
    result["regiao"] = regions
    result = result[is_data_row].reset_index(drop=True)
    return result


def normalize_areas(
    df: pd.DataFrame,
    area_cols: dict[str, str] | None = None,
) -> pd.DataFrame:
    """Parse area columns from Brazilian format to float.

    Default mapping: AT -> area_total_m2, AC -> area_construida_m2, AF -> area_piso_m2
    """
    from petrus.infrastructure.mdm.transforms.numbers import parse_area

    default_map = {"AT": "area_total_m2", "AC": "area_construida_m2", "AF": "area_piso_m2"}
    col_map = area_cols or default_map

    result = df.copy()
    for src_col, dst_col in col_map.items():
        if src_col in result.columns:
            result[dst_col] = result[src_col].apply(
                lambda v: parse_area(str(v)) if pd.notna(v) else None
            )

    return result


def normalize_addresses(
    df: pd.DataFrame,
    street_canonical: dict[str, str],
    street_info: dict[str, tuple[str, str]],
    region_city_map: dict[str, tuple[str, str]],
    rua_col: str = "End",
    numero_col: str = "nº",
    regiao_col: str = "regiao",
) -> pd.DataFrame:
    """Normalize addresses using street canonicalization."""
    from petrus.infrastructure.mdm.transforms.addresses import normalize_address

    result = df.copy()
    addr_fields: list[dict[str, Any]] = []

    for _, row in result.iterrows():
        rua = str(row.get(rua_col, "") or "").strip()
        numero = str(row.get(numero_col, "") or "").strip()
        regiao = str(row.get(regiao_col, "Alphaville") or "Alphaville")

        addr = normalize_address(
            rua, numero, regiao,
            street_canonical, street_info, region_city_map,
        )

        # Add cidade/bairro from region
        cidade, bairro = region_city_map.get(regiao, ("", ""))
        addr["cidade"] = cidade
        addr["bairro"] = bairro

        addr_fields.append(addr)

    addr_df = pd.DataFrame(addr_fields)
    for col in addr_df.columns:
        result[col] = addr_df[col].values

    return result


def extract_obs(df: pd.DataFrame, obs_col: str = "Observ.") -> pd.DataFrame:
    """Extract structured fields from observation column."""
    from petrus.infrastructure.mdm.transforms.observations import extract_observations

    result = df.copy()
    extracted: list[dict[str, Any]] = []

    for _, row in result.iterrows():
        obs = str(row.get(obs_col, "") or "").strip()
        extracted.append(extract_observations(obs))

    ext_df = pd.DataFrame(extracted)
    for col in ext_df.columns:
        if col not in result.columns:
            result[col] = ext_df[col].values
        else:
            # Only fill where current value is NaN
            mask = result[col].isna()
            result.loc[mask, col] = ext_df.loc[mask, col].values

    return result


def classify_values(
    df: pd.DataFrame,
    valor_col: str = "Valor",
    obs_col: str = "Observ.",
) -> pd.DataFrame:
    """Classify value field into rent, sale, or price/m2."""
    from petrus.infrastructure.mdm.transforms.values import classify_value

    result = df.copy()
    classified: list[dict[str, Any]] = []

    for _, row in result.iterrows():
        valor = str(row.get(valor_col, "") or "").strip()
        obs = str(row.get(obs_col, "") or "").strip()
        classified.append(classify_value(valor, obs))

    cls_df = pd.DataFrame(classified)
    for col in cls_df.columns:
        if col not in result.columns:
            result[col] = cls_df[col].values

    return result


def extract_contacts(
    df: pd.DataFrame,
    proprietario_col: str = "Proprietário",
    telefones_col: str = "Telefones",
) -> pd.DataFrame:
    """Extract owner name, email, and phones."""
    from petrus.infrastructure.mdm.transforms.contacts import extract_contact

    result = df.copy()
    contacts: list[dict[str, Any]] = []

    for _, row in result.iterrows():
        prop = str(row.get(proprietario_col, "") or "").strip()
        tel = str(row.get(telefones_col, "") or "").strip()
        contact = extract_contact(prop, tel)
        contacts.append({
            "proprietario_nome": contact.get("nome"),
            "proprietario_email": contact.get("email"),
            "proprietario_telefone": contact.get("telefones"),
        })

    cont_df = pd.DataFrame(contacts)
    for col in cont_df.columns:
        result[col] = cont_df[col].values

    return result


def compute_dedup_hash(
    df: pd.DataFrame,
    key_fields: list[str] | None = None,
) -> pd.DataFrame:
    """Add hash_dedup column for deduplication."""
    fields = key_fields or [
        "endereco_completo", "logradouro", "numero", "cidade", "area_construida_m2",
    ]

    result = df.copy()

    def _hash_row(row: pd.Series) -> str:
        parts = [str(row.get(f, "") or "").strip().lower() for f in fields]
        raw = "|".join(parts)
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    result["hash_dedup"] = result.apply(_hash_row, axis=1)
    return result


def drop_duplicates_by_hash(df: pd.DataFrame) -> pd.DataFrame:
    """Drop duplicate rows based on hash_dedup column, keeping first."""
    if "hash_dedup" not in df.columns:
        return df
    return df.drop_duplicates(subset=["hash_dedup"], keep="first").reset_index(drop=True)


def validate_schema(df: pd.DataFrame, schema: Any) -> pd.DataFrame:
    """Validate DataFrame against a pandera schema. Raises on failure."""
    return schema.validate(df, lazy=True)
