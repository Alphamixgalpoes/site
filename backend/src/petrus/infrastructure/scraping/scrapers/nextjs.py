"""Scraper for Next.js SSR/RSC sites.

Covers: ClickGalpoes (~152-678 properties).

Next.js sites embed data in self.__next_f hydration payloads
within <script> tags. Data can be extracted without a headless
browser by parsing these payloads directly.
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


class NextJsScraper(Scraper):
    """Scraper for Next.js sites via hydration payload extraction.

    Config.filters:
    - sitemap_url: URL to sitemap.xml for URL discovery
    - listing_path: path prefix for property pages
    - data_patterns: list of regex patterns to extract from __next_f
    - use_next_data: try _next/data API first (default: False)
    """

    platform = "nextjs"

    def __init__(self, fetcher: PageFetcher) -> None:
        self._fetcher = fetcher

    @property
    def requires_browser(self) -> bool:
        return False

    async def crawl(self, config: ScrapingConfig) -> list[CrawlResult]:
        results: list[CrawlResult] = []

        detail_urls = await self._discover_urls(config)
        logger.info("Discovered %d property URLs", len(detail_urls))

        for url in detail_urls:
            detail = await self.crawl_detail(url, config)
            if detail:
                results.append(detail)

        logger.info("Total: %d properties scraped", len(results))
        return results

    async def _discover_urls(self, config: ScrapingConfig) -> list[str]:
        """Discover property URLs from sitemap or listing pages."""
        urls: list[str] = list(config.listing_urls)

        sitemap_url = config.filters.get("sitemap_url")
        if sitemap_url:
            xml = await self._fetcher.fetch_text(sitemap_url)
            if xml:
                for match in re.finditer(r"<loc>(.*?)</loc>", xml):
                    url = match.group(1)
                    listing_path = config.filters.get("listing_path", "/imovel")
                    if listing_path in url and url not in urls:
                        urls.append(url)
                logger.info("Sitemap: found %d URLs", len(urls))

        if not urls:
            listing_path = config.filters.get("listing_path", "/imoveis")
            html = await self._fetcher.fetch_text(
                f"{config.base_url}{listing_path}"
            )
            if html:
                tree = HTMLParser(html)
                for a in tree.css("a[href]"):
                    href = a.attributes.get("href", "")
                    if "/imovel/" in href or "/property/" in href:
                        urls.append(_resolve_url(config.base_url, href))

        return urls[:config.max_pages * 20]

    async def crawl_detail(
        self, url: str, config: ScrapingConfig
    ) -> CrawlResult | None:
        html = await self._fetcher.fetch_text(url)
        if not html:
            return None

        data: dict[str, Any] = {"url": url}

        hydration_data = _extract_hydration_payload(html)
        if hydration_data:
            data.update(hydration_data)

        tree = HTMLParser(html)

        if "title" not in data:
            title = tree.css_first("h1, [data-testid='title']")
            if title:
                data["title"] = title.text(strip=True)

        if "price_text" not in data:
            price = tree.css_first("[data-testid='price'], .price, .valor")
            if price:
                data["price_text"] = price.text(strip=True)

        if "description" not in data:
            desc = tree.css_first("[data-testid='description'], .description")
            if desc:
                data["description"] = desc.text(strip=True)

        images = data.get("images", [])
        if not images:
            images = _extract_images_from_html(tree, config.base_url)

        return CrawlResult(
            url=url,
            raw_data=data,
            images=images if isinstance(images, list) else [],
            source_id=_extract_slug(url),
        )


def _extract_hydration_payload(html: str) -> dict | None:
    """Extract data from Next.js self.__next_f hydration scripts."""
    data: dict[str, Any] = {}

    for match in re.finditer(
        r'self\.__next_f\.push\(\[[\d,]*"(.*?)"\]\)', html, re.DOTALL
    ):
        chunk = match.group(1)
        chunk = chunk.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")

        location_match = re.search(
            r'propertyLocation["\s]*:\s*\{[^}]*lat["\s]*:\s*([-\d.]+)[^}]*lng["\s]*:\s*([-\d.]+)',
            chunk,
        )
        if location_match:
            data["latitude"] = float(location_match.group(1))
            data["longitude"] = float(location_match.group(2))

        for pattern, key in _HYDRATION_PATTERNS:
            m = re.search(pattern, chunk)
            if m and key not in data:
                data[key] = m.group(1)

        image_matches = re.findall(r'https?://[^\s"]+\.(?:jpg|jpeg|png|webp)', chunk)
        if image_matches:
            data["images"] = list(set(image_matches))

    next_data_match = re.search(
        r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html
    )
    if next_data_match:
        try:
            next_data = json.loads(next_data_match.group(1))
            props = next_data.get("props", {}).get("pageProps", {})
            if "property" in props:
                prop = props["property"]
                data.setdefault("title", prop.get("title"))
                data.setdefault("description", prop.get("description"))
                if "location" in prop:
                    loc = prop["location"]
                    data.setdefault("latitude", loc.get("lat"))
                    data.setdefault("longitude", loc.get("lng"))
                if "images" in prop:
                    data.setdefault(
                        "images",
                        [img.get("url", img) if isinstance(img, dict) else img
                         for img in prop["images"]],
                    )
        except (json.JSONDecodeError, KeyError):
            pass

    return data if data else None


_HYDRATION_PATTERNS = [
    (r'totalArea["\s]*:\s*["\s]*([\d.,]+)', "totalArea"),
    (r'builtArea["\s]*:\s*["\s]*([\d.,]+)', "builtArea"),
    (r'rentPrice["\s]*:\s*["\s]*([\d.,]+)', "rentPrice"),
    (r'salePrice["\s]*:\s*["\s]*([\d.,]+)', "salePrice"),
    (r'title["\s]*:\s*"([^"]+)"', "title"),
    (r'ceilingHeight["\s]*:\s*["\s]*([\d.,]+)', "ceilingHeight"),
    (r'docks["\s]*:\s*["\s]*(\d+)', "docks"),
    (r'parkingSpots["\s]*:\s*["\s]*(\d+)', "parkingSpots"),
    (r'city["\s]*:\s*"([^"]+)"', "city"),
    (r'neighborhood["\s]*:\s*"([^"]+)"', "neighborhood"),
    (r'(?:street|address)["\s]*:\s*"([^"]+)"', "address"),
]


def _extract_images_from_html(tree: HTMLParser, base_url: str) -> list[str]:
    images: list[str] = []
    for img in tree.css("img"):
        src = img.attributes.get("src", "")
        if (src and "logo" not in src.lower() and "_next/image" not in src
                and not src.startswith("data:")):
            if not src.startswith("http"):
                src = f"{base_url.rstrip('/')}/{src.lstrip('/')}"
            images.append(src)
    return images


def _resolve_url(base: str, href: str) -> str:
    if href.startswith("http"):
        return href
    return f"{base.rstrip('/')}/{href.lstrip('/')}"


def _extract_slug(url: str) -> str:
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""
