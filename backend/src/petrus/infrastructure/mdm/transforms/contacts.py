"""Contact extraction: names, emails, and phone numbers from raw owner/phone fields."""

from __future__ import annotations

import re

from petrus.infrastructure.mdm.transforms.phones import PHONE_RE, normalize_phone

# Email regex
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.\w{2,}", re.IGNORECASE)

# URL-like patterns (not emails): www.site.com, site.com.br
URL_RE = re.compile(r"(?:www\.\S+|[\w-]+\.com\.br)\b", re.IGNORECASE)

# Non-phone noise in the telefones field: "COND 3,20", "COND R$5,00"
COND_NOISE_RE = re.compile(
    r"COND\.?\s*(?:R\$\s*)?\d+[.,]\d*", re.IGNORECASE
)


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

    # Extract emails FIRST (before URL removal, which can strip email domains)
    emails = EMAIL_RE.findall(remaining)
    if emails:
        result["email"] = "; ".join(emails)
        for email in emails:
            remaining = remaining.replace(email, "")

    # Extract URLs (www.site.com.br) — not a name
    urls = URL_RE.findall(remaining)
    if urls:
        for url in urls:
            remaining = remaining.replace(url, "")

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
    # Pre-clean: remove COND values that pollute phone parsing
    tel_clean = telefones_raw
    if tel_clean:
        tel_clean = COND_NOISE_RE.sub("", tel_clean)

    phones: list[str] = []
    segments = tel_clean.split("/") if tel_clean else []
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
