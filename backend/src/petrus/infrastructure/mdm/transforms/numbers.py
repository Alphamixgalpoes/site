"""Parse Brazilian-formatted numbers and area values."""

from __future__ import annotations

import re


def parse_br_number(s: str | None) -> float | None:
    """Parse a Brazilian-formatted number: 125.000,50 -> 125000.5

    Handles:
    - Dot as thousands separator, comma as decimal: "1.200,50" -> 1200.5
    - Comma only (decimal): "12,5" -> 12.5
    - Dot only with 3-digit group (thousands): "5.000" -> 5000
    - Dot only (decimal): "5.5" -> 5.5
    - R$ prefix: "R$ 1.200,00" -> 1200.0
    - Corrupted double dots: "4..879" -> 4879
    """
    if not s:
        return None
    s = s.strip()
    if not s:
        return None

    # Fix corrupted values
    s = s.replace("..", ".")

    # Remove currency symbols and whitespace
    s = re.sub(r"[R$\s]", "", s).strip()

    # Keep only digits, dots, commas, minus
    cleaned = re.sub(r"[^\d.,\-]", "", s)
    if not cleaned or not re.search(r"\d", cleaned):
        return None

    if "," in cleaned:
        # Brazilian format: dots are thousands, comma is decimal
        parts = cleaned.rsplit(",", 1)
        integer_part = parts[0].replace(".", "")
        decimal_part = parts[1] if len(parts) > 1 else "0"
        try:
            return float(f"{integer_part}.{decimal_part}")
        except ValueError:
            return None
    else:
        # No comma: dots could be thousands separators or decimal
        parts = cleaned.split(".")
        if len(parts) == 2 and len(parts[1]) == 3:
            # "5.000" -> 5000 (thousands separator)
            cleaned = cleaned.replace(".", "")
        elif len(parts) > 2:
            # Multiple dots -> thousands separators: "1.200.000" -> 1200000
            cleaned = cleaned.replace(".", "")
        # else: single dot with non-3-digit decimal -> keep as decimal "5.5"
        try:
            return float(cleaned)
        except ValueError:
            return None


def parse_area(raw: str | None) -> float | None:
    """Parse an area value, filtering out non-numeric strings.

    Returns None for strings containing letters (like "TANGRAN", "G1", "lote")
    unless they are purely numeric with dots/commas.
    """
    if not raw:
        return None
    raw = raw.strip()
    if not raw:
        return None
    # If it has letters and is not purely numeric format, skip
    if re.search(r"[a-zA-Z]", raw) and not re.match(r"^[\d.,]+$", raw):
        return None
    return parse_br_number(raw)
