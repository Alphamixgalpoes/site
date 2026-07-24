"""Tests for DefaultNormalizer: normalize() and compute_hash()."""

from __future__ import annotations

from petrus.infrastructure.mdm.normalizer import DefaultNormalizer


class TestNormalize:
    def setup_method(self):
        self.n = DefaultNormalizer()

    def test_maps_columns_via_schema(self):
        raw = {"Endereço": "Rua A", "Área (m²)": "1.200,50"}
        schema = {"Endereço": "endereco", "Área (m²)": "area_construida_m2"}
        result = self.n.normalize(raw, schema)
        assert result["endereco"] == "Rua A"
        assert result["area_construida_m2"] == 1200.5

    def test_ignores_unmapped_columns(self):
        raw = {"Col1": "val1", "Col2": "val2"}
        schema = {"Col1": "titulo"}
        result = self.n.normalize(raw, schema)
        assert "Col2" not in result
        assert result["titulo"] == "val1"

    def test_ignores_ignorar(self):
        raw = {"X": "val"}
        schema = {"X": "__ignorar__"}
        assert self.n.normalize(raw, schema) == {}

    def test_numeric_field(self):
        raw = {"v": "R$ 25.000,00"}
        schema = {"v": "valor"}
        result = self.n.normalize(raw, schema)
        assert result["valor"] == 25000.0

    def test_int_field(self):
        raw = {"d": "4"}
        schema = {"d": "numero_docas"}
        result = self.n.normalize(raw, schema)
        assert result["numero_docas"] == 4

    def test_bool_field_sim(self):
        raw = {"c": "Sim"}
        schema = {"c": "acesso_carreta"}
        result = self.n.normalize(raw, schema)
        assert result["acesso_carreta"] is True

    def test_bool_field_nao(self):
        raw = {"c": "Não"}
        schema = {"c": "acesso_carreta"}
        result = self.n.normalize(raw, schema)
        assert result["acesso_carreta"] is False

    def test_uf_normalized(self):
        raw = {"u": "são paulo"}
        schema = {"u": "uf"}
        result = self.n.normalize(raw, schema)
        assert result["uf"] == "SÃ"

    def test_empty_value_skipped(self):
        raw = {"v": "nan"}
        schema = {"v": "titulo"}
        result = self.n.normalize(raw, schema)
        assert "titulo" not in result

    def test_none_value_skipped(self):
        raw = {"v": None}
        schema = {"v": "titulo"}
        result = self.n.normalize(raw, schema)
        assert "titulo" not in result


class TestComputeHash:
    def setup_method(self):
        self.n = DefaultNormalizer()

    def test_deterministic(self):
        data = {"endereco": "Rua A", "cidade": "Barueri"}
        assert self.n.compute_hash(data) == self.n.compute_hash(data)

    def test_different_data_different_hash(self):
        h1 = self.n.compute_hash({"endereco": "Rua A"})
        h2 = self.n.compute_hash({"endereco": "Rua B"})
        assert h1 != h2

    def test_case_insensitive(self):
        h1 = self.n.compute_hash({"cidade": "BARUERI"})
        h2 = self.n.compute_hash({"cidade": "barueri"})
        assert h1 == h2

    def test_returns_16_chars(self):
        h = self.n.compute_hash({"endereco": "test"})
        assert len(h) == 16
