"""Pipeline stages specific to Union Softwares platform data."""

from __future__ import annotations

import re

import pandas as pd


def parse_union_location(df: pd.DataFrame) -> pd.DataFrame:
    """Parse Union's location_text field into city and bairro.

    Union sites often combine city + bairro in one field:
    'Alphaville - Barueri' or 'Jandira / SP'
    """
    df = df.copy()
    if "location_text" not in df.columns:
        return df

    for idx, row in df.iterrows():
        text = str(row.get("location_text", ""))
        if not text or text == "nan":
            continue

        parts = [p.strip() for p in re.split(r"[-/,]", text)]
        parts = [p for p in parts if p and p.upper() != "SP"]

        if len(parts) >= 2:
            if not row.get("bairro"):
                df.at[idx, "bairro"] = parts[0]
            if not row.get("cidade"):
                df.at[idx, "cidade"] = parts[-1]
        elif len(parts) == 1:
            if not row.get("cidade"):
                df.at[idx, "cidade"] = parts[0]

    return df


def normalize_union_lazy_images(df: pd.DataFrame) -> pd.DataFrame:
    """Handle Union's lazy-loaded image URLs.

    Union sites use Swiper.js with data-src for lazy loading.
    This stage ensures we have the real image URL, not a placeholder.
    """
    df = df.copy()
    if "images" not in df.columns:
        return df

    def clean_list(images):
        if not isinstance(images, list):
            return images
        cleaned = []
        for url in images:
            if not isinstance(url, str):
                continue
            if "placeholder" in url.lower() or "loading" in url.lower():
                continue
            if url.startswith("data:"):
                continue
            cleaned.append(url)
        return cleaned

    df["images"] = df["images"].apply(clean_list)
    return df
