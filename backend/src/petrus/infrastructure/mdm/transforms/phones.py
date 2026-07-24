"""Phone number normalization and extraction."""

from __future__ import annotations

import re

# Sequences of 4+ digits possibly with dots/dashes/spaces
PHONE_RE = re.compile(r"[\d][\d.\-\s]{3,}[\d]")


def normalize_phone(raw: str) -> str:
    """Normalize a single phone string to Brazilian format.

    Examples:
        "11987654321"  -> "(11) 98765-4321"
        "1140001234"   -> "(11) 4000-1234"
        "987654321"    -> "98765-4321"
        "40001234"     -> "4000-1234"
    """
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11:
        return f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
    elif len(digits) == 10:
        return f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
    elif len(digits) == 9:
        return f"{digits[:5]}-{digits[5:]}"
    elif len(digits) == 8:
        return f"{digits[:4]}-{digits[4:]}"
    elif len(digits) >= 4:
        return digits
    return raw.strip()


def extract_phones(raw: str) -> list[str]:
    """Extract and normalize all phone numbers from a string.

    Splits by "/" and finds phone patterns in each segment.
    """
    phones: list[str] = []
    segments = raw.split("/") if raw else []
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        for ph in PHONE_RE.findall(seg):
            digits = re.sub(r"\D", "", ph)
            if len(digits) >= 4:
                phones.append(normalize_phone(ph))
    return phones
