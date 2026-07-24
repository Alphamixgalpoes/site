"""Text utility functions: accent removal, whitespace cleanup, emptiness checks."""

from __future__ import annotations

import unicodedata


def strip_accents(s: str) -> str:
    """Remove all diacritics/accents from string.

    Example: "São Roque" -> "Sao Roque"
    """
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.category(c).startswith("M"))


def is_empty(s: str | None) -> bool:
    """Check if a value is empty or a known null placeholder."""
    if s is None:
        return True
    s = s.strip()
    if not s:
        return True
    return s.lower() in ("nan", "none", "null", "-", "n/a", "sob consulta")
