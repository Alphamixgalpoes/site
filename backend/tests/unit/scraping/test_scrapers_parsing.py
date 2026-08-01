"""Tests for scraper parsing logic using HTML/JSON fixtures.

These tests validate that each scraper correctly parses real-world-like
HTML and JSON without making any HTTP requests.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from petrus.infrastructure.scraping.scrapers.asp_ajax import (
    _extract_id as asp_extract_id,
)
from petrus.infrastructure.scraping.scrapers.asp_ajax import (
    _parse_asp_feature,
)
from petrus.infrastructure.scraping.scrapers.asp_ajax import (
    _resolve_url as asp_resolve_url,
)
from petrus.infrastructure.scraping.scrapers.code49 import (
    _build_detail_url,
    _extract_image_urls,
    _extract_items,
    _extract_prices,
    _extract_property_links,
    _parse_description_fields,
    _parse_feature,
    _parse_features_bar,
    _parse_labeled_fields,
)
from petrus.infrastructure.scraping.scrapers.code49 import (
    _extract_source_id as code49_extract_id,
)
from petrus.infrastructure.scraping.scrapers.imobibrasil import (
    _extract_id as imobi_extract_id,
)
from petrus.infrastructure.scraping.scrapers.imobibrasil import (
    _parse_feature as imobi_parse_feature,
)
from petrus.infrastructure.scraping.scrapers.imobibrasil import (
    _resolve_url as imobi_resolve_url,
)
from petrus.infrastructure.scraping.scrapers.nextjs import (
    _extract_hydration_payload,
)
from petrus.infrastructure.scraping.scrapers.static_html import (
    _extract_source_id as static_extract_id,
)
from petrus.infrastructure.scraping.scrapers.union import (
    _extract_union_images,
    _parse_union_feature,
)
from petrus.infrastructure.scraping.scrapers.wordpress_houzez import (
    _extract_jsonld,
    _parse_wp_feature,
)

FIXTURES = Path(__file__).parent.parent.parent / "fixtures" / "scraping"


def _load_fixture(platform: str, filename: str) -> str:
    return (FIXTURES / platform / filename).read_text(encoding="utf-8")


def _load_json_fixture(platform: str, filename: str) -> dict:
    return json.loads(_load_fixture(platform, filename))


# ============================================================
# Code49 parsing tests
# ============================================================

@pytest.mark.unit
class TestCode49Parsing:
    def test_extract_items_from_listing(self):
        data = _load_json_fixture("code49", "listing_response.json")
        items = _extract_items(data)
        assert len(items) == 3
        assert items[0]["id"] == 4501
        assert items[0]["city"] == "Barueri"

    def test_extract_items_empty(self):
        data = _load_json_fixture("code49", "empty_response.json")
        items = _extract_items(data)
        assert items == []

    def test_build_detail_url_with_slug(self):
        item = {"slug": "/imovel/galpao-alpha-4501"}
        url = _build_detail_url("https://example.com", item)
        assert url == "https://example.com/imovel/galpao-alpha-4501"

    def test_build_detail_url_with_id(self):
        item = {"id": 4501}
        url = _build_detail_url("https://example.com", item)
        assert url == "https://example.com/imovel/4501"

    def test_build_detail_url_none_when_empty(self):
        url = _build_detail_url("https://example.com", {})
        assert url is None

    def test_extract_image_urls(self):
        item = {
            "images": [
                {"url": "/uploads/img1.jpg"},
                {"url": "https://cdn.com/img2.jpg"},
            ],
        }
        urls = _extract_image_urls(item, "https://example.com")
        assert len(urls) == 2
        assert urls[0] == "https://example.com/uploads/img1.jpg"
        assert urls[1] == "https://cdn.com/img2.jpg"

    def test_parse_feature_area_total(self):
        data: dict = {}
        _parse_feature("Área total: 1.500 m²", data)
        assert data["totalArea"] == "1.500"

    def test_parse_feature_pe_direito(self):
        data: dict = {}
        _parse_feature("Pé direito: 12 m", data)
        assert data["ceilingHeight"] == "12"

    def test_parse_feature_docas(self):
        data: dict = {}
        _parse_feature("Docas: 4 unidades", data)
        assert data["docks"] == "4"

    def test_parse_detail_html(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "detail_page.html")
        tree = HTMLParser(html)

        title = tree.css_first("h1")
        assert title is not None
        assert "Galpao Industrial Alphaville" in title.text(strip=True)

        price = tree.css_first(".price")
        assert price is not None
        assert "35.000" in price.text(strip=True)

        features = tree.css(".property-info li")
        assert len(features) == 6

        images = tree.css(".gallery img")
        # 3 images but one is thumb
        assert len(images) == 3


# ============================================================
# Static HTML parsing tests
# ============================================================

@pytest.mark.unit
class TestStaticHtmlParsing:
    def test_listing_page_card_extraction(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("static_html", "listing_page.html")
        tree = HTMLParser(html)
        cards = tree.css(".property-card")
        assert len(cards) == 3

        # First card has relative link
        link = cards[0].css_first("a.property-link")
        assert link is not None
        href = link.attributes.get("href", "")
        assert href == "/imovel/galpao-cajamar-100"

        # Third card has absolute link
        link3 = cards[2].css_first("a")
        href3 = link3.attributes.get("href", "")
        assert href3.startswith("https://")

    def test_detail_page_extraction(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("static_html", "detail_page.html")
        tree = HTMLParser(html)

        title = tree.css_first("h1.property-title")
        assert title is not None
        assert "800m²" in title.text(strip=True)

        price = tree.css_first(".property-price")
        assert "12.000" in price.text(strip=True)

        address = tree.css_first(".property-address")
        assert "Cajamar" in address.text(strip=True)

        images = tree.css(".gallery img.property-image")
        assert len(images) == 2

    def test_extract_source_id(self):
        assert static_extract_id("https://example.com/imovel/galpao-100") == "galpao-100"
        assert static_extract_id("https://example.com/imovel/item.html") == "item"


# ============================================================
# Union parsing tests
# ============================================================

@pytest.mark.unit
class TestUnionParsing:
    def test_detail_page_extraction(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("union", "detail_page.html")
        tree = HTMLParser(html)

        title = tree.css_first("h1, .titulo-imovel")
        assert "Jandira" in title.text(strip=True)

        price = tree.css_first(".valor")
        assert "18.000" in price.text(strip=True)

        location = tree.css_first(".localizacao")
        assert "Jandira" in location.text(strip=True)

        code = tree.css_first(".codigo")
        assert "GG-2045" in code.text(strip=True)

    def test_parse_union_features(self):
        data: dict = {}
        _parse_union_feature("Área total: 1.200 m²", data)
        assert data["area_total"] == "1200"

        _parse_union_feature("Pé direito: 8 m", data)
        assert data["pe_direito"] == "8"

        _parse_union_feature("Docas: 2", data)
        assert data["docas"] == "2"

        _parse_union_feature("Locação", data)
        assert data["tipo_operacao"] == "locacao"

    def test_extract_union_images_lazy_load(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("union", "detail_page.html")
        tree = HTMLParser(html)
        images = _extract_union_images(tree, "https://example.com")
        # Should get data-src, not placeholder
        assert len(images) == 2
        assert all("cdn.example.com" in url for url in images)


# ============================================================
# WordPress parsing tests
# ============================================================

@pytest.mark.unit
class TestWordPressParsing:
    def test_extract_jsonld(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("wordpress", "detail_page.html")
        tree = HTMLParser(html)
        jsonld = _extract_jsonld(tree)

        assert jsonld is not None
        assert jsonld["@type"] == "RealEstateListing"
        assert jsonld["geo"]["latitude"] == -23.3567
        assert jsonld["geo"]["longitude"] == -46.8765
        assert jsonld["address"]["addressLocality"] == "Cajamar"
        assert jsonld["address"]["postalCode"] == "07750-000"

    def test_parse_wp_features(self):
        data: dict = {}
        _parse_wp_feature("Área total: 3.000 m²", data)
        assert data["area_total"] == "3.000"

        _parse_wp_feature("Docas: 8", data)
        assert data["docas"] == "8"

    def test_detail_page_full_parse(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("wordpress", "detail_page.html")
        tree = HTMLParser(html)

        title = tree.css_first("h1.property-title")
        assert "3.000" in title.text(strip=True)

        price = tree.css_first(".property-price")
        assert "55.000" in price.text(strip=True)

        features = tree.css(".property-meta li")
        assert len(features) == 5


# ============================================================
# Next.js / ClickGalpoes parsing tests
# ============================================================

@pytest.mark.unit
class TestNextJsParsing:
    def test_extract_hydration_payload(self):
        html = _load_fixture("clickgalpoes", "detail_page.html")
        data = _extract_hydration_payload(html)

        assert data is not None
        assert data["totalArea"] == "1200"
        assert data["builtArea"] == "1000"
        assert data["rentPrice"] == "25000"
        assert data["city"] == "Barueri"
        assert data["neighborhood"] == "Alphaville"
        assert data["ceilingHeight"] == "10"

    def test_extract_gps_from_hydration(self):
        html = _load_fixture("clickgalpoes", "detail_page.html")
        data = _extract_hydration_payload(html)

        assert data is not None
        assert data["latitude"] == pytest.approx(-23.4975)
        assert data["longitude"] == pytest.approx(-46.8492)

    def test_hydration_empty_on_plain_html(self):
        data = _extract_hydration_payload("<html><body>No Next.js</body></html>")
        assert data is None


# ============================================================
# ImobiBrasil parsing tests
# ============================================================

@pytest.mark.unit
class TestImobiBrasilParsing:
    def test_listing_page_card_extraction(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("imobibrasil", "listing_page.html")
        tree = HTMLParser(html)
        cards = tree.css(".imovel-card")
        assert len(cards) == 3

        link = cards[0].css_first("a")
        assert link is not None
        assert link.attributes["href"] == "/imovel/galpao-cajamar-450"

    def test_detail_page_extraction(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("imobibrasil", "detail_page.html")
        tree = HTMLParser(html)

        title = tree.css_first("h1")
        assert "2.500" in title.text(strip=True)

        price = tree.css_first(".valor")
        assert "22.000" in price.text(strip=True)

        address = tree.css_first(".endereco")
        assert "Cajamar" in address.text(strip=True)

        ref = tree.css_first(".codigo")
        assert "IMB-450" in ref.text(strip=True)

        features = tree.css(".caracteristicas li")
        assert len(features) == 5

    def test_detail_images_skip_placeholder(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("imobibrasil", "detail_page.html")
        tree = HTMLParser(html)
        images = []
        for img in tree.css(".galeria img"):
            src = (
                img.attributes.get("data-src")
                or img.attributes.get("src")
                or ""
            )
            if src and "placeholder" not in src.lower():
                images.append(src)
        # 2 real images, placeholder skipped
        assert len(images) == 2
        assert all("cdn-imobibrasil" in u for u in images)

    def test_parse_feature_area(self):
        data: dict = {}
        imobi_parse_feature("Área total: 2.500 m²", data)
        assert data["area_total"] == "2.500"

    def test_parse_feature_pe_direito(self):
        data: dict = {}
        imobi_parse_feature("Pé direito: 10 m", data)
        assert data["pe_direito"] == "10"

    def test_parse_feature_docas(self):
        data: dict = {}
        imobi_parse_feature("Docas: 4", data)
        assert data["docas"] == "4"

    def test_parse_feature_vagas(self):
        data: dict = {}
        imobi_parse_feature("Vagas: 20", data)
        assert data["vagas"] == "20"

    def test_resolve_url_relative(self):
        assert imobi_resolve_url(
            "https://example.com", "/imovel/123"
        ) == "https://example.com/imovel/123"

    def test_resolve_url_absolute(self):
        assert imobi_resolve_url(
            "https://example.com", "https://other.com/img.jpg"
        ) == "https://other.com/img.jpg"

    def test_extract_id(self):
        assert imobi_extract_id(
            "https://example.com/imovel/galpao-450"
        ) == "galpao-450"


# ============================================================
# ASP.NET AJAX parsing tests
# ============================================================

@pytest.mark.unit
class TestAspAjaxParsing:
    def test_listing_page_card_extraction(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("asp_ajax", "listing_page.html")
        tree = HTMLParser(html)
        cards = tree.css(".imovel")
        assert len(cards) == 2

        link = cards[0].css_first("a")
        assert link is not None
        assert "galpao-barueri-101" in link.attributes["href"]

    def test_detail_page_extraction(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("asp_ajax", "detail_page.html")
        tree = HTMLParser(html)

        title = tree.css_first("h1")
        assert "1.800" in title.text(strip=True)

        price = tree.css_first(".valor")
        assert "30.000" in price.text(strip=True)

        address = tree.css_first(".endereco")
        assert "Alphaville" in address.text(strip=True)

        desc = tree.css_first(".descricao")
        assert "pe direito alto" in desc.text(strip=True)

    def test_detail_images_skip_logo(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("asp_ajax", "detail_page.html")
        tree = HTMLParser(html)
        images = []
        for img in tree.css(".galeria img"):
            src = (
                img.attributes.get("src")
                or img.attributes.get("data-src")
                or ""
            )
            if src and "logo" not in src.lower():
                images.append(src)
        # 2 real images, logo skipped
        assert len(images) == 2

    def test_parse_asp_feature_area_total(self):
        data: dict = {}
        _parse_asp_feature("Área total: 1.800 m²", data)
        assert data["area_total"] == "1.800"

    def test_parse_asp_feature_area_construida(self):
        data: dict = {}
        _parse_asp_feature("Área construída: 1.500 m²", data)
        assert data["area_construida"] == "1.500"

    def test_parse_asp_feature_pe_direito(self):
        data: dict = {}
        _parse_asp_feature("Pé direito: 12 m", data)
        assert data["pe_direito"] == "12"

    def test_parse_asp_feature_docas(self):
        data: dict = {}
        _parse_asp_feature("Docas: 3", data)
        assert data["docas"] == "3"

    def test_parse_asp_feature_eletrica(self):
        data: dict = {}
        _parse_asp_feature("Elétrica: 300 KVA", data)
        assert data["eletrica"] == "300"

    def test_resolve_url(self):
        assert asp_resolve_url(
            "https://jmorais.com.br", "/uploads/img.jpg"
        ) == "https://jmorais.com.br/uploads/img.jpg"

    def test_extract_id(self):
        assert asp_extract_id(
            "https://jmorais.com.br/imovel/galpao-101"
        ) == "galpao-101"


# ============================================================
# Code49 HTML mode parsing tests
# ============================================================

@pytest.mark.unit
class TestCode49HtmlParsing:
    def test_extract_property_links(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "listing_page_html.html")
        tree = HTMLParser(html)
        links = _extract_property_links(tree, "https://example.com")
        assert len(links) == 3
        assert links[0] == (
            "https://example.com/773/imoveis/"
            "venda-locacao-galpao-jardim-iracema-aldeia-barueri-sp",
            "773",
        )
        assert links[1][1] == "918"
        assert links[2][1] == "1050"

    def test_extract_property_links_dedup(self):
        from selectolax.parser import HTMLParser

        html = '<a href="/100/imoveis/x">A</a><a href="/100/imoveis/y">B</a>'
        tree = HTMLParser(html)
        links = _extract_property_links(tree, "https://example.com")
        assert len(links) == 1

    def test_extract_property_links_ignores_non_property(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "listing_page_html.html")
        tree = HTMLParser(html)
        links = _extract_property_links(tree, "https://example.com")
        # /about-us and /contato should NOT be extracted
        ids = [link_id for _, link_id in links]
        assert "about-us" not in ids
        assert "contato" not in ids

    def test_parse_labeled_fields_table_rows(self):
        """div.table-row parsing — the real Code49 HTML structure."""
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "detail_page_html.html")
        tree = HTMLParser(html)
        data: dict = {}
        _parse_labeled_fields(tree, data)
        assert data["city"] == "Barueri - SP"
        assert data["neighborhood"] == "Jardim Iracema/Aldeia"
        assert data["region"] == "Alphaville"
        assert data["totalArea"] == "2.021"
        assert data["builtArea"] == "2.021"
        assert data["transaction_type"] == "Venda, Locacao"
        assert data["property_type"] == "Galpao"
        assert data["rooms"] == "12"

    def test_parse_description_fields(self):
        """Fallback: extract specs from free-text description."""
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "detail_page_html.html")
        tree = HTMLParser(html)
        desc = tree.css_first(".property-description")
        data: dict = {}
        _parse_description_fields(desc.text(strip=True), data)
        assert data["ceilingHeight"] == "10"
        assert data["docks"] == "3"
        assert data["electricPower"] == "150"

    def test_extract_prices_c49(self):
        """Prices from div.c49-property-price (real Code49 pattern)."""
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "detail_page_html.html")
        tree = HTMLParser(html)
        data: dict = {}
        _extract_prices(tree, data)
        assert data["salePrice"] == "13.000.000,00"
        assert data["rentPrice"] == "47.000,00"

    def test_extract_prices_price_section_fallback(self):
        """Prices from div.price-section (older variant fallback)."""
        from selectolax.parser import HTMLParser

        html = """
        <div class="price-section">
          <div><strong>Venda</strong> R$ 5.000.000,00</div>
          <div><strong>Locacao</strong> R$ 30.000,00</div>
        </div>
        """
        tree = HTMLParser(html)
        data: dict = {}
        _extract_prices(tree, data)
        assert data["salePrice"] == "5.000.000,00"
        assert data["rentPrice"] == "30.000,00"

    def test_detail_page_title(self):
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "detail_page_html.html")
        tree = HTMLParser(html)
        title = tree.css_first("h1")
        assert title is not None
        assert "Barueri" in title.text(strip=True)

    def test_detail_page_images_data_foto(self):
        """Images from data-foto attribute on carousel-item (full-size)."""
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "detail_page_html.html")
        tree = HTMLParser(html)
        images = [
            item.attributes.get("data-foto")
            for item in tree.css(".carousel-item[data-foto]")
        ]
        assert len(images) == 3
        assert "773-foto1.jpg" in images[0]

    def test_detail_page_images_background_url(self):
        """Images from background-image in carousel indicator li."""
        import re

        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "detail_page_html.html")
        tree = HTMLParser(html)
        images = []
        for li in tree.css("#photos-property-carousel li[style]"):
            style = li.attributes.get("style") or ""
            m = re.search(r"url\(([^)]+)\)", style)
            if m:
                images.append(m.group(1))
        assert len(images) == 3
        assert "/admin/imovel/mini/773-foto1.jpg" in images[0]

    def test_parse_features_bar(self):
        """Extract parking spots and rooms from c49-property-features."""
        from selectolax.parser import HTMLParser

        html = _load_fixture("code49", "detail_page_html.html")
        tree = HTMLParser(html)
        features = tree.css_first(".c49-property-features")
        data: dict = {}
        _parse_features_bar(features.text(strip=True), data)
        assert data["parkingSpots"] == "15"
        assert data["rooms"] == "12"

    def test_extract_source_id_numeric(self):
        url = "https://example.com/773/imoveis/venda-galpao-barueri-sp"
        assert code49_extract_id(url) == "773"

    def test_extract_source_id_fallback(self):
        url = "https://example.com/imovel/galpao-alpha-4501"
        assert code49_extract_id(url) == "galpao-alpha-4501"
