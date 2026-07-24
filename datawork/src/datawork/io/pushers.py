"""Push cleaned data back to the MDM system."""

from __future__ import annotations

import os
from pathlib import Path

import pandas as pd


def export_csv(
    df: pd.DataFrame,
    path: str | Path,
    encoding: str = "utf-8-sig",
) -> None:
    """Export DataFrame to CSV with Brazilian-friendly encoding."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, encoding=encoding)
    print(f"Exported {len(df)} rows to {path}")


def to_canonical_records(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame rows to list of CanonicalRecord-compatible dicts.

    Drops NaN values from each row dict.
    """
    records = []
    for _, row in df.iterrows():
        record = {k: v for k, v in row.to_dict().items() if pd.notna(v) and v != ""}
        # Remove internal columns
        record.pop("_registro_id", None)
        record.pop("_created_at", None)
        records.append(record)
    return records


def push_clean_to_api(
    df: pd.DataFrame,
    fonte_id: str,
    base_url: str | None = None,
    token: str | None = None,
) -> dict:
    """Push clean DataFrame rows as clean registros via the MDM API.

    Each row is sent as a clean registro with dados_normalizados.
    Returns API response summary.
    """
    import httpx

    url = base_url or os.environ.get("NEXT_PUBLIC_API_URL", "http://localhost:8000")
    auth_token = token or os.environ.get("SUPABASE_SERVICE_KEY", "")
    headers = {"Authorization": f"Bearer {auth_token}"}

    records = to_canonical_records(df)
    print(f"Pushing {len(records)} clean records for fonte {fonte_id}...")

    # Use the process endpoint
    endpoint = f"{url}/api/v1/mdm/processar"
    resp = httpx.post(
        endpoint,
        json={"fonte_id": fonte_id, "step": "full"},
        headers=headers,
        timeout=120,
    )
    resp.raise_for_status()

    result = resp.json()
    print(f"Done: {result}")
    return result
