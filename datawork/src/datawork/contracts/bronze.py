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

# Generic schema for scraped data (minimal constraints)
RawScrapingSchema = DataFrameSchema(
    {},
    coerce=True,
    strict=False,
)

# Schema for Code49 platform raw data
RawCode49Schema = DataFrameSchema(
    {
        "title": Column(str, nullable=True, required=False),
        "totalArea": Column(str, nullable=True, required=False),
        "city": Column(str, nullable=True, required=False),
    },
    coerce=True,
    strict=False,
)

# Schema for ClickGalpoes raw data
RawClickGalpoesSchema = DataFrameSchema(
    {
        "title": Column(str, nullable=True, required=False),
        "latitude": Column(float, nullable=True, required=False),
        "longitude": Column(float, nullable=True, required=False),
    },
    coerce=True,
    strict=False,
)

# Schema for Union platform raw data
RawUnionSchema = DataFrameSchema(
    {
        "title": Column(str, nullable=True, required=False),
        "price_text": Column(str, nullable=True, required=False),
    },
    coerce=True,
    strict=False,
)

# Schema for WordPress/Houzez raw data
RawWordPressSchema = DataFrameSchema(
    {
        "title": Column(str, nullable=True, required=False),
        "latitude": Column(float, nullable=True, required=False),
        "longitude": Column(float, nullable=True, required=False),
    },
    coerce=True,
    strict=False,
)
