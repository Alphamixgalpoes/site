"""Registry of platform scrapers, same pattern as AdapterRegistry."""

from __future__ import annotations

from petrus.domain.services.scraper import Scraper


class ScraperRegistry:
    """Registry of scrapers keyed by platform string.

    Scrapers register themselves at import time.
    ScrapingService resolves via fonte.config["platform"].
    """

    _scrapers: dict[str, type[Scraper]] = {}

    @classmethod
    def register(cls, key: str, scraper_cls: type[Scraper]) -> None:
        cls._scrapers[key] = scraper_cls

    @classmethod
    def get(cls, key: str) -> type[Scraper]:
        scraper_cls = cls._scrapers.get(key)
        if scraper_cls is None:
            available = list(cls._scrapers.keys())
            raise ValueError(
                f"Scraper '{key}' nao registrado. Disponiveis: {available}"
            )
        return scraper_cls

    @classmethod
    def available(cls) -> list[str]:
        return list(cls._scrapers.keys())
