"""Tests for domain value objects."""

import pytest

from petrus.domain.services.scraper import CrawlResult, ScrapingConfig


@pytest.mark.unit
class TestCrawlResult:
    def test_frozen(self):
        result = CrawlResult(url="https://example.com", raw_data={"title": "Test"})
        with pytest.raises(AttributeError):
            result.url = "changed"  # type: ignore[misc]

    def test_defaults(self):
        result = CrawlResult(url="https://example.com", raw_data={})
        assert result.images == []
        assert result.source_id is None


@pytest.mark.unit
class TestScrapingConfig:
    def test_from_fonte_config(self):
        config = ScrapingConfig.from_fonte_config({
            "platform": "code49",
            "base_url": "https://caixetaimoveis.com.br",
            "max_pages": 10,
            "filters": {"property_types": ["galpao"]},
        })
        assert config.platform == "code49"
        assert config.base_url == "https://caixetaimoveis.com.br"
        assert config.max_pages == 10
        assert config.filters["property_types"] == ["galpao"]

    def test_from_fonte_config_defaults(self):
        config = ScrapingConfig.from_fonte_config({"platform": "union"})
        assert config.platform == "union"
        assert config.max_pages == 50
        assert config.rate_limit_seconds == 1.5
        assert config.require_browser is False

    def test_from_fonte_config_url_fallback(self):
        config = ScrapingConfig.from_fonte_config({
            "platform": "static_html",
            "url": "https://example.com",
        })
        assert config.base_url == "https://example.com"
