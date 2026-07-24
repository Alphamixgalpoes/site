from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord


class SourceAdapter(ABC):
    """Port: adapts a data source into canonical records.

    Each data source (spreadsheet format, scraping portal, API) gets its
    own adapter implementation that knows how to extract and transform its
    specific format into the universal CanonicalRecord.
    """

    @abstractmethod
    def extract(self, content: bytes, config: dict) -> list[dict[str, Any]]:
        """Extract raw records from source-specific format.

        Returns a list of raw dicts — one per record in the source.
        The dict keys are source-specific (column names, JSON keys, etc.).
        """
        ...

    @abstractmethod
    def transform(self, raw: dict[str, Any]) -> CanonicalRecord:
        """Transform one source-specific raw record into canonical format.

        All source-specific logic (field mapping, parsing obs, splitting
        contacts, detecting rent vs sale) lives here.
        """
        ...

    @property
    @abstractmethod
    def source_type(self) -> str:
        """Unique identifier for this adapter type (e.g. 'generic_csv')."""
        ...

    def extract_and_transform(
        self, content: bytes, config: dict
    ) -> list[CanonicalRecord]:
        """Convenience: extract then transform all records."""
        raws = self.extract(content, config)
        results: list[CanonicalRecord] = []
        for raw in raws:
            try:
                results.append(self.transform(raw))
            except Exception:
                continue
        return results
