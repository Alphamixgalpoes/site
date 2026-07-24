"""Tests for MDM transform functions: numbers, text, phones, values, contacts, observations."""

from __future__ import annotations

import pytest

from petrus.infrastructure.mdm.transforms.contacts import extract_contact
from petrus.infrastructure.mdm.transforms.numbers import parse_area, parse_br_number
from petrus.infrastructure.mdm.transforms.observations import extract_observations
from petrus.infrastructure.mdm.transforms.phones import extract_phones, normalize_phone
from petrus.infrastructure.mdm.transforms.text import is_empty, strip_accents
from petrus.infrastructure.mdm.transforms.values import classify_value

# ── parse_br_number ──────────────────────────────────────────────────────


class TestParseBrNumber:
    def test_brazilian_format(self):
        assert parse_br_number("1.200,50") == 1200.5

    def test_comma_decimal(self):
        assert parse_br_number("12,5") == 12.5

    def test_thousands_dot(self):
        assert parse_br_number("5.000") == 5000

    def test_decimal_dot(self):
        assert parse_br_number("5.5") == 5.5

    def test_currency_prefix(self):
        assert parse_br_number("R$ 1.200,00") == 1200.0

    def test_corrupted_double_dot(self):
        assert parse_br_number("4..879") == 4879

    def test_none(self):
        assert parse_br_number(None) is None

    def test_empty(self):
        assert parse_br_number("") is None

    def test_no_digits(self):
        assert parse_br_number("abc") is None

    def test_multiple_thousands(self):
        assert parse_br_number("1.200.000") == 1200000

    def test_negative(self):
        assert parse_br_number("-500") == -500


# ── parse_area ───────────────────────────────────────────────────────────


class TestParseArea:
    def test_numeric(self):
        assert parse_area("1.500,00") == 1500.0

    def test_with_letters(self):
        assert parse_area("TANGRAN") is None

    def test_alphanumeric(self):
        assert parse_area("G1") is None

    def test_none(self):
        assert parse_area(None) is None

    def test_empty(self):
        assert parse_area("") is None


# ── text ─────────────────────────────────────────────────────────────────


class TestStripAccents:
    def test_basic(self):
        assert strip_accents("São Roque") == "Sao Roque"

    def test_multiple_accents(self):
        assert strip_accents("café résumé") == "cafe resume"

    def test_no_accents(self):
        assert strip_accents("hello") == "hello"


class TestIsEmpty:
    @pytest.mark.parametrize(
        "val",
        [None, "", "  ", "nan", "None", "null", "-", "n/a", "sob consulta"],
    )
    def test_empty_values(self, val):
        assert is_empty(val) is True

    @pytest.mark.parametrize("val", ["hello", "0", "123"])
    def test_non_empty(self, val):
        assert is_empty(val) is False


# ── phones ───────────────────────────────────────────────────────────────


class TestNormalizePhone:
    def test_11_digits(self):
        assert normalize_phone("11987654321") == "(11) 98765-4321"

    def test_10_digits(self):
        assert normalize_phone("1140001234") == "(11) 4000-1234"

    def test_9_digits(self):
        assert normalize_phone("987654321") == "98765-4321"

    def test_8_digits(self):
        assert normalize_phone("40001234") == "4000-1234"


class TestExtractPhones:
    def test_slash_separated(self):
        result = extract_phones("11987654321 / 1140001234")
        assert len(result) == 2

    def test_empty(self):
        assert extract_phones("") == []


# ── values ───────────────────────────────────────────────────────────────


class TestClassifyValue:
    def test_vendido(self):
        result = classify_value("VENDIDO")
        assert result["status"] == "vendido"

    def test_millions(self):
        result = classify_value("5 milhões")
        assert result["valor_venda"] == 5_000_000
        assert result["tipo_operacao"] == "venda"

    def test_rent(self):
        result = classify_value("25000")
        assert result["valor_locacao"] == 25000
        assert result["tipo_operacao"] == "locacao"

    def test_sale_by_amount(self):
        result = classify_value("2000000")
        assert result["valor_venda"] == 2_000_000
        assert result["tipo_operacao"] == "venda"

    def test_empty(self):
        assert classify_value("") == {}

    def test_price_per_m2(self):
        result = classify_value("35,00 p/m²")
        assert result["preco_m2"] == 35.0

    def test_obs_sale(self):
        result = classify_value("", obs="Venda 3 milhões")
        assert result["valor_venda"] == 3_000_000

    def test_rent_plus_obs_sale(self):
        result = classify_value("25000", obs="Venda 5 milhões")
        assert result["valor_locacao"] == 25000
        assert result["valor_venda"] == 5_000_000
        assert result["tipo_operacao"] == "ambos"


# ── contacts ─────────────────────────────────────────────────────────────


class TestExtractContact:
    def test_name_only(self):
        result = extract_contact("João Silva", "")
        assert result["nome"] == "João Silva"

    def test_email(self):
        result = extract_contact("João joao@test.com", "")
        assert result["email"] == "joao@test.com"
        assert result["nome"] == "João"

    def test_phone(self):
        result = extract_contact("", "11987654321")
        assert "(11) 98765-4321" in result["telefones"]

    def test_empty(self):
        assert extract_contact("", "") == {}


# ── observations ─────────────────────────────────────────────────────────


class TestExtractObservations:
    def test_docas(self):
        result = extract_observations("4 docas")
        assert result["docas"] == 4

    def test_pe_direito(self):
        result = extract_observations("PD 12")
        assert result["pe_direito"] == 12.0

    def test_vagas(self):
        result = extract_observations("20 vagas")
        assert result["vagas"] == 20

    def test_kva(self):
        result = extract_observations("500 KVA")
        assert result["kva"] == 500

    def test_elevador(self):
        result = extract_observations("Elevador")
        assert result["elevador"] is True

    def test_gerador(self):
        result = extract_observations("Gerador")
        assert result["gerador"] is True

    def test_status_vago(self):
        result = extract_observations("vago 4 docas")
        assert result["status"] == "vago"
        assert result["docas"] == 4

    def test_zoneamento(self):
        result = extract_observations("ZUP 2")
        assert result["zoneamento"] == "ZUP 2"

    def test_empty(self):
        assert extract_observations("") == {}
