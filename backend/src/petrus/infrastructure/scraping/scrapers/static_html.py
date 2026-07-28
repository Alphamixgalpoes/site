"""Scraper for simple PHP/SSR sites with static HTML.

Covers: Imob. Cajamar (~900), 4R Empreendimentos (~7),
        Alpha Marco, Francis Imoveis.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from selectolax.parser import HTMLParser

from petrus.domain.services.scraper import CrawlResult, Scraper, ScrapingConfig
from petrus.infrastructure.scraping.http.fetcher import PageFetcher

logger = logging.getLogger(__name__)


class StaticHtmlScraper(Scraper):
    """Scraper for static HTML sites with server-rendered listings.

    Expects config.filters to contain CSS selectors:
    - listing_selector: CSS selector for listing cards
    - detail_link_selector: CSS selector for detail page link (relative to card)
    - next_page_selector: CSS selector for next page link
    - field_selectors: dict mapping field names to CSS selectors for detail page

    Example config.filters:
    {
        "listing_selector": ".property-card",
        "detail_link_selector": "a.property-link",
        "next_page_selector": "a.next-page",
        "pagination_pattern": "/imoveis/pagina/{page}",
        "field_selectors": {
            "title": "h1.property-title",
            "price": ".property-price",
            "area": ".property-area",
            "address": ".property-address",
            "description": ".property-description",
            "images": "img.property-image::attr(src)"
        }
    }
    """

    platform = "static_html"

    def __init__(self, fetcher: PageFetcher) -> None:
        self._fetcher = fetcher

    async def crawl(self, config: ScrapingConfig) -> list[CrawlResult]:
        results: list[CrawlResult] = []
        selectors = config.filters
        listing_sel = selectors.get("listing_selector", ".property-card")
        detail_link_sel = selectors.get("detail_link_selector", "a")
        pagination_pattern = selectors.get("pagination_pattern")

        urls_to_crawl = list(config.listing_urls) or [config.base_url]

        if pagination_pattern:
            urls_to_crawl = [
                config.base_url + pagination_pattern.replace("{page}", str(p))
                for p in range(1, config.max_pages + 1)
            ]

        for page_url in urls_to_crawl:
            html = await self._fetcher.fetch_text(page_url)
            if not html:
                break

            tree = HTMLParser(html)
            cards = tree.css(listing_sel)

            if not cards:
                logger.info("No cards found at %s, stopping pagination", page_url)
                break

            for card in cards:
                link_node = card.css_first(detail_link_sel)
                if not link_node:
                    continue
                href = link_node.attributes.get("href", "")
                if not href:
                    continue

                detail_url = _resolve_url(config.base_url, href)
                detail = await self.crawl_detail(detail_url, config)
                if detail:
                    results.append(detail)

            logger.info(
                "Page %s: %d cards found, %d total",
                page_url, len(cards), len(results),
            )

        return results

    async def crawl_detail(
        self, url: str, config: ScrapingConfig
    ) -> CrawlResult | None:
        html = await self._fetcher.fetch_text(url)
        if not html:
            return None

        tree = HTMLParser(html)
        field_selectors = config.filters.get("field_selectors", {})
        data: dict[str, Any] = {"url": url}

        for field_name, selector in field_selectors.items():
            if "::attr(" in selector:
                attr_match = re.search(r"::attr\((\w+)\)", selector)
                if attr_match:
                    attr_name = attr_match.group(1)
                    clean_sel = selector.split("::attr(")[0]
                    nodes = tree.css(clean_sel)
                    values = [
                        n.attributes.get(attr_name, "") for n in nodes
                        if n.attributes.get(attr_name)
                    ]
                    data[field_name] = (
                        values if len(values) > 1 else (values[0] if values else None)
                    )
            else:
                node = tree.css_first(selector)
                if node:
                    data[field_name] = node.text(strip=True)

        images = _extract_images(tree, data)
        source_id = _extract_source_id(url)

        return CrawlResult(
            url=url,
            raw_data=data,
            images=images,
            source_id=source_id,
        )


def _resolve_url(base: str, href: str) -> str:
    if href.startswith("http"):
        return href
    base = base.rstrip("/")
    href = href.lstrip("/")
    return f"{base}/{href}"


def _extract_images(tree: HTMLParser, data: dict) -> list[str]:
    images: list[str] = []
    raw_imgs = data.get("images")
    if isinstance(raw_imgs, list):
        images = raw_imgs
    elif isinstance(raw_imgs, str):
        images = [raw_imgs]
    if not images:
        for img in tree.css("img"):
            src = img.attributes.get("src") or img.attributes.get("data-src")
            if src and "logo" not in src.lower() and "icon" not in src.lower():
                images.append(src)
    return images


def _extract_source_id(url: str) -> str:
    parts = url.rstrip("/").split("/")
    last = parts[-1] if parts else ""
    return re.sub(r"\.\w+$", "", last)
