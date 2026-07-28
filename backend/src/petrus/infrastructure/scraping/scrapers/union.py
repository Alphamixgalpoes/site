"""Scraper for Union Softwares platform sites.

Covers: Galpoes Gerais, Goldville, Nova Merito (~100 total).

Union sites use SSR HTML with Swiper.js carousels and lazy-loaded
images via data-src attributes.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from selectolax.parser import HTMLParser

from petrus.domain.services.scraper import CrawlResult, Scraper, ScrapingConfig
from petrus.infrastructure.scraping.http.fetcher import PageFetcher

logger = logging.getLogger(__name__)


class UnionScraper(Scraper):
    """Scraper for Union Softwares platform.

    Config.filters should contain:
    - listing_path: path for listings (default: "/imoveis")
    - card_selector: CSS selector for listing cards (default: ".imovel-card")
    - detail_link_selector: CSS for detail link within card
    """

    platform = "union"

    def __init__(self, fetcher: PageFetcher) -> None:
        self._fetcher = fetcher

    async def crawl(self, config: ScrapingConfig) -> list[CrawlResult]:
        results: list[CrawlResult] = []
        filters = config.filters
        listing_path = filters.get("listing_path", "/imoveis")
        card_selector = filters.get("card_selector", ".imovel-card, .property-item, .card")

        urls = list(config.listing_urls)
        if not urls:
            for page in range(1, config.max_pages + 1):
                urls.append(f"{config.base_url}{listing_path}?pagina={page}")

        for page_url in urls:
            html = await self._fetcher.fetch_text(page_url)
            if not html:
                break

            tree = HTMLParser(html)
            cards = tree.css(card_selector)

            if not cards:
                logger.info("No cards at %s, stopping", page_url)
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

            logger.info(
                "Page %s: %d cards, %d total",
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
        data: dict[str, Any] = {"url": url}

        title = tree.css_first("h1, .titulo-imovel, .property-title")
        if title:
            data["title"] = title.text(strip=True)

        price = tree.css_first(".valor, .price, .preco")
        if price:
            data["price_text"] = price.text(strip=True)

        for li in tree.css(".caracteristicas li, .features li, .info-list li"):
            text = li.text(strip=True)
            _parse_union_feature(text, data)

        desc = tree.css_first(".descricao, .description")
        if desc:
            data["description"] = desc.text(strip=True)

        location = tree.css_first(".localizacao, .location, .endereco")
        if location:
            data["location_text"] = location.text(strip=True)

        code = tree.css_first(".codigo, .ref, .reference")
        if code:
            data["reference"] = code.text(strip=True)

        images = _extract_union_images(tree, config.base_url)

        return CrawlResult(
            url=url,
            raw_data=data,
            images=images,
            source_id=_extract_id(url),
        )


def _parse_union_feature(text: str, data: dict) -> None:
    text_lower = text.lower().strip()
    num_match = re.search(r"[\d.,]+", text)
    num_str = num_match.group().replace(".", "").replace(",", ".") if num_match else ""

    if "área total" in text_lower or "area total" in text_lower or "at:" in text_lower:
        data["area_total"] = num_str
    elif "área construída" in text_lower or "area construida" in text_lower or "ac:" in text_lower:
        data["area_construida"] = num_str
    elif "pé direito" in text_lower:
        data["pe_direito"] = num_str
    elif "doca" in text_lower:
        data["docas"] = num_str
    elif "vaga" in text_lower:
        data["vagas"] = num_str
    elif "galpão" in text_lower or "galpao" in text_lower:
        data["tipo"] = "galpao"
    elif "terreno" in text_lower:
        data["tipo"] = "terreno"
    elif "locação" in text_lower or "locacao" in text_lower or "aluguel" in text_lower:
        data["tipo_operacao"] = "locacao"
    elif "venda" in text_lower:
        data["tipo_operacao"] = "venda"


def _extract_union_images(tree: HTMLParser, base_url: str) -> list[str]:
    images: list[str] = []
    for img in tree.css(".swiper-slide img, .gallery img, .carousel img, .fotos img"):
        src = (
            img.attributes.get("data-src")
            or img.attributes.get("src")
            or ""
        )
        if src and "logo" not in src.lower() and "placeholder" not in src.lower():
            images.append(_resolve_url(base_url, src))
    return images


def _resolve_url(base: str, href: str) -> str:
    if href.startswith("http"):
        return href
    base = base.rstrip("/")
    href = href.lstrip("/")
    return f"{base}/{href}"


def _extract_id(url: str) -> str:
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""
