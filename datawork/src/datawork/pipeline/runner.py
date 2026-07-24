"""Pipeline runner: compose stages and track execution."""

from __future__ import annotations

import time
from typing import Any, Callable

import pandas as pd

Stage = Callable[[pd.DataFrame], pd.DataFrame]


class PipelineRunner:
    """Compose and execute a sequence of DataFrame transform stages.

    Usage:
        pipeline = (
            PipelineRunner("my_pipeline")
            .add("clean_areas", normalize_areas)
            .add("clean_values", classify_values)
            .add("dedup", compute_dedup_hash)
        )
        result = pipeline.run(df)
        pipeline.summary()
    """

    def __init__(self, name: str = "pipeline") -> None:
        self.name = name
        self._stages: list[tuple[str, Stage]] = []
        self._log: list[dict[str, Any]] = []

    def add(self, name: str, stage: Stage) -> PipelineRunner:
        """Add a named stage to the pipeline."""
        self._stages.append((name, stage))
        return self

    def run(self, df: pd.DataFrame, verbose: bool = True) -> pd.DataFrame:
        """Execute all stages in order on the input DataFrame."""
        if verbose:
            print(f"Pipeline '{self.name}': {len(self._stages)} stages, {len(df)} rows")
            print("-" * 50)

        self._log.clear()
        result = df.copy()

        for stage_name, stage_fn in self._stages:
            t0 = time.time()
            rows_before = len(result)
            cols_before = len(result.columns)

            result = stage_fn(result)

            elapsed = time.time() - t0
            entry = {
                "stage": stage_name,
                "rows_in": rows_before,
                "rows_out": len(result),
                "cols_in": cols_before,
                "cols_out": len(result.columns),
                "elapsed_s": round(elapsed, 3),
            }
            self._log.append(entry)

            if verbose:
                delta = len(result) - rows_before
                delta_str = f" ({delta:+d})" if delta != 0 else ""
                print(
                    f"  [{stage_name}] "
                    f"{rows_before} -> {len(result)} rows{delta_str}, "
                    f"{len(result.columns)} cols "
                    f"({elapsed:.2f}s)"
                )

        if verbose:
            print("-" * 50)
            print(f"Done: {len(result)} rows, {len(result.columns)} cols")

        return result

    def summary(self) -> pd.DataFrame:
        """Return a DataFrame summarizing each stage's execution."""
        return pd.DataFrame(self._log)
