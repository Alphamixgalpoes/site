"""Pipeline stages specific to ClickGalpoes (Next.js) data."""

from __future__ import annotations

import re

import pandas as pd


def parse_nextjs_hydration(df: pd.DataFrame) -> pd.DataFrame:
    """Parse raw Next.js hydration payload data into clean columns.

    Expects columns from NextJsScraper's CrawlResult.raw_data.
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
    }

    for old, new in rename_map.items():
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    return df


def extract_condominium_name(df: pd.DataFrame) -> pd.DataFrame:
    """Extract condominium name from URL slug.

    e.g. '/imovel/condominio-empresarial-alphaville' -> 'Condominio Empresarial Alphaville'
    """
    df = df.copy()
    if "url" not in df.columns and "source_url" not in df.columns:
        return df

    url_col = "url" if "url" in df.columns else "source_url"

    def extract(url):
        if not isinstance(url, str):
            return None
        parts = url.rstrip("/").split("/")
        slug = parts[-1] if parts else ""
        slug = re.sub(r"^imovel-", "", slug)
        name = slug.replace("-", " ").title()
        return name if name else None

    df["condominio"] = df[url_col].apply(extract)
    return df


def normalize_imageboss_urls(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize ImageBoss CDN URLs by removing resize parameters.

    ImageBoss pattern: /cdn/image/width/height/filter/url
    We want the original URL without resize params.
    """
    df = df.copy()
    if "images" not in df.columns:
        return df

    def clean_url(url):
        if not isinstance(url, str):
            return url
        match = re.search(r"imageboss\.me/.*?/(https?://.*)", url)
        if match:
            return match.group(1)
        return url

    def clean_list(images):
        if isinstance(images, list):
            return [clean_url(u) for u in images]
        return images

    df["images"] = df["images"].apply(clean_list)
    return df
