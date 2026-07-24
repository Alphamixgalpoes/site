"""Jupyter display helpers for data inspection."""

from __future__ import annotations

import pandas as pd


def show_sample(df: pd.DataFrame, n: int = 10, title: str = "") -> None:
    """Display a sample of the DataFrame with nice formatting."""
    if title:
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")

    print(f"Shape: {df.shape[0]} rows x {df.shape[1]} cols")

    try:
        from IPython.display import display
        with pd.option_context(
            "display.max_columns", None,
            "display.max_colwidth", 50,
            "display.width", None,
        ):
            display(df.head(n))
    except ImportError:
        print(df.head(n).to_string())


def show_stats(df: pd.DataFrame) -> None:
    """Show summary statistics relevant to real estate data."""
    print(f"\nTotal registros: {len(df)}")

    # Numeric stats for key fields
    numeric_cols = [
        "area_total_m2", "area_construida_m2", "area_piso_m2",
        "valor_locacao", "valor_venda", "pe_direito_m",
    ]
    found = [c for c in numeric_cols if c in df.columns]
    if found:
        # Convert to numeric, coercing errors
        numeric_df = df[found].apply(pd.to_numeric, errors="coerce")
        print("\nCampos numéricos:")
        stats = numeric_df.describe().loc[["count", "mean", "min", "max"]]
        print(stats.to_string())

    # Categorical distributions
    cat_cols = ["cidade", "tipo_operacao", "tipo", "status", "regiao"]
    for col in cat_cols:
        if col in df.columns:
            counts = df[col].value_counts(dropna=False).head(10)
            if len(counts) > 0:
                print(f"\n{col}:")
                for val, count in counts.items():
                    print(f"  {val}: {count}")


def show_diff(
    before: pd.DataFrame,
    after: pd.DataFrame,
    key_col: str = "hash_dedup",
) -> None:
    """Show differences between two versions of data."""
    print(f"\nBefore: {len(before)} rows, {len(before.columns)} cols")
    print(f"After:  {len(after)} rows, {len(after.columns)} cols")
    print(f"Rows delta: {len(after) - len(before):+d}")

    new_cols = set(after.columns) - set(before.columns)
    removed_cols = set(before.columns) - set(after.columns)
    if new_cols:
        print(f"New columns: {sorted(new_cols)}")
    if removed_cols:
        print(f"Removed columns: {sorted(removed_cols)}")
