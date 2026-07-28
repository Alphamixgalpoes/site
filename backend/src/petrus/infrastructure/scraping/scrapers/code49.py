"""Scraper for Code49 platform sites.

Covers: Caixeta Imoveis, IMOBPARC, MK Prime Imoveis (~800 total).

Code49 sites use a search_base64() pattern: search filters are
JSON-encoded, then base64-encoded, and sent as a URL parameter.
Responses are paginated JSON.
"""

from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any

from selectolax.parser import HTMLParser

from petrus.domain.services.scraper import CrawlResult, Scraper, ScrapingConfig
from petrus.infrastructure.scraping.http.fetcher import PageFetcher

logger = logging.getLogger(__name__)


class Code49Scraper(Scraper):
    """Scraper for Code49 platform.

    Config.filters should contain:
    - property_types: list of property type IDs to filter (e.g. ["galpao"])
    - cities: list of city names to filter
    - api_path: API endpoint path (default: "/api/properties")
    - use_base64: whether to use base64-encoded filters (default: True)
    """

    platform = "code49"

    def __init__(self, fetcher: PageFetcher) -> None:
        self._fetcher = fetcher

    async def crawl(self, config: ScrapingConfig) -> list[CrawlResult]:
        results: list[CrawlResult] = []
        filters = config.filters
        api_path = filters.get("api_path", "/api/properties")

        search_filters = {
            "type": filters.get("property_types", ["galpao", "barracao"]),
            "cities": filters.get("cities", []),
            "transaction": filters.get("transaction", ["rent", "sale"]),
        }

        for page in range(1, config.max_pages + 1):
            search_filters["page"] = page

            if filters.get("use_base64", True):
                encoded = base64.b64encode(
                    json.dumps(search_filters).encode()
                ).decode()
                url = f"{config.base_url}{api_path}?search={encoded}"
            else:
                params = "&".join(f"{k}={v}" for k, v in search_filters.items()
                                 if not isinstance(v, (list, dict)))
                url = f"{config.base_url}{api_path}?page={page}&{params}"

            data = await self._fetcher.fetch_json(url)

            items = _extract_items(data)
            if not items:
                logger.info("No items on page %d, stopping", page)
                break

            for item in items:
                detail_url = _build_detail_url(config.base_url, item)
                if detail_url:
                    detail = await self.crawl_detail(detail_url, config)
                    if detail:
                        detail.raw_data.update(_merge_listing_data(item))
                        results.append(detail)
                else:
                    images = _extract_image_urls(item, config.base_url)
                    results.append(CrawlResult(
                        url=url,
                        raw_data=item,
                        images=images,
                        source_id=str(item.get("id", item.get("code", ""))),
                    ))

            logger.info(
                "Page %d: %d items, %d total", page, len(items), len(results),
            )

        return results

    async def crawl_detail(
        self, url: str, config: ScrapingConfig
    ) -> CrawlResult | None:
        html = await self._fetcher.fetch_text(url)
        if not html:
            return None

        tree = HTMLParser(html)
        data: dict[str, Any] = {"url": url}

        title_node = tree.css_first("h1, .property-title, .titulo")
        if title_node:
            data["title"] = title_node.text(strip=True)

        desc_node = tree.css_first(".description, .descricao, .property-description")
        if desc_node:
            data["description"] = desc_node.text(strip=True)

        for node in tree.css(".property-info li, .caracteristicas li, .features li"):
            text = node.text(strip=True)
            _parse_feature(text, data)

        price_node = tree.css_first(".price, .preco, .valor")
        if price_node:
            data["price_text"] = price_node.text(strip=True)

        images: list[str] = []
        for img in tree.css(".gallery img, .carousel img, .slider img, .fotos img"):
            src = img.attributes.get("src") or img.attributes.get("data-src", "")
            if src and "thumb" not in src:
                images.append(_resolve_url(config.base_url, src))

        return CrawlResult(
            url=url,
            raw_data=data,
            images=images,
            source_id=_extract_source_id(url),
        )


def _extract_items(data: Any) -> list[dict]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "results", "items", "properties", "imoveis"):
            if key in data and isinstance(data[key], list):
                return data[key]
    return []


def _build_detail_url(base_url: str, item: dict) -> str | None:
    slug = item.get("slug") or item.get("url") or item.get("link")
    if slug:
        return _resolve_url(base_url, slug)
    item_id = item.get("id") or item.get("code")
    if item_id:
        return f"{base_url}/imovel/{item_id}"
    return None


def _merge_listing_data(item: dict) -> dict:
    """Extract key fields from listing JSON to merge with detail."""
    fields = {}
    for key in ("totalArea", "builtArea", "rentPrice", "salePrice",
                 "city", "neighborhood", "address", "type", "code"):
        if key in item and item[key]:
            fields[key] = item[key]
    return fields


def _extract_image_urls(item: dict, base_url: str) -> list[str]:
    images: list[str] = []
    raw = item.get("images") or item.get("photos") or item.get("fotos", [])
    if isinstance(raw, list):
        for img in raw:
            if isinstance(img, str):
                images.append(_resolve_url(base_url, img))
            elif isinstance(img, dict):
                url = img.get("url") or img.get("src") or img.get("path", "")
                if url:
                    images.append(_resolve_url(base_url, url))
    return images


def _parse_feature(text: str, data: dict) -> None:
    text_lower = text.lower()
    num_match = re.search(r"[\d.,]+", text)
    num_str = num_match.group() if num_match else ""

    if "área total" in text_lower or "area total" in text_lower:
        data["totalArea"] = num_str
    elif "área construída" in text_lower or "area construida" in text_lower:
        data["builtArea"] = num_str
    elif "pé direito" in text_lower or "pe direito" in text_lower:
        data["ceilingHeight"] = num_str
    elif "doca" in text_lower:
        data["docks"] = num_str
    elif "vaga" in text_lower:
        data["parkingSpots"] = num_str
    elif "elétrica" in text_lower or "kva" in text_lower:
        data["electricPower"] = num_str


def _resolve_url(base: str, href: str) -> str:
    if href.startswith("http"):
        return href
    base = base.rstrip("/")
    href = href.lstrip("/")
    return f"{base}/{href}"


def _extract_source_id(url: str) -> str:
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""
