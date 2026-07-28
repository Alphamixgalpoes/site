"""Composable pipeline stages shared across all scraping sources.

These stages handle common patterns in scraped data that differ
from the broker's spreadsheet format.
"""

from __future__ import annotations

import re
from datetime import datetime

import pandas as pd


def normalize_scraped_titles(df: pd.DataFrame) -> pd.DataFrame:
    """Clean listing titles by removing common prefixes/suffixes.

    Strips patterns like:
    - 'Galpao para alugar - '
    - 'Galpao industrial para locacao em '
    - ' | NomeDaImobiliaria'
    """
    df = df.copy()
    if "title" not in df.columns:
        return df

    def clean(title):
        if not isinstance(title, str):
            return title
        title = re.sub(
            r"^(?:galpão|galpao|terreno|sala|loja)\s+"
            r"(?:para\s+)?(?:alugar|vender|locação|locacao|venda)"
            r"\s*[-–—:]\s*",
            "", title, flags=re.IGNORECASE,
        )
        title = re.sub(r"\s*[|]\s*.*$", "", title)
        title = re.sub(r"\s*[-–—]\s*(?:imob|imov|imobi).*$", "", title, flags=re.IGNORECASE)
        return title.strip()

    df["title"] = df["title"].apply(clean)
    return df


def extract_area_from_text(
    df: pd.DataFrame,
    text_col: str = "description",
) -> pd.DataFrame:
    """Extract area values from free-text descriptions.

    Patterns: 'area total de 1.500 m2', '2000m²', 'AT: 3.000'
    Only fills if area column is currently empty.
    """
    df = df.copy()
    if text_col not in df.columns:
        return df

    patterns = [
        (r"(?:área|area)\s*total\s*(?:de\s*)?([\d.,]+)\s*m", "area_total"),
        (r"(?:área|area)\s*construída\s*(?:de\s*)?([\d.,]+)\s*m", "area_construida"),
        (r"(?:AT|A\.T\.)\s*:?\s*([\d.,]+)", "area_total"),
        (r"(?:AC|A\.C\.)\s*:?\s*([\d.,]+)", "area_construida"),
        (r"([\d.,]+)\s*m[²2]", "_any_area"),
    ]

    for _, row in df.iterrows():
        text = str(row.get(text_col, ""))
        if not text:
            continue
        for pattern, field in patterns:
            if field == "_any_area":
                if pd.notna(row.get("area_total")) or pd.notna(row.get("area_construida")):
                    continue
                field = "area_total"
            if pd.notna(row.get(field)):
                continue
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = match.group(1).replace(".", "").replace(",", ".")
                try:
                    df.at[row.name, field] = float(val)
                except ValueError:
                    pass

    return df


def normalize_image_urls(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize image URLs by removing CDN resize parameters."""
    df = df.copy()
    if "images" not in df.columns:
        return df

    def clean_url(url):
        if not isinstance(url, str):
            return url
        url = re.sub(r"\?.*$", "", url)
        url = re.sub(r"/_next/image\?url=", "", url)
        return url

    def clean_list(images):
        if isinstance(images, list):
            return [clean_url(u) for u in images]
        return images

    df["images"] = df["images"].apply(clean_list)
    return df


def detect_tipo_from_title(df: pd.DataFrame) -> pd.DataFrame:
    """Classify property type from title text.

    Sets 'tipo' column: galpao, terreno, sala, loja.
    """
    df = df.copy()
    if "tipo" in df.columns and df["tipo"].notna().all():
        return df

    def classify(row):
        if pd.notna(row.get("tipo")) and row["tipo"]:
            return row["tipo"]
        text = (str(row.get("title", "")) + " " + str(row.get("description", ""))).lower()
        if "terreno" in text:
            return "terreno"
        if "sala" in text or "escritório" in text or "escritorio" in text:
            return "sala"
        if "loja" in text:
            return "loja"
        return "galpao"

    df["tipo"] = df.apply(classify, axis=1)
    return df


def extract_features_from_description(df: pd.DataFrame) -> pd.DataFrame:
    """Extract pe_direito, docas, vagas etc. from free-text description.

    Only fills empty cells — does not overwrite existing data.
    """
    df = df.copy()
    desc_col = None
    for col in ("description", "descricao", "observacoes"):
        if col in df.columns:
            desc_col = col
            break
    if not desc_col:
        return df

    patterns = {
        "pe_direito": r"(?:pé\s*direito|pe\s*direito|p[.\s]*d[.\s]*)\s*(?:de\s*)?([\d.,]+)\s*m",
        "docas": r"(\d+)\s*(?:doca|dock)",
        "vagas": r"(\d+)\s*(?:vaga|estacionamento|parking)",
        "eletrica": r"([\d.,]+)\s*(?:kva|kw)",
    }

    for idx, row in df.iterrows():
        text = str(row.get(desc_col, ""))
        if not text:
            continue
        for field, pattern in patterns.items():
            if pd.notna(row.get(field)):
                continue
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = match.group(1).replace(".", "").replace(",", ".")
                try:
                    df.at[idx, field] = float(val)
                except ValueError:
                    pass

    return df


def normalize_price_scraped(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize scraped prices to numeric values.

    Handles: 'R$ 15.000,00/mês' -> valor_locacao=15000
             'R$ 2.500.000' -> valor_venda=2500000
    """
    df = df.copy()
    if "price_text" not in df.columns:
        return df

    for idx, row in df.iterrows():
        text = str(row.get("price_text", ""))
        if not text or text == "nan":
            continue

        text_lower = text.lower()
        nums = re.findall(r"\d[\d.,]*", text)
        if not nums:
            continue

        cleaned = nums[0].replace(".", "").replace(",", ".")
        try:
            val = float(cleaned)
        except ValueError:
            continue

        is_rent = any(w in text_lower for w in ("mês", "mes", "/m", "aluguel", "locação", "locacao"))
        is_sale = "venda" in text_lower

        if is_rent and pd.isna(row.get("valor_locacao")):
            df.at[idx, "valor_locacao"] = val
            df.at[idx, "tipo_operacao"] = row.get("tipo_operacao") or "locacao"
        elif is_sale and pd.isna(row.get("valor_venda")):
            df.at[idx, "valor_venda"] = val
            df.at[idx, "tipo_operacao"] = row.get("tipo_operacao") or "venda"
        elif not is_sale and pd.isna(row.get("valor_locacao")):
            df.at[idx, "valor_locacao"] = val
            df.at[idx, "tipo_operacao"] = row.get("tipo_operacao") or "locacao"

    return df


def fill_source_metadata(
    df: pd.DataFrame,
    fonte_nome: str,
    fonte_url: str,
) -> pd.DataFrame:
    """Fill source_url, data_coleta metadata columns."""
    df = df.copy()
    if "source_url" not in df.columns:
        df["source_url"] = None
    if "data_coleta" not in df.columns:
        df["data_coleta"] = None

    mask_url = df["source_url"].isna()
    df.loc[mask_url, "source_url"] = df.loc[mask_url, "url"] if "url" in df.columns else fonte_url

    mask_date = df["data_coleta"].isna()
    df.loc[mask_date, "data_coleta"] = datetime.now().isoformat()

    if "fonte_nome" not in df.columns:
        df["fonte_nome"] = fonte_nome

    return df


def reverse_geocode_batch(
    df: pd.DataFrame,
    cache_path: str | None = None,
) -> pd.DataFrame:
    """Reverse geocode records that have lat/lng but no address.

    Uses Nominatim API (same as existing geocode_addresses stage).
    Rate limited to 1 request per 1.1 seconds.
    """
    df = df.copy()
    if "latitude" not in df.columns or "longitude" not in df.columns:
        return df

    import json
    import time
    from pathlib import Path

    import httpx

    cache: dict = {}
    if cache_path:
        cp = Path(cache_path)
        if cp.exists():
            cache = json.loads(cp.read_text(encoding="utf-8"))

    needs_reverse = (
        df["latitude"].notna()
        & df["longitude"].notna()
        & (df.get("endereco", pd.Series(dtype=str)).isna() | (df.get("endereco", pd.Series(dtype=str)) == ""))
    )

    count = 0
    total = needs_reverse.sum()

    for idx in df[needs_reverse].index:
        lat = df.at[idx, "latitude"]
        lng = df.at[idx, "longitude"]
        key = f"{lat:.6f},{lng:.6f}"

        if key in cache:
            result = cache[key]
        else:
            try:
                time.sleep(1.1)
                resp = httpx.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={"lat": lat, "lon": lng, "format": "json", "addressdetails": 1},
                    headers={"User-Agent": "AlphamixBot/1.0"},
                    timeout=10,
                )
                result = resp.json() if resp.status_code == 200 else {}
            except Exception:
                result = {}
            cache[key] = result

        if result:
            addr = result.get("address", {})
            df.at[idx, "endereco"] = result.get("display_name", "")
            df.at[idx, "logradouro"] = addr.get("road", "")
            if not df.at[idx, "cidade"]:
                df.at[idx, "cidade"] = addr.get("city") or addr.get("town") or addr.get("municipality", "")
            if not df.at[idx, "bairro"]:
                df.at[idx, "bairro"] = addr.get("suburb") or addr.get("neighbourhood", "")
            df.at[idx, "cep"] = addr.get("postcode", "")

        count += 1
        if count % 10 == 0:
            print(f"  Reverse geocoded {count}/{total}")

    if cache_path:
        Path(cache_path).write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

    print(f"  Reverse geocoded {count}/{total} records")
    return df
