"""Shared transform functions for MDM data processing.

These pure functions are used by both backend adapters (connectors)
and the datawork notebooks for interactive data cleaning.
"""

from petrus.infrastructure.mdm.transforms.numbers import parse_br_number, parse_area
from petrus.infrastructure.mdm.transforms.text import strip_accents, is_empty
from petrus.infrastructure.mdm.transforms.phones import normalize_phone, extract_phones
from petrus.infrastructure.mdm.transforms.addresses import (
    normalize_address,
    canonicalize_street,
)
from petrus.infrastructure.mdm.transforms.observations import extract_observations
from petrus.infrastructure.mdm.transforms.values import classify_value
from petrus.infrastructure.mdm.transforms.contacts import extract_contact

__all__ = [
    "parse_br_number",
    "parse_area",
    "strip_accents",
    "is_empty",
    "normalize_phone",
    "extract_phones",
    "normalize_address",
    "canonicalize_street",
    "extract_observations",
    "classify_value",
    "extract_contact",
]
