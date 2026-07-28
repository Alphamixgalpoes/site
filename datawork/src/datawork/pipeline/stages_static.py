"""Pipeline stages specific to static HTML scraper data."""

from __future__ import annotations

import re

import pandas as pd


def normalize_static_fields(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize field names from static HTML scraper to standard names.

    Different static sites use different field names for the same data.
    This stage unifies them.
    """
    df = df.copy()

    rename_map = {
        "totalArea": "area_total",
        "builtArea": "area_construida",
        "ceilingHeight": "pe_direito",
        "docks": "docas",
        "parkingSpots": "vagas",
        "rentPrice": "valor_locacao",
        "salePrice": "valor_venda",
        "electricPower": "eletrica",
    }

    for old, new in rename_map.items():
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    return df


def extract_city_from_address(df: pd.DataFrame) -> pd.DataFrame:
    """Extract city name from address when not available separately.

    Patterns:
    - 'Rua ABC, 123 - Bairro - Cidade/SP'
    - 'Cidade - SP'
    """
    df = df.copy()
    if "cidade" in df.columns and df["cidade"].notna().all():
        return df

    addr_col = None
    for col in ("address", "endereco", "location_text"):
        if col in df.columns:
            addr_col = col
            break
    if not addr_col:
        return df

    for idx, row in df.iterrows():
        if pd.notna(row.get("cidade")) and row["cidade"]:
            continue
        text = str(row.get(addr_col, ""))
        if not text:
            continue

        parts = [p.strip() for p in re.split(r"[-/,]", text)]
        parts = [p for p in parts if p and p.upper() not in ("SP", "BR")]

        if len(parts) >= 2:
            df.at[idx, "cidade"] = parts[-1]
            if not row.get("bairro"):
                df.at[idx, "bairro"] = parts[-2] if len(parts) >= 3 else None

    return df
