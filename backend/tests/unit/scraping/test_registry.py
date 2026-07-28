"""Tests for ScraperRegistry and AdapterRegistry integration."""

import pytest

from petrus.infrastructure.mdm.connectors.registry import AdapterRegistry
from petrus.infrastructure.scraping.registry import ScraperRegistry


@pytest.mark.unit
class TestScraperRegistry:
    def test_available_lists_all_scrapers(self):
        # Import triggers auto-registration
        import petrus.infrastructure.scraping.scrapers  # noqa: F401
        available = ScraperRegistry.available()
        assert "code49" in available
        assert "union" in available
        assert "static_html" in available
        assert "wordpress_houzez" in available
        assert "nextjs" in available
        assert "imobibrasil" in available
        assert "asp_ajax" in available

    def test_get_unknown_raises(self):
        with pytest.raises(ValueError, match="nao registrado"):
            ScraperRegistry.get("nonexistent_platform")

    def test_get_returns_class(self):
        import petrus.infrastructure.scraping.scrapers  # noqa: F401
        cls = ScraperRegistry.get("code49")
        assert cls is not None


@pytest.mark.unit
class TestAdapterRegistryWithScraping:
    def test_scraping_adapters_registered(self):
        import petrus.infrastructure.mdm.connectors  # noqa: F401
        available = AdapterRegistry.available()
        assert "code49" in available
        assert "union" in available
        assert "static_html" in available
        assert "wordpress_houzez" in available
        assert "clickgalpoes" in available
        assert "imobibrasil" in available
        assert "asp_ajax" in available
        # Originals still there
        assert "generic_csv" in available
        assert "petrus_spreadsheet" in available

    def test_resolve_for_fonte_scraping(self):
        import petrus.infrastructure.mdm.connectors  # noqa: F401
        adapter = AdapterRegistry.resolve_for_fonte("code49", {})
        assert adapter.source_type == "code49"

    def test_resolve_with_adapter_type_override(self):
        import petrus.infrastructure.mdm.connectors  # noqa: F401
        adapter = AdapterRegistry.resolve_for_fonte(
            "scraping", {"adapter_type": "clickgalpoes"}
        )
        assert adapter.source_type == "clickgalpoes"
