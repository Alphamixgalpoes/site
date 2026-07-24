"""Contact extraction: names, emails, and phone numbers from raw owner/phone fields."""

from __future__ import annotations

import re

from petrus.infrastructure.mdm.transforms.phones import PHONE_RE, normalize_phone

# Email regex
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.\w{2,}", re.IGNORECASE)


def extract_contact(
    proprietario_raw: str, telefones_raw: str
) -> dict[str, str]:
    """Extract owner name, email, and phone numbers from raw fields.

    Returns dict with optional keys: nome, email, telefones.
    """
    result: dict[str, str] = {}
    if not proprietario_raw and not telefones_raw:
        return result

    # --- From proprietario field ---
    remaining = proprietario_raw

    # Extract emails
    emails = EMAIL_RE.findall(remaining)
    if emails:
        result["email"] = "; ".join(emails)
        for email in emails:
            remaining = remaining.replace(email, "")

    # Remove phone numbers from proprietario
    for ph in PHONE_RE.findall(remaining):
        digits = re.sub(r"\D", "", ph)
        if len(digits) >= 4:
            remaining = remaining.replace(ph, "")

    # Clean name
    remaining = re.sub(r"\(.*?\)", "", remaining)
    remaining = re.sub(r"[/\-,]+\s*$", "", remaining)
    remaining = re.sub(r"^\s*[/\-,]+", "", remaining)
    remaining = re.sub(r"\s{2,}", " ", remaining).strip()
    if remaining:
        result["nome"] = remaining

    # --- From telefones field ---
    phones: list[str] = []
    segments = telefones_raw.split("/") if telefones_raw else []
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        for ph in PHONE_RE.findall(seg):
            digits = re.sub(r"\D", "", ph)
            if len(digits) >= 4:
                phones.append(normalize_phone(ph))

    if phones:
        result["telefones"] = "; ".join(phones)

    return result
