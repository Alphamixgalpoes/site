"""Load data from various sources into DataFrames."""

from __future__ import annotations

import os
from pathlib import Path

import pandas as pd


def load_csv(path: str | Path, **kwargs) -> pd.DataFrame:
    """Load CSV with Brazilian encoding detection and auto separator.

    Tries utf-8-sig, utf-8, latin-1. Detects separator (comma, semicolon, tab).
    """
    path = Path(path)
    content = None

    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            content = path.read_text(encoding=encoding)
            break
        except UnicodeDecodeError:
            continue

    if content is None:
        content = path.read_text(encoding="utf-8", errors="replace")

    # Detect separator
    first_line = content.split("\n")[0] if content else ""
    sep = ","
    if first_line.count(";") > first_line.count(","):
        sep = ";"
    elif first_line.count("\t") > first_line.count(","):
        sep = "\t"

    defaults = {"sep": sep, "dtype": str, "keep_default_na": False}
    defaults.update(kwargs)

    from io import StringIO
    return pd.read_csv(StringIO(content), **defaults)


def load_from_api(
    fonte_id: str,
    stage: str = "raw",
    base_url: str | None = None,
    token: str | None = None,
) -> pd.DataFrame:
    """Load raw/clean registros from the MDM API into a DataFrame.

    Args:
        fonte_id: UUID of the fonte
        stage: "raw" or "clean"
        base_url: API base URL (default: NEXT_PUBLIC_API_URL env var)
        token: JWT token (default: SUPABASE_SERVICE_KEY env var)
    """
    import httpx

    url = base_url or os.environ.get("NEXT_PUBLIC_API_URL", "http://localhost:8000")
    auth_token = token or os.environ.get("SUPABASE_SERVICE_KEY", "")

    endpoint = f"{url}/api/v1/mdm/fontes/{fonte_id}/{stage}"
    headers = {"Authorization": f"Bearer {auth_token}"}

    resp = httpx.get(endpoint, headers=headers, timeout=60)
    resp.raise_for_status()

    data = resp.json()
    registros = data.get("registros", [])

    if not registros:
        return pd.DataFrame()

    # Expand dados_brutos or dados_normalizados into columns
    key = "dados_normalizados" if stage == "clean" else "dados_brutos"
    rows = []
    for reg in registros:
        row = reg.get(key, {}) or {}
        row["_registro_id"] = reg.get("id")
        row["_created_at"] = reg.get("created_at")
        rows.append(row)

    return pd.DataFrame(rows)


def load_raw_registros(
    fonte_id: str,
    base_url: str | None = None,
    token: str | None = None,
) -> pd.DataFrame:
    """Shortcut: load raw registros expanding dados_brutos into columns."""
    return load_from_api(fonte_id, stage="raw", base_url=base_url, token=token)
