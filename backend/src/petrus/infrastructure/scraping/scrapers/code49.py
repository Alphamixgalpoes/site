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
        if config.filters.get("html_mode") or config.listing_urls:
            return await self._crawl_html(config)

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

    async def _crawl_html(self, config: ScrapingConfig) -> list[CrawlResult]:
        """Crawl Code49 sites that use server-rendered HTML (no JSON API)."""
        results: list[CrawlResult] = []
        urls_to_crawl = list(config.listing_urls) or [config.base_url]
        seen_ids: set[str] = set()

        for page_url in urls_to_crawl:
            html = await self._fetcher.fetch_text(page_url)
            if not html:
                continue

            tree = HTMLParser(html)
            links = _extract_property_links(tree, config.base_url)

            for detail_url, prop_id in links:
                if prop_id in seen_ids:
                    continue
                seen_ids.add(prop_id)

                detail = await self.crawl_detail(detail_url, config)
                if detail:
                    results.append(detail)

            logger.info(
                "HTML page %s: %d links, %d total results",
                page_url, len(links), len(results),
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

        desc_node = tree.css_first(
            ".property-description, .description, .descricao"
        )
        if desc_node:
            data["description"] = desc_node.text(strip=True)
            # Extract structured data from free-text description
            _parse_description_fields(desc_node.text(strip=True), data)

        # Code49 features bar: "12 salas 4 banh. 15 Vagas descobertas"
        features_node = tree.css_first(".c49-property-features")
        if features_node:
            _parse_features_bar(features_node.text(strip=True), data)

        # Standard feature lists
        for node in tree.css(
            ".property-info li, .caracteristicas li, .features li"
        ):
            _parse_feature(node.text(strip=True), data)

        # Code49 HTML variant: labeled fields in <p><strong> and <table>
        _parse_labeled_fields(tree, data)

        # Price: standard selectors + Code49 HTML variant
        price_node = tree.css_first(".price, .preco, .valor")
        if price_node:
            data["price_text"] = price_node.text(strip=True)
        _extract_prices(tree, data)

        # Images: multiple extraction strategies
        images: list[str] = []
        seen_imgs: set[str] = set()

        def _add_img(src: str) -> None:
            if not src or "logo" in src.lower():
                return
            resolved = _resolve_url(config.base_url, src)
            if resolved not in seen_imgs:
                seen_imgs.add(resolved)
                images.append(resolved)

        # Strategy 1: data-foto on carousel items (full-size, preferred)
        for item in tree.css(".carousel-item[data-foto]"):
            _add_img(item.attributes.get("data-foto") or "")

        # Strategy 2: background-image in carousel indicator <li>
        for li in tree.css("#photos-property-carousel li[style]"):
            style = li.attributes.get("style") or ""
            m = re.search(r"url\(([^)]+)\)", style)
            if m:
                _add_img(m.group(1))

        # Strategy 3: standard img tags in gallery/carousel sections
        for img in tree.css(
            ".gallery img, .carousel img, .slider img, .fotos img, "
            "#photos-property-carousel img, [id^=c49mod-24] img"
        ):
            src = img.attributes.get("src") or img.attributes.get("data-src") or ""
            if "thumb" not in src:
                _add_img(src)

        return CrawlResult(
            url=url,
            raw_data=data,
            images=images,
            source_id=_extract_source_id(url),
        )


def _extract_property_links(
    tree: HTMLParser, base_url: str,
) -> list[tuple[str, str]]:
    """Extract property detail links from an HTML listing page.

    Returns list of (full_url, property_id) tuples, deduplicated by ID.
    """
    links: list[tuple[str, str]] = []
    seen: set[str] = set()
    for a_tag in tree.css("a[href]"):
        href = a_tag.attributes.get("href") or ""
        match = re.search(r"/(\d+)/imoveis?/", href)
        if match:
            prop_id = match.group(1)
            if prop_id not in seen:
                seen.add(prop_id)
                links.append((_resolve_url(base_url, href), prop_id))
    return links


_LABEL_MAP: dict[str, str] = {
    "cidade": "city",
    "bairro": "neighborhood",
    "regiao": "region",
    "região": "region",
    "metragem": "totalArea",
    "area total": "totalArea",
    "área total": "totalArea",
    "area construida": "builtArea",
    "area construída": "builtArea",
    "área construída": "builtArea",
    "area privativa": "builtArea",
    "área privativa": "builtArea",
    "pe direito": "ceilingHeight",
    "pé direito": "ceilingHeight",
    "docas": "docks",
    "doca": "docks",
    "vagas": "parkingSpots",
    "eletrica": "electricPower",
    "elétrica": "electricPower",
    "transacao": "transaction_type",
    "transação": "transaction_type",
    "finalidade": "purpose",
    "tipo de imovel": "property_type",
    "tipo de imóvel": "property_type",
    "salas": "rooms",
}

_NUMERIC_FIELDS = {"totalArea", "builtArea", "ceilingHeight"}
_INT_FIELDS = {"docks", "parkingSpots", "electricPower", "rooms"}


def _parse_labeled_fields(tree: HTMLParser, data: dict) -> None:
    """Parse labeled field pairs from multiple Code49 HTML patterns.

    Supports three structures found in real Code49 sites:
    1. div.table-row with child divs (label, value) — most common
    2. <p><strong>Label:</strong> Value</p>
    3. <tr><td>Label</td><td>Value</td></tr>
    """
    pairs: list[tuple[str, str]] = []

    # Pattern 1: div.table-row — the real Code49 structure
    # row.css("div") returns the row itself + children; skip the row
    for row in tree.css(".table-row"):
        children = [
            d for d in row.css("div")
            if "table-row" not in (d.attributes.get("class") or "")
        ]
        if len(children) >= 2:
            label = children[0].text(strip=True).rstrip(":").lower()
            value = children[1].text(strip=True)
            if label and value:
                pairs.append((label, value))

    # Pattern 2: <p> with <strong> label
    for p_node in tree.css("p"):
        strong = p_node.css_first("strong")
        if not strong:
            continue
        label = strong.text(strip=True).rstrip(":").lower()
        full_text = p_node.text(strip=True)
        value = full_text.split(":", 1)[-1].strip() if ":" in full_text else ""
        if label and value:
            pairs.append((label, value))

    # Pattern 3: <table> with <td> pairs
    for row in tree.css("tr"):
        cells = row.css("td")
        if len(cells) < 2:
            continue
        label = cells[0].text(strip=True).rstrip(":").lower()
        value = cells[1].text(strip=True)
        if label and value:
            pairs.append((label, value))

    # Map all collected pairs to data fields
    for label, value in pairs:
        for pattern, field in _LABEL_MAP.items():
            if pattern not in label:
                continue
            if field in _NUMERIC_FIELDS:
                num = re.search(r"[\d.,]+", value)
                if num:
                    data.setdefault(field, num.group())
            elif field in _INT_FIELDS:
                num = re.search(r"\d+", value)
                if num:
                    data.setdefault(field, num.group())
            else:
                data.setdefault(field, value)
            break


def _extract_prices(tree: HTMLParser, data: dict) -> None:
    """Extract sale/rent prices from Code49 HTML.

    Supports two structures:
    1. div.c49-property-price (real Code49): title + value sub-divs
    2. div.price-section with text containing "Venda"/"Locação" near "R$"
    """
    # Pattern 1: div.c49-property-price (real Code49 sites)
    for price_div in tree.css(".c49-property-price"):
        title_node = price_div.css_first(".c49-property-price-title")
        value_node = price_div.css_first(".c49-property-price-value")
        if not value_node:
            continue
        value_text = value_node.text(strip=True)
        price_match = re.search(r"R\$\s*([\d.,]+)", value_text)
        if not price_match:
            continue
        price_str = price_match.group(1)
        title_text = (title_node.text(strip=True) if title_node else "").lower()
        if "venda" in title_text:
            data.setdefault("salePrice", price_str)
        elif any(w in title_text for w in ("locacao", "locação", "aluguel")):
            data.setdefault("rentPrice", price_str)

    # Pattern 2: div.price-section (fixture/older variant)
    price_section = tree.css_first(".price-section")
    if price_section:
        for div in price_section.css("div"):
            text = div.text(strip=True)
            price_match = re.search(r"R\$\s*([\d.,]+)", text)
            if not price_match:
                continue
            price_str = price_match.group(1)
            text_lower = text.lower()
            if "venda" in text_lower:
                data.setdefault("salePrice", price_str)
            elif any(w in text_lower for w in ("locacao", "locação", "aluguel")):
                data.setdefault("rentPrice", price_str)


def _parse_features_bar(text: str, data: dict) -> None:
    """Parse the c49-property-features bar: '12 salas 4 banh. 15 Vagas'."""
    text_lower = text.lower()
    if "parkingSpots" not in data:
        m = re.search(r"(\d+)\s*vagas?", text_lower)
        if m:
            data["parkingSpots"] = m.group(1)
    if "rooms" not in data:
        m = re.search(r"(\d+)\s*salas?", text_lower)
        if m:
            data["rooms"] = m.group(1)


def _parse_description_fields(text: str, data: dict) -> None:
    """Extract structured fields from free-text description as fallback."""
    text_lower = text.lower()

    # Pé direito: "pé direito com 8 metros" or "pé direito de 10m"
    if "ceilingHeight" not in data:
        m = re.search(
            r"p[eé]\s*direito\s*(?:com|de)?\s*([\d.,]+)\s*m", text_lower
        )
        if m:
            data["ceilingHeight"] = m.group(1)

    # Docas: "3 docas" or "uma doca" or "doca frontal"
    if "docks" not in data:
        m = re.search(r"(\d+)\s*docas?", text_lower)
        if m:
            data["docks"] = m.group(1)
        elif "uma doca" in text_lower:
            data["docks"] = "1"

    # Energia elétrica: "300 kva" or "150 KVA"
    if "electricPower" not in data:
        m = re.search(r"(\d+)\s*kva", text_lower)
        if m:
            data["electricPower"] = m.group(1)


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
    # Try numeric ID from /{id}/imoveis/ pattern (Code49 HTML variant)
    match = re.search(r"/(\d+)/imoveis?/", url)
    if match:
        return match.group(1)
    # Fallback: last path segment
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""
