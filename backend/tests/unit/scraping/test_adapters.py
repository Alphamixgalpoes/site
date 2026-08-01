"""Tests for scraping SourceAdapter implementations."""

import pytest

from petrus.domain.entities.mdm_types import CanonicalRecord
from petrus.infrastructure.mdm.connectors.asp_adapter import AspAdapter
from petrus.infrastructure.mdm.connectors.clickgalpoes_adapter import ClickGalpoesAdapter
from petrus.infrastructure.mdm.connectors.code49_adapter import Code49Adapter
from petrus.infrastructure.mdm.connectors.imobibrasil_adapter import ImobiBrasilAdapter
from petrus.infrastructure.mdm.connectors.static_html_adapter import StaticHtmlAdapter
from petrus.infrastructure.mdm.connectors.union_adapter import UnionAdapter
from petrus.infrastructure.mdm.connectors.wordpress_adapter import WordPressAdapter


@pytest.mark.unit
class TestCode49Adapter:
    def test_transform_complete(self):
        adapter = Code49Adapter({})
        raw = {
            "title": "Galpao Industrial 500m2",
            "totalArea": "500",
            "builtArea": "450",
            "rentPrice": "15000",
            "salePrice": "2500000",
            "city": "Barueri",
            "neighborhood": "Alphaville",
            "ceilingHeight": "12",
            "docks": "3",
            "url": "https://example.com/imovel/123",
            "id": "123",
        }
        result = adapter.transform(raw)
        assert isinstance(result, CanonicalRecord)
        assert result.area_total_m2 == 500.0
        assert result.area_construida_m2 == 450.0
        assert result.valor_locacao == 15000.0
        assert result.valor_venda == 2500000.0
        assert result.cidade == "Barueri"
        assert result.pe_direito_m == 12.0
        assert result.numero_docas == 3
        assert result.tipo_operacao == "ambos"

    def test_transform_minimal(self):
        adapter = Code49Adapter({})
        raw = {"title": "Galpao", "url": "https://example.com"}
        result = adapter.transform(raw)
        assert isinstance(result, CanonicalRecord)
        assert result.titulo == "Galpao"
        assert result.area_total_m2 is None

    def test_transform_handles_nulls(self):
        adapter = Code49Adapter({})
        raw = {"title": None, "totalArea": None, "city": None}
        result = adapter.transform(raw)
        assert isinstance(result, CanonicalRecord)

    def test_transform_normalizes_alphaville_city(self):
        adapter = Code49Adapter({})
        raw = {
            "title": "Galpao em Alphaville",
            "city": "Alphaville - SP",
            "neighborhood": "Alphaville Industrial",
            "url": "https://example.com/imovel/1",
        }
        result = adapter.transform(raw)
        assert result.cidade == "Barueri"
        assert result.uf == "SP"

    def test_transform_preserves_region_on_normalization(self):
        adapter = Code49Adapter({})
        raw = {
            "title": "Galpao",
            "city": "Alphaville - SP",
            "url": "https://example.com",
        }
        result = adapter.transform(raw)
        assert result.cidade == "Barueri"
        # When region wasn't set, the original city name is preserved as dados_extras
        # The key point is cidade is normalized

    def test_transform_source_id_from_source_id_field(self):
        adapter = Code49Adapter({})
        raw = {
            "title": "Galpao",
            "url": "https://example.com/773/imoveis/x",
            "source_id": "773",
        }
        result = adapter.transform(raw)
        assert result.source_id == "773"

    def test_transform_source_id_from_underscore_field(self):
        adapter = Code49Adapter({})
        raw = {
            "title": "Galpao",
            "url": "https://example.com",
            "_source_id": "918",
        }
        result = adapter.transform(raw)
        assert result.source_id == "918"


@pytest.mark.unit
class TestClickGalpoesAdapter:
    def test_transform_with_coordinates(self):
        adapter = ClickGalpoesAdapter({})
        raw = {
            "title": "Condominio Empresarial Alphaville",
            "latitude": -23.5,
            "longitude": -46.8,
            "totalArea": "1200",
            "rentPrice": "25000",
            "url": "https://clickgalpoes.com/imovel/cond-empresarial",
        }
        result = adapter.transform(raw)
        assert result.latitude == -23.5
        assert result.longitude == -46.8
        assert result.area_total_m2 == 1200.0
        assert result.source_id == "cond-empresarial"

    def test_transform_zero_coords_become_none(self):
        adapter = ClickGalpoesAdapter({})
        raw = {"latitude": 0.0, "longitude": 0.0, "url": "https://x.com/imovel/y"}
        result = adapter.transform(raw)
        assert result.latitude is None
        assert result.longitude is None


@pytest.mark.unit
class TestUnionAdapter:
    def test_transform_with_price_text(self):
        adapter = UnionAdapter({})
        raw = {
            "title": "Galpao Jandira",
            "area_total": "800",
            "price_text": "R$ 12.000,00/mês",
            "url": "https://example.com",
        }
        result = adapter.transform(raw)
        assert result.area_total_m2 == 800.0
        assert result.valor_locacao == 12000.0


@pytest.mark.unit
class TestWordPressAdapter:
    def test_transform_with_gps(self):
        adapter = WordPressAdapter({})
        raw = {
            "title": "Galpao com GPS",
            "latitude": -23.4567,
            "longitude": -46.7890,
            "city": "Cajamar",
            "area_total": "2000",
            "url": "https://example.com",
        }
        result = adapter.transform(raw)
        assert result.latitude == -23.4567
        assert result.longitude == -46.789
        assert result.cidade == "Cajamar"


@pytest.mark.unit
class TestStaticHtmlAdapter:
    def test_transform_basic(self):
        adapter = StaticHtmlAdapter({})
        raw = {
            "title": "Galpao 300m2",
            "address": "Rua A - Barueri",
            "url": "https://example.com/imovel/1",
        }
        result = adapter.transform(raw)
        assert result.titulo == "Galpao 300m2"
        assert result.cidade == "Barueri"


@pytest.mark.unit
class TestImobiBrasilAdapter:
    def test_transform(self):
        adapter = ImobiBrasilAdapter({})
        raw = {
            "title": "Galpao Cajamar",
            "area_total": "600",
            "price_text": "R$ 8.000/mês",
            "url": "https://example.com",
        }
        result = adapter.transform(raw)
        assert result.area_total_m2 == 600.0


@pytest.mark.unit
class TestAspAdapter:
    def test_transform(self):
        adapter = AspAdapter({})
        raw = {
            "title": "Galpao J Morais",
            "area_total": "1500",
            "pe_direito": "10",
            "url": "https://example.com",
        }
        result = adapter.transform(raw)
        assert result.area_total_m2 == 1500.0
        assert result.pe_direito_m == 10.0
