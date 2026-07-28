"""Pipeline stages specific to Code49 platform data."""

from __future__ import annotations

import pandas as pd


def flatten_code49_response(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten nested Code49 API JSON into flat columns.

    Code49 API returns nested objects like:
    - location: {city, neighborhood, address}
    - area: {total, built}
    - price: {rent, sale}

    Flattens these into top-level columns.
    """
    df = df.copy()

    nested_maps = {
        "location": {"city": "city", "neighborhood": "neighborhood", "address": "address"},
        "area": {"total": "totalArea", "built": "builtArea"},
        "price": {"rent": "rentPrice", "sale": "salePrice"},
        "features": {
            "ceilingHeight": "ceilingHeight",
            "docks": "docks",
            "parkingSpots": "parkingSpots",
            "electricPower": "electricPower",
        },
    }

    for parent_col, mapping in nested_maps.items():
        if parent_col not in df.columns:
            continue
        for source_key, target_col in mapping.items():
            if target_col in df.columns:
                continue
            df[target_col] = df[parent_col].apply(
                lambda x: x.get(source_key) if isinstance(x, dict) else None
            )

    return df


def decode_base64_filters(df: pd.DataFrame) -> pd.DataFrame:
    """Decode base64-encoded filter parameters if present.

    Code49 uses base64-encoded JSON for search filters.
    This stage decodes them for inspection/logging.
    """
    import base64
    import json

    df = df.copy()
    if "search_params" not in df.columns:
        return df

    def decode(val):
        if not isinstance(val, str):
            return val
        try:
            decoded = base64.b64decode(val).decode("utf-8")
            return json.loads(decoded)
        except Exception:
            return val

    df["search_params_decoded"] = df["search_params"].apply(decode)
    return df
