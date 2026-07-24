"""Gold layer schema: validates data ready for the galpoes table."""

from __future__ import annotations

import pandera.pandas as pa
from pandera.pandas import Column, Check, DataFrameSchema

GoldenRecordSchema = DataFrameSchema(
    {
        "titulo": Column(str, nullable=False),
        "tipo": Column(str, Check.isin(["galpao", "terreno", "sala", "loja"]), nullable=False),
        "cidade": Column(str, nullable=False),
        "logradouro": Column(str, nullable=True, required=False),
        "numero": Column(str, nullable=True, required=False),
        "bairro": Column(str, nullable=True, required=False),
        "uf": Column(str, Check.str_length(max_value=2), nullable=True, required=False),
        "latitude": Column(float, Check.in_range(-24.0, -23.0), nullable=True, required=False),
        "longitude": Column(float, Check.in_range(-47.5, -46.0), nullable=True, required=False),
        "area_total_m2": Column(float, Check.gt(0), nullable=True, required=False),
        "area_construida_m2": Column(float, Check.gt(0), nullable=True, required=False),
    },
    coerce=True,
    strict=False,
)
