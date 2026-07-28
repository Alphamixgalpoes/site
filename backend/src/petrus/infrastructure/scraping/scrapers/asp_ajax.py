"""Scraper for ASP.NET sites with AJAX endpoints.

Covers: J. Morais Imoveis (~33 properties).

ASP sites use proprietary AJAX endpoints like
/ajax/Carrega.ajax.asp for data loading.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from selectolax.parser import HTMLParser

from petrus.domain.services.scraper import CrawlResult, Scraper, ScrapingConfig
from petrus.infrastructure.scraping.http.fetcher import PageFetcher

logger = logging.getLogger(__name__)


class AspAjaxScraper(Scraper):
    """Scraper for ASP.NET sites with AJAX data loading.

    Config.filters:
    - ajax_endpoint: AJAX endpoint path (e.g. "/ajax/Carrega.ajax.asp")
    - listing_path: listing page path (default: "/imoveis")
    - ajax_params: dict of POST params for AJAX call
    """

    platform = "asp_ajax"

    def __init__(self, fetcher: PageFetcher) -> None:
        self._fetcher = fetcher

    async def crawl(self, config: ScrapingConfig) -> list[CrawlResult]:
        results: list[CrawlResult] = []
        filters = config.filters
        ajax_endpoint = filters.get("ajax_endpoint")

        if ajax_endpoint:
            results = await self._crawl_via_ajax(config, ajax_endpoint)
        else:
            results = await self._crawl_via_html(config)

        return results

    async def _crawl_via_ajax(
        self, config: ScrapingConfig, ajax_endpoint: str
    ) -> list[CrawlResult]:
        """Crawl using AJAX endpoint."""
        results: list[CrawlResult] = []
        ajax_url = f"{config.base_url}{ajax_endpoint}"
        params = config.filters.get("ajax_params", {})

        for page in range(1, config.max_pages + 1):
            params["pagina"] = str(page)

            import httpx
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    ajax_url,
                    data=params,
                    headers={
                        "X-Requested-With": "XMLHttpRequest",
                        "User-Agent": "AlphamixBot/1.0",
                    },
                )
                if resp.status_code != 200:
                    break

                html = resp.text

            tree = HTMLParser(html)
            cards = tree.css(".imovel, .property, .resultado, .item")

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

            logger.info("AJAX page %d: %d cards, %d total", page, len(cards), len(results))

        return results

    async def _crawl_via_html(self, config: ScrapingConfig) -> list[CrawlResult]:
        """Fallback: crawl via standard HTML pagination."""
        results: list[CrawlResult] = []
        listing_path = config.filters.get("listing_path", "/imoveis")

        for page in range(1, config.max_pages + 1):
            url = f"{config.base_url}{listing_path}?pagina={page}"
            html = await self._fetcher.fetch_text(url)
            if not html:
                break

            tree = HTMLParser(html)
            cards = tree.css(".imovel, .property-card, .resultado")

            if not cards:
                break

            for card in cards:
                link = card.css_first("a")
                if not link:
                    continue
                href = link.attributes.get("href", "")
                if href:
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

        for row in tree.css("table tr, .detalhes li, .info-row"):
            text = row.text(strip=True)
            _parse_asp_feature(text, data)

        desc = tree.css_first(".descricao, .description, .obs")
        if desc:
            data["description"] = desc.text(strip=True)

        address = tree.css_first(".endereco, .localizacao, .address")
        if address:
            data["address"] = address.text(strip=True)

        images: list[str] = []
        for img in tree.css(".galeria img, .fotos img, .carousel img"):
            src = img.attributes.get("src") or img.attributes.get("data-src", "")
            if src and "logo" not in src.lower():
                images.append(_resolve_url(config.base_url, src))

        return CrawlResult(
            url=url,
            raw_data=data,
            images=images,
            source_id=_extract_id(url),
        )


def _parse_asp_feature(text: str, data: dict) -> None:
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
    elif "kva" in text_lower or "elétrica" in text_lower:
        data["eletrica"] = num_str


def _resolve_url(base: str, href: str) -> str:
    if href.startswith("http"):
        return href
    return f"{base.rstrip('/')}/{href.lstrip('/')}"


def _extract_id(url: str) -> str:
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""
