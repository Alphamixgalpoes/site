"""Scraper for ImobiBrasil platform sites.

Covers: Morar Imoveis Cajamar (~40 properties).

ImobiBrasil sites use server-rendered HTML with CDN-hosted images
(imgs2.cdn-imobibrasil.com.br). Filters via JavaScript dropdowns
for city, type, and transaction.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from selectolax.parser import HTMLParser

from petrus.domain.services.scraper import CrawlResult, Scraper, ScrapingConfig
from petrus.infrastructure.scraping.http.fetcher import PageFetcher

logger = logging.getLogger(__name__)


class ImobiBrasilScraper(Scraper):
    """Scraper for ImobiBrasil platform.

    Config.filters:
    - listing_path: path with filters (default: "/busca")
    - tipo: property type filter (default: "galpao")
    - cidade: city filter
    """

    platform = "imobibrasil"

    def __init__(self, fetcher: PageFetcher) -> None:
        self._fetcher = fetcher

    async def crawl(self, config: ScrapingConfig) -> list[CrawlResult]:
        results: list[CrawlResult] = []
        filters = config.filters
        listing_path = filters.get("listing_path", "/busca")
        tipo = filters.get("tipo", "galpao")
        cidade = filters.get("cidade", "")

        for page in range(1, config.max_pages + 1):
            params = f"tipo={tipo}&cidade={cidade}&pagina={page}"
            url = f"{config.base_url}{listing_path}?{params}"

            html = await self._fetcher.fetch_text(url)
            if not html:
                break

            tree = HTMLParser(html)
            cards = tree.css(".imovel-card, .property-item, .resultado-item, .card")

            if not cards:
                break

            for card in cards:
                link = card.css_first("a")
                if not link:
                    continue
                href = link.attributes.get("href", "")
                if not href:
                    continue

                detail_url = _resolve_url(config.base_url, href)
                detail = await self.crawl_detail(detail_url, config)
                if detail:
                    results.append(detail)

            logger.info("Page %d: %d cards, %d total", page, len(cards), len(results))

        return results

    async def crawl_detail(
        self, url: str, config: ScrapingConfig
    ) -> CrawlResult | None:
        html = await self._fetcher.fetch_text(url)
        if not html:
            return None

        tree = HTMLParser(html)
        data: dict[str, Any] = {"url": url}

        title = tree.css_first("h1, .titulo, .property-title")
        if title:
            data["title"] = title.text(strip=True)

        price = tree.css_first(".valor, .price, .preco")
        if price:
            data["price_text"] = price.text(strip=True)

        address = tree.css_first(".endereco, .address, .localizacao")
        if address:
            data["address"] = address.text(strip=True)

        for li in tree.css(".caracteristicas li, .features li, .detalhes li"):
            text = li.text(strip=True)
            _parse_feature(text, data)

        desc = tree.css_first(".descricao, .description")
        if desc:
            data["description"] = desc.text(strip=True)

        ref = tree.css_first(".codigo, .referencia, .ref")
        if ref:
            data["reference"] = ref.text(strip=True)

        images: list[str] = []
        for img in tree.css(".galeria img, .gallery img, .carousel img"):
            src = (
                img.attributes.get("data-src")
                or img.attributes.get("src")
                or ""
            )
            if src and "placeholder" not in src.lower():
                images.append(_resolve_url(config.base_url, src))

        return CrawlResult(
            url=url,
            raw_data=data,
            images=images,
            source_id=_extract_id(url),
        )


def _parse_feature(text: str, data: dict) -> None:
    text_lower = text.lower()
    num_match = re.search(r"[\d.,]+", text)
    num_str = num_match.group() if num_match else ""

    if "área total" in text_lower or "area total" in text_lower:
        data["area_total"] = num_str
    elif "área" in text_lower or "area" in text_lower:
        data.setdefault("area_construida", num_str)
    elif "pé direito" in text_lower:
        data["pe_direito"] = num_str
    elif "doca" in text_lower:
        data["docas"] = num_str
    elif "vaga" in text_lower:
        data["vagas"] = num_str


def _resolve_url(base: str, href: str) -> str:
    if href.startswith("http"):
        return href
    return f"{base.rstrip('/')}/{href.lstrip('/')}"


def _extract_id(url: str) -> str:
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""
