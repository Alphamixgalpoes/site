from __future__ import annotations

import hashlib
import json
import re

from petrus.domain.services.normalizer_service import NormalizerService


class DefaultNormalizer(NormalizerService):
    def normalize(self, raw: dict, schema_map: dict) -> dict:
        """Map raw columns to normalized field names and clean values."""
        result: dict = {}
        for raw_col, value in raw.items():
            target_field = schema_map.get(raw_col)
            if not target_field or target_field == "__ignorar__":
                continue
            cleaned = self._clean_value(target_field, value)
            if cleaned is not None:
                result[target_field] = cleaned
        return result

    def compute_hash(self, normalized: dict) -> str:
        """Deterministic hash for dedup."""
        key_fields = ["endereco", "logradouro", "numero", "cidade", "area_construida_m2"]
        parts = [str(normalized.get(f, "")).strip().lower() for f in key_fields]
        raw = "|".join(parts)
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def _clean_value(self, field: str, value: object) -> object:
        if value is None:
            return None
        s = str(value).strip()
        if not s or s.lower() in ("nan", "none", "null", "-", "n/a", "sob consulta"):
            return None

        # Numeric fields
        numeric_fields = {
            "valor", "area_construida_m2", "area_total_m2", "area_piso_m2",
            "pe_direito_m", "area_escritorio_m2", "truck_court_m",
            "potencia_eletrica_kva", "capacidade_piso_ton_m2", "valor_condominio",
        }
        if field in numeric_fields:
            return self._parse_number(s)

        int_fields = {"numero_docas", "vagas_estacionamento"}
        if field in int_fields:
            n = self._parse_number(s)
            return int(n) if n is not None else None

        bool_fields = {"acesso_carreta", "sprinklers", "guarita", "condominio"}
        if field in bool_fields:
            return s.lower() in ("sim", "true", "1", "yes", "s")

        # UF normalization
        if field == "uf":
            return s.upper()[:2]

        return s

    def _parse_number(self, s: str) -> float | None:
        # Handle BR format: "1.200,50" → 1200.50
        s = re.sub(r"[R$\s]", "", s)
        if "," in s and "." in s:
            s = s.replace(".", "").replace(",", ".")
        elif "," in s:
            s = s.replace(",", ".")
        try:
            return float(s)
        except ValueError:
            return None
