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
        # Convert numpy types to native Python types for JSON serialization
        clean = {}
        for k, v in record.items():
            if hasattr(v, "item"):  # numpy scalar
                clean[k] = v.item()
            else:
                clean[k] = v
        records.append(clean)
    return records


def push_clean_to_api(
    df: pd.DataFrame,
    fonte_id: str,
    base_url: str | None = None,
    token: str | None = None,
) -> dict:
    """Push clean DataFrame rows directly as clean registros via MDM API.

    Two-step process:
    1. POST /fontes/{id}/clean — inserts clean records (replaces existing)
    2. POST /processar step=clean_to_cards — generates recommendation cards

    Returns combined result from both steps.
    """
    import httpx

    url = base_url or os.environ.get("NEXT_PUBLIC_API_URL", "http://localhost:8000")
    auth_token = token or os.environ.get("SUPABASE_SERVICE_KEY", "")
    headers = {"Authorization": f"Bearer {auth_token}"}

    records = to_canonical_records(df)
    print(f"Pushing {len(records)} clean records for fonte {fonte_id}...")

    # Step 1: Push clean records
    push_endpoint = f"{url}/api/v1/mdm/fontes/{fonte_id}/clean"
    resp = httpx.post(
        push_endpoint,
        json={"registros": records},
        headers=headers,
        timeout=120,
    )
    resp.raise_for_status()
    push_result = resp.json()
    print(f"  Push: {push_result}")

    # Step 2: Generate cards
    cards_endpoint = f"{url}/api/v1/mdm/processar"
    resp = httpx.post(
        cards_endpoint,
        json={"fonte_id": fonte_id, "step": "clean_to_cards"},
        headers=headers,
        timeout=300,
    )
    resp.raise_for_status()
    cards_result = resp.json()
    print(f"  Cards: {cards_result}")

    return {**push_result, **cards_result}
