"""Tests for scraper parsing logic using HTML/JSON fixtures.

These tests validate that each scraper correctly parses real-world-like
HTML and JSON without making any HTTP requests.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from petrus.infrastructure.scraping.scrapers.code49 import (
    _build_detail_url,
    _extract_image_urls,
    _extract_items,
    _parse_feature,
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
