"""Thin wrappers around ydata-profiling for quick data exploration."""

from __future__ import annotations

import pandas as pd


def profile(df: pd.DataFrame, title: str = "Data Profile", minimal: bool = True):
    """Generate an interactive profile report.

    Args:
        df: DataFrame to profile
        title: Report title
        minimal: If True, use minimal mode (faster, less detail)

    Returns:
        ProfileReport object. Use .to_notebook_iframe() in Jupyter
        or .to_file("report.html") to save.
    """
    from ydata_profiling import ProfileReport
    return ProfileReport(df, title=title, minimal=minimal)


def completeness_report(df: pd.DataFrame) -> pd.DataFrame:
    """Quick completeness summary: % non-null and non-empty for each column."""
    stats = []
    for col in df.columns:
        total = len(df)
        non_null = df[col].notna().sum()
        non_empty = df[col].apply(
            lambda v: bool(str(v).strip()) if pd.notna(v) else False
        ).sum()
        stats.append({
            "column": col,
            "non_null": non_null,
            "non_empty": non_empty,
            "pct_filled": round(non_empty / total * 100, 1) if total > 0 else 0,
        })

    result = pd.DataFrame(stats).sort_values("pct_filled", ascending=False)
    return result.reset_index(drop=True)


def value_distribution(df: pd.DataFrame, column: str, top_n: int = 20) -> pd.DataFrame:
    """Frequency distribution for a column."""
    counts = df[column].value_counts(dropna=False).head(top_n)
    result = pd.DataFrame({
        "value": counts.index,
        "count": counts.values,
        "pct": (counts.values / len(df) * 100).round(1),
    })
    return result
