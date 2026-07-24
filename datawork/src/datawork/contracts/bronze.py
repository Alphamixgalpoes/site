"""Bronze layer schema: validates raw data as it arrives from sources."""

from __future__ import annotations

import pandera.pandas as pa
from pandera.pandas import Column, DataFrameSchema

# Schema for the Petrus broker's CSV format
RawSpreadsheetSchema = DataFrameSchema(
    {
        "End": Column(str, nullable=True, required=False),
        "nº": Column(str, nullable=True, required=False),
        "AT": Column(str, nullable=True, required=False),
        "AC": Column(str, nullable=True, required=False),
        "AF": Column(str, nullable=True, required=False),
        "Observ.": Column(str, nullable=True, required=False),
        "Valor": Column(str, nullable=True, required=False),
        "Proprietário": Column(str, nullable=True, required=False),
        "Telefones": Column(str, nullable=True, required=False),
        "Local": Column(str, nullable=True, required=False),
    },
    coerce=True,
    strict=False,  # allow extra columns
)

# Generic schema for scraped data (minimal: must have at least an address-like field)
RawScrapingSchema = DataFrameSchema(
    {},
    coerce=True,
    strict=False,
)
