"""Scraper for WordPress + Houzez theme sites.

Covers: Sempre Negocios (~50 properties, has GPS in JSON-LD!).

WordPress + Houzez sites embed Schema.org JSON-LD with full
property data including GPS coordinates. Also uses AJAX for
pagination via Elementor.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from selectolax.parser import HTMLParser

from petrus.domain.services.scraper import CrawlResult, Scraper, ScrapingConfig
from petrus.infrastructure.scraping.http.fetcher import PageFetcher

logger = logging.getLogger(__name__)


class WordPressScraper(Scraper):
    """Scraper for WordPress + Houzez theme.

    The key advantage: JSON-LD Schema.org markup often contains
    GPS coordinates (latitude/longitude) directly.

    Config.filters:
    - sitemap_url: URL to sitemap.xml (optional, for URL discovery)
    - listing_path: listings page path (default: "/imoveis")
    """

    platform = "wordpress_houzez"

    def __init__(self, fetcher: PageFetcher) -> None:
        self._fetcher = fetcher

    async def crawl(self, config: ScrapingConfig) -> list[CrawlResult]:
        results: list[CrawlResult] = []
        detail_urls: list[str] = []

        sitemap_url = config.filters.get("sitemap_url")
        if sitemap_url:
            detail_urls = await self._urls_from_sitemap(sitemap_url, config)

        if not detail_urls:
            detail_urls = await self._urls_from_listings(config)

        for url in detail_urls:
            detail = await self.crawl_detail(url, config)
            if detail:
                results.append(detail)

        logger.info("Total: %d properties scraped", len(results))
        return results

    async def _urls_from_sitemap(
        self, sitemap_url: str, config: ScrapingConfig
    ) -> list[str]:
        """Extract property URLs from WordPress sitemap."""
        xml = await self._fetcher.fetch_text(sitemap_url)
        if not xml:
            return []

        urls: list[str] = []
        for match in re.finditer(r"<loc>(.*?)</loc>", xml):
            url = match.group(1)
            if "/imovel/" in url or "/property/" in url or "/imoveis/" in url:
                urls.append(url)
        logger.info("Sitemap: found %d property URLs", len(urls))
        return urls[:config.max_pages * 10]

    async def _urls_from_listings(self, config: ScrapingConfig) -> list[str]:
        """Extract property URLs from listing pages."""
        urls: list[str] = []
        listing_path = config.filters.get("listing_path", "/imoveis")

        for page in range(1, config.max_pages + 1):
            page_url = f"{config.base_url}{listing_path}/page/{page}/"
            html = await self._fetcher.fetch_text(page_url)
            if not html:
                break

            tree = HTMLParser(html)
            links = tree.css("a.property-link, .property-listing a, .houzez-listing a")

            if not links:
                links = tree.css("h2 a, .entry-title a")

            if not links:
                break

            for link in links:
                href = link.attributes.get("href", "")
                if href and href not in urls:
                    urls.append(href)

        return urls

    async def crawl_detail(
        self, url: str, config: ScrapingConfig
    ) -> CrawlResult | None:
        html = await self._fetcher.fetch_text(url)
        if not html:
            return None

        tree = HTMLParser(html)
        data: dict[str, Any] = {"url": url}

        jsonld = _extract_jsonld(tree)
        if jsonld:
            data["jsonld"] = jsonld
            if "geo" in jsonld:
                data["latitude"] = jsonld["geo"].get("latitude")
                data["longitude"] = jsonld["geo"].get("longitude")
            if "name" in jsonld:
                data["title"] = jsonld["name"]
            if "description" in jsonld:
                data["description"] = jsonld["description"]
            addr = jsonld.get("address", {})
            if addr:
                data["address"] = addr.get("streetAddress")
                data["city"] = addr.get("addressLocality")
                data["state"] = addr.get("addressRegion")
                data["cep"] = addr.get("postalCode")

        title = tree.css_first("h1, .property-title")
        if title and "title" not in data:
            data["title"] = title.text(strip=True)

        price = tree.css_first(".property-price, .precio, .houzez-price")
        if price:
            data["price_text"] = price.text(strip=True)

        for li in tree.css(".property-meta li, .detail-list li, .property-features li"):
            text = li.text(strip=True)
            _parse_wp_feature(text, data)

        desc = tree.css_first(".property-description, .entry-content")
        if desc and "description" not in data:
            data["description"] = desc.text(strip=True)

        images = _extract_wp_images(tree, config.base_url)

        return CrawlResult(
            url=url,
            raw_data=data,
            images=images,
            source_id=_extract_slug(url),
        )


def _extract_jsonld(tree: HTMLParser) -> dict | None:
    """Extract Schema.org JSON-LD from page."""
    for script in tree.css("script[type='application/ld+json']"):
        text = script.text(strip=True)
        if not text:
            continue
        try:
            data = json.loads(text)
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("@type") in (
                        "RealEstateListing", "Product", "Place", "LocalBusiness",
                    ):
                        return item
            elif isinstance(data, dict):
                if data.get("@type") in (
                    "RealEstateListing", "Product", "Place", "LocalBusiness",
                ):
                    return data
        except json.JSONDecodeError:
            continue
    return None


def _parse_wp_feature(text: str, data: dict) -> None:
    text_lower = text.lower()
    num_match = re.search(r"[\d.,]+", text)
    num_str = num_match.group() if num_match else ""

    if "área total" in text_lower or "area total" in text_lower:
        data["area_total"] = num_str
    elif "área construída" in text_lower or "area construida" in text_lower:
        data["area_construida"] = num_str
    elif "pé direito" in text_lower:
        data["pe_direito"] = num_str
    elif "doca" in text_lower:
        data["docas"] = num_str
    elif "vaga" in text_lower:
        data["vagas"] = num_str


def _extract_wp_images(tree: HTMLParser, base_url: str) -> list[str]:
    images: list[str] = []
    for img in tree.css(".property-gallery img, .houzez-gallery img, .gallery img"):
        src = (
            img.attributes.get("data-src")
            or img.attributes.get("data-lazy")
            or img.attributes.get("src")
            or ""
        )
        if src and "placeholder" not in src.lower() and "svg" not in src.lower():
            if not src.startswith("http"):
                src = f"{base_url.rstrip('/')}/{src.lstrip('/')}"
            images.append(src)
    return images


def _extract_slug(url: str) -> str:
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""
