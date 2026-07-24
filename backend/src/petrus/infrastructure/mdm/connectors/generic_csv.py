from __future__ import annotations

import csv
import io
from typing import Any

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.domain.services.source_adapter import SourceAdapter


# Mapping from common CSV column names to CanonicalRecord fields
_DEFAULT_FIELD_MAP: dict[str, str] = {
    "titulo": "titulo",
    "tipo": "tipo",
    "categoria": "categoria",
    "endereco": "endereco",
    "logradouro": "logradouro",
    "numero": "numero",
    "complemento": "complemento",
    "unidade": "unidade",
    "bairro": "bairro",
    "cidade": "cidade",
    "estado": "uf",
    "uf": "uf",
    "cep": "cep",
    "latitude": "latitude",
    "longitude": "longitude",
    "area_total": "area_total_m2",
    "area_total_m2": "area_total_m2",
    "area_construida": "area_construida_m2",
    "area_construida_m2": "area_construida_m2",
    "area_terreno": "area_total_m2",
    "area_fabril": "area_piso_m2",
    "area_piso_m2": "area_piso_m2",
    "area_escritorio": "area_escritorio_m2",
    "area_escritorio_m2": "area_escritorio_m2",
    "pe_direito": "pe_direito_m",
    "pe_direito_m": "pe_direito_m",
    "docas": "numero_docas",
    "numero_docas": "numero_docas",
    "vagas": "vagas_estacionamento",
    "vagas_estacionamento": "vagas_estacionamento",
    "valor_venda": "valor_venda",
    "valor_locacao": "valor_locacao",
    "valor_condominio": "valor_condominio",
    "valor_iptu": "iptu_valor",
    "iptu": "iptu_valor",
    "observacoes": "observacoes",
    "status": "status",
}

# Fields that should be parsed as float
_FLOAT_FIELDS = {
    "area_total_m2", "area_construida_m2", "area_piso_m2",
    "area_escritorio_m2", "area_mezanino_m2", "pe_direito_m",
    "valor_locacao", "valor_venda", "valor_condominio", "iptu_valor",
    "latitude", "longitude",
}

# Fields that should be parsed as int
_INT_FIELDS = {"numero_docas", "vagas_estacionamento", "potencia_eletrica_kva"}


def _parse_br_number(s: str) -> float | None:
    """Parse Brazilian-formatted number: 125.000,00 -> 125000.0"""
    import re
    s = re.sub(r"[R$\s]", "", s.strip())
    if not s or not re.search(r"\d", s):
        return None
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    else:
        # Dots could be thousands separators if no comma present
        # "5.000" -> 5000, but "5.5" -> 5.5
        parts = s.split(".")
        if len(parts) == 2 and len(parts[1]) == 3:
            s = s.replace(".", "")
    try:
        return float(s)
    except ValueError:
        return None


class GenericCsvAdapter(SourceAdapter):
    """Adapter for clean CSV/XLSX files with direct column mapping.

    Uses schema_map from Fonte.config to map columns, or auto-maps
    columns whose names match known field names.
    """

    def __init__(self, config: dict) -> None:
        self._config = config
        self._schema_map: dict[str, str] = config.get("schema_map", {})

    @property
    def source_type(self) -> str:
        return "generic_csv"

    def extract(self, content: bytes, config: dict) -> list[dict[str, Any]]:
        merged_config = {**self._config, **config}
        filename = merged_config.get("filename", "data.csv")

        lower = filename.lower()
        if lower.endswith(".xlsx") or lower.endswith(".xls"):
            return self._extract_xlsx(content)
        return self._extract_csv(content)

    def transform(self, raw: dict[str, Any]) -> CanonicalRecord:
        schema_map = self._schema_map
        mapped: dict[str, Any] = {}

        for raw_col, value in raw.items():
            if value is None:
                continue
            s = str(value).strip()
            if not s or s.lower() in ("nan", "none", "null", "-", "n/a"):
                continue

            # Resolve target field: explicit schema_map > auto-map
            target = schema_map.get(raw_col)
            if not target:
                normalized_col = raw_col.lower().strip().replace(" ", "_")
                target = _DEFAULT_FIELD_MAP.get(normalized_col)
            if not target or target == "__ignorar__":
                continue

            # Type coercion
            if target in _FLOAT_FIELDS:
                val = _parse_br_number(s)
                if val is not None:
                    mapped[target] = val
            elif target in _INT_FIELDS:
                val = _parse_br_number(s)
                if val is not None:
                    mapped[target] = int(val)
            else:
                mapped[target] = s

        return CanonicalRecord(**mapped)

    def _extract_csv(self, content: bytes) -> list[dict[str, Any]]:
        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            text = content.decode("utf-8", errors="replace")

        first_line = text.split("\n")[0] if text else ""
        sep = ","
        if first_line.count(";") > first_line.count(","):
            sep = ";"
        elif first_line.count("\t") > first_line.count(","):
            sep = "\t"

        reader = csv.DictReader(io.StringIO(text), delimiter=sep)
        return [dict(row) for row in reader]

    def _extract_xlsx(self, content: bytes) -> list[dict[str, Any]]:
        try:
            import openpyxl
        except ImportError:
            return []

        wb = openpyxl.load_workbook(
            io.BytesIO(content), read_only=True, data_only=True
        )
        ws = wb.active
        if ws is None:
            wb.close()
            return []

        rows_iter = ws.iter_rows(values_only=True)
        header_row = next(rows_iter, None)
        if not header_row:
            wb.close()
            return []

        header = [str(c) if c else f"col_{i}" for i, c in enumerate(header_row)]
        result = [dict(zip(header, row)) for row in rows_iter]
        wb.close()
        return result
