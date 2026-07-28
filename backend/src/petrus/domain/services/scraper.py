"""Port: contract for platform-specific web scrapers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class CrawlResult:
    """Value object: result of crawling a single listing page."""

    url: str
    raw_data: dict[str, Any]
    images: list[str] = field(default_factory=list)
    source_id: str | None = None


@dataclass(frozen=True)
class ScrapingConfig:
    """Value object: scraping configuration for a fonte."""

    platform: str
    base_url: str
    listing_urls: list[str] = field(default_factory=list)
    max_pages: int = 50
    filters: dict[str, Any] = field(default_factory=dict)
    rate_limit_seconds: float = 1.5
    headers: dict[str, str] = field(default_factory=dict)
    require_browser: bool = False

    @classmethod
    def from_fonte_config(cls, config: dict[str, Any]) -> ScrapingConfig:
        return cls(
            platform=config.get("platform", ""),
            base_url=config.get("base_url", config.get("url", "")),
            listing_urls=config.get("listing_urls", []),
            max_pages=config.get("max_pages", 50),
            filters=config.get("filters", {}),
            rate_limit_seconds=config.get("rate_limit_seconds", 1.5),
            headers=config.get("headers", {}),
            require_browser=config.get("require_browser", False),
        )


class Scraper(ABC):
    """Port: adapts a web platform into raw crawl results.

    Each implementation knows how to navigate ONE specific platform
    and extract raw listing data from property pages.

    Responsibilities:
    - Navigate listings (pagination, filters, scroll)
    - Extract raw data from each listing (HTML parse, JSON parse)
    - Return list of CrawlResult (un-normalized data)

    NOT responsible for:
    - Normalizing data (that's SourceAdapter's job)
    - Saving to database (that's ScrapingService's job)
    - Rate limiting (that's PageFetcher's job)
    - robots.txt checking (that's RobotsTxtChecker's job)
    """

    @abstractmethod
    async def crawl(self, config: ScrapingConfig) -> list[CrawlResult]:
        """Execute full crawl and return raw results."""
        ...

    @abstractmethod
    async def crawl_detail(
        self, url: str, config: ScrapingConfig
    ) -> CrawlResult | None:
        """Extract data from a single detail page."""
        ...

    @property
    @abstractmethod
    def platform(self) -> str:
        """Unique platform identifier (e.g. 'code49', 'union')."""
        ...

    @property
    def requires_browser(self) -> bool:
        """If True, needs Playwright instead of plain httpx."""
        return False
