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
        else:
            # Merge: fill NaN cells with new values (e.g. VENDIDO status)
            mask = result[col].isna()
            if mask.any():
                result.loc[mask, col] = cls_df.loc[mask, col].values

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


def detect_units(
    df: pd.DataFrame,
    at_col: str = "AT",
) -> pd.DataFrame:
    """Detect unit/block codes in AT column (e.g. A1, B, G2) and move to 'unidade'.

    These are not areas — they're identifiers for units within a building.
    """
    result = df.copy()
    result["unidade"] = None
    if at_col in result.columns:
        mask = result[at_col].astype(str).str.match(
            r"^[A-Za-z]\d*$", na=False
        )
        result.loc[mask, "unidade"] = result.loc[mask, at_col].astype(str).str.upper()
        result.loc[mask, at_col] = None
    return result


def classify_tipo(
    df: pd.DataFrame,
    regiao_col: str = "regiao",
) -> pd.DataFrame:
    """Set tipo = 'terreno' for Terrenos region, else 'galpao'."""
    result = df.copy()
    result["tipo"] = result[regiao_col].apply(
        lambda r: "terreno" if r == "Terrenos" else "galpao"
    )
    return result


def fill_missing_cidade(
    df: pd.DataFrame,
    rua_col: str = "logradouro",
    cidade_col: str = "cidade",
    bairro_col: str = "bairro",
    default_cidade: str | None = None,
    default_bairro: str | None = None,
) -> pd.DataFrame:
    """Fill empty cidade by looking up the same street in rows that have a city.

    Terrenos share the same streets as galpões (e.g. "África" is in Barueri).
    When cidade is empty, we find the most common cidade for that street name
    from rows where it IS known.

    If default_cidade is set, remaining empties are filled with that value.
    """
    result = df.copy()
    missing = result[cidade_col].fillna("").str.strip() == ""
    if not missing.any():
        return result

    # Build lookup: street -> most common (cidade, bairro)
    known = result[~missing]
    if len(known) > 0:
        street_city: dict[str, tuple[str, str]] = {}
        for rua in result.loc[missing, rua_col].unique():
            rua_clean = str(rua).strip().lower()
            matches = known[known[rua_col].astype(str).str.strip().str.lower() == rua_clean]
            if len(matches) > 0:
                cidade = matches[cidade_col].mode().iloc[0] if len(matches[cidade_col].mode()) > 0 else ""
                bairro = matches[bairro_col].mode().iloc[0] if bairro_col in matches.columns and len(matches[bairro_col].mode()) > 0 else ""
                if cidade:
                    street_city[rua_clean] = (cidade, bairro)

        for idx in result[missing].index:
            rua_clean = str(result.at[idx, rua_col]).strip().lower()
            if rua_clean in street_city:
                cidade, bairro = street_city[rua_clean]
                result.at[idx, cidade_col] = cidade
                if bairro and (not result.at[idx, bairro_col] or str(result.at[idx, bairro_col]).strip() == ""):
                    result.at[idx, bairro_col] = bairro

    # Fallback: fill remaining empties with default
    if default_cidade:
        still_missing = result[cidade_col].fillna("").str.strip() == ""
        result.loc[still_missing, cidade_col] = default_cidade
        if default_bairro:
            empty_bairro = still_missing & (result[bairro_col].fillna("").str.strip() == "")
            result.loc[empty_bairro, bairro_col] = default_bairro

    return result


def filter_useless_rows(
    df: pd.DataFrame,
    min_fields: int = 1,
) -> pd.DataFrame:
    """Remove rows with zero useful property data.

    A row is considered useless if it has none of: area, value, pe_direito, docas.
    These rows are typically contact-only entries misplaced as property records.
    """
    useful_cols = [
        "area_total_m2", "area_construida_m2", "area_piso_m2",
        "valor_locacao", "valor_venda",
        "pe_direito", "docas",
    ]
    found = [c for c in useful_cols if c in df.columns]
    if not found:
        return df

    def _has_useful_data(row: pd.Series) -> bool:
        count = sum(
            1 for c in found
            if pd.notna(row.get(c)) and str(row.get(c, "")).strip() not in ("", "0", "0.0", "False")
        )
        return count >= min_fields

    mask = df.apply(_has_useful_data, axis=1)
    return df[mask].reset_index(drop=True)


def compute_dedup_hash(
    df: pd.DataFrame,
    key_fields: list[str] | None = None,
) -> pd.DataFrame:
    """Add hash_dedup column for deduplication.

    Includes area and value in the hash so that different properties
    at the same address (e.g., multiple units) are NOT deduped.
    """
    fields = key_fields or [
        "endereco_completo", "numero", "cidade",
        "area_construida_m2", "area_total_m2",
        "valor_locacao", "valor_venda",
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


def generate_titulo(df: pd.DataFrame) -> pd.DataFrame:
    """Generate titulo from tipo + logradouro + numero + cidade."""
    TIPO_LABEL = {"galpao": "Galpão", "terreno": "Terreno", "sala": "Sala", "loja": "Loja"}
    result = df.copy()

    def _make_titulo(row: pd.Series) -> str | None:
        tipo = TIPO_LABEL.get(str(row.get("tipo", "") or ""), "Imóvel")
        rua = str(row.get("logradouro", "") or "").strip()
        num = str(row.get("numero", "") or "").strip()
        cidade = str(row.get("cidade", "") or "").strip()
        if not rua:
            return None
        parts = [tipo, " - ", rua]
        if num:
            parts.append(f", {num}")
        if cidade:
            parts.append(f" - {cidade}")
        return "".join(parts)

    result["titulo"] = result.apply(_make_titulo, axis=1)
    return result


def preserve_observacoes(
    df: pd.DataFrame,
    obs_col: str = "Observ.",
) -> pd.DataFrame:
    """Copy raw observation text to observacoes column (before raw cols are dropped)."""
    result = df.copy()
    if obs_col in result.columns:
        result["observacoes"] = result[obs_col].apply(
            lambda v: str(v).strip() if pd.notna(v) and str(v).strip() else None
        )
    return result


def rename_to_silver(df: pd.DataFrame) -> pd.DataFrame:
    """Rename observation columns to match Silver schema names."""
    col_map = {
        "pe_direito": "pe_direito_m",
        "docas": "numero_docas",
        "vagas": "vagas_estacionamento",
        "area_escritorio": "area_escritorio_m2",
        "area_mezanino": "area_mezanino_m2",
        "kva": "potencia_eletrica_kva",
        "condominio_valor": "valor_condominio",
        "endereco_completo": "endereco",
    }
    rename = {k: v for k, v in col_map.items() if k in df.columns}
    return df.rename(columns=rename)


def select_columns(
    df: pd.DataFrame,
    drop_raw: bool = True,
) -> pd.DataFrame:
    """Drop raw source columns, keeping only clean/structured fields."""
    raw_cols = [
        "AC", "AF", "AT", "End", "Local",
        "Observ.", "Proprietário", "Telefones", "Valor", "nº",
    ]
    if drop_raw:
        to_drop = [c for c in raw_cols if c in df.columns]
        return df.drop(columns=to_drop)
    return df


def geocode_addresses(
    df: pd.DataFrame,
    cache_path: str | None = None,
    seed_cache_path: str | None = None,
    rua_col: str = "logradouro",
    bairro_col: str = "bairro",
    cidade_col: str = "cidade",
    rate_limit: float = 1.1,
) -> pd.DataFrame:
    """Geocode addresses via Nominatim with persistent JSON cache.

    Groups by unique street to minimize API calls (~200 vs ~965).
    Loads legacy geocache as seed if provided.
    Rate-limited to 1 request per second (Nominatim policy).
    """
    import json
    import time
    from pathlib import Path

    import httpx

    NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
    HEADERS = {"User-Agent": "AlphamixGalpoes/1.0 (petrusweb.vercel.app)"}

    # Bounding box: greater SP metro area (reject results outside this region)
    LAT_MIN, LAT_MAX = -24.1, -23.0
    LON_MIN, LON_MAX = -47.5, -46.0

    def _in_bounds(lat: float | None, lon: float | None) -> bool:
        if lat is None or lon is None:
            return False
        return LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX

    # --- Load/init cache ---
    if cache_path is None:
        cache_path = str(Path(__file__).parents[3] / "data" / "geocache.json")
    cache_file = Path(cache_path)

    cache: dict[str, dict] = {}
    if cache_file.exists():
        with open(cache_file, encoding="utf-8") as f:
            cache = json.load(f)

    # Seed from legacy cache (different key format)
    if seed_cache_path:
        seed_file = Path(seed_cache_path)
        if seed_file.exists():
            with open(seed_file, encoding="utf-8") as f:
                seed = json.load(f)
            for key, val in seed.items():
                if val.get("latitude") and key not in cache:
                    if _in_bounds(val.get("latitude"), val.get("longitude")):
                        cache[key] = val

    # --- Build unique street keys ---
    result = df.copy()
    result["latitude"] = None
    result["longitude"] = None

    def _make_key(row: pd.Series) -> str:
        rua = str(row.get(rua_col, "") or "").strip()
        bairro = str(row.get(bairro_col, "") or "").strip()
        cidade = str(row.get(cidade_col, "") or "").strip()
        parts = [p for p in [rua, bairro, cidade, "SP", "Brasil"] if p]
        return ", ".join(parts)

    result["_geo_key"] = result.apply(_make_key, axis=1)
    unique_keys = result["_geo_key"].unique()

    # --- Check what needs geocoding ---
    to_geocode = [k for k in unique_keys if k not in cache]
    already_cached = len(unique_keys) - len(to_geocode)
    print(f"  Geocoding: {len(unique_keys)} ruas unicas, {already_cached} no cache, {len(to_geocode)} para buscar")

    # --- Call Nominatim for uncached ---
    if to_geocode:
        found = 0
        failed = 0
        with httpx.Client(timeout=10) as client:
            for i, key in enumerate(to_geocode):
                parts = key.split(", ")
                rua = parts[0] if parts else ""
                cidade = parts[2] if len(parts) > 2 else ""

                # Try structured search first
                params = {
                    "format": "json",
                    "countrycodes": "br",
                    "limit": "1",
                    "street": rua,
                    "city": cidade,
                }
                time.sleep(rate_limit)
                try:
                    resp = client.get(NOMINATIM_URL, params=params, headers=HEADERS)
                    data = resp.json()
                except Exception:
                    data = []

                # Fallback: free-form query
                if not data:
                    time.sleep(rate_limit)
                    try:
                        resp = client.get(
                            NOMINATIM_URL,
                            params={"format": "json", "countrycodes": "br", "limit": "1", "q": key},
                            headers=HEADERS,
                        )
                        data = resp.json()
                    except Exception:
                        data = []

                if data:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                    if _in_bounds(lat, lon):
                        cache[key] = {"latitude": lat, "longitude": lon}
                        found += 1
                    else:
                        # Result is outside operating region — wrong match
                        cache[key] = {"latitude": None, "longitude": None}
                        failed += 1
                else:
                    cache[key] = {"latitude": None, "longitude": None}
                    failed += 1

                if (i + 1) % 20 == 0:
                    print(f"    {i + 1}/{len(to_geocode)} processados...")

        print(f"  Nominatim: {found} encontrados, {failed} nao encontrados")

        # Save cache
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        print(f"  Cache salvo: {cache_file}")

    # --- Apply coordinates (with bounds check) ---
    applied = 0
    rejected = 0
    for idx, row in result.iterrows():
        geo = cache.get(row["_geo_key"])
        if geo and geo.get("latitude"):
            if _in_bounds(geo["latitude"], geo["longitude"]):
                result.at[idx, "latitude"] = geo["latitude"]
                result.at[idx, "longitude"] = geo["longitude"]
                applied += 1
            else:
                rejected += 1

    result = result.drop(columns=["_geo_key"])
    total = len(result)
    msg = f"  Resultado: {applied}/{total} ({applied/total*100:.1f}%) com coordenadas"
    if rejected:
        msg += f" ({rejected} rejeitados por bounding box)"
    print(msg)

    return result


def validate_schema(df: pd.DataFrame, schema: Any) -> pd.DataFrame:
    """Validate DataFrame against a pandera schema. Raises on failure."""
    return schema.validate(df, lazy=True)
