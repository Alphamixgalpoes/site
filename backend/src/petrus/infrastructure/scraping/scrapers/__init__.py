"""Platform scrapers — auto-registers all scrapers at import time."""

from petrus.infrastructure.scraping.registry import ScraperRegistry
from petrus.infrastructure.scraping.scrapers.asp_ajax import AspAjaxScraper
from petrus.infrastructure.scraping.scrapers.code49 import Code49Scraper
from petrus.infrastructure.scraping.scrapers.imobibrasil import ImobiBrasilScraper
from petrus.infrastructure.scraping.scrapers.nextjs import NextJsScraper
from petrus.infrastructure.scraping.scrapers.static_html import StaticHtmlScraper
from petrus.infrastructure.scraping.scrapers.union import UnionScraper
from petrus.infrastructure.scraping.scrapers.wordpress_houzez import WordPressScraper

ScraperRegistry.register("static_html", StaticHtmlScraper)
ScraperRegistry.register("code49", Code49Scraper)
ScraperRegistry.register("union", UnionScraper)
ScraperRegistry.register("wordpress_houzez", WordPressScraper)
ScraperRegistry.register("imobibrasil", ImobiBrasilScraper)
ScraperRegistry.register("nextjs", NextJsScraper)
ScraperRegistry.register("asp_ajax", AspAjaxScraper)
