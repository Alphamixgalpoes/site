"""robots.txt compliance checker."""

from __future__ import annotations

import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx


class RobotsTxtChecker:
    """Checks robots.txt before accessing any URL.

    Caches robots.txt per domain for cache_ttl seconds.
    Fail-open: if robots.txt cannot be fetched, allows access.
    """

    def __init__(
        self,
        user_agent: str = "AlphamixBot",
        cache_ttl: int = 86400,
    ) -> None:
        self._user_agent = user_agent
        self._cache_ttl = cache_ttl
        self._cache: dict[str, tuple[RobotFileParser, float]] = {}

    async def _fetch_robots(self, domain: str, scheme: str) -> RobotFileParser:
        """Fetch and parse robots.txt for a domain."""
        rp = RobotFileParser()
        robots_url = f"{scheme}://{domain}/robots.txt"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(robots_url)
                if resp.status_code == 200:
                    rp.parse(resp.text.splitlines())
                else:
                    rp.allow_all = True  # type: ignore[attr-defined]
        except Exception:
            rp.allow_all = True  # type: ignore[attr-defined]
        return rp

    async def _get_parser(self, url: str) -> RobotFileParser:
        parsed = urlparse(url)
        domain = parsed.netloc
        scheme = parsed.scheme or "https"

        cached = self._cache.get(domain)
        if cached:
            parser, fetched_at = cached
            if time.monotonic() - fetched_at < self._cache_ttl:
                return parser

        parser = await self._fetch_robots(domain, scheme)
        self._cache[domain] = (parser, time.monotonic())
        return parser

    async def is_allowed(self, url: str) -> bool:
        """Check if URL is allowed by robots.txt."""
        parser = await self._get_parser(url)
        if getattr(parser, "allow_all", False):
            return True
        return parser.can_fetch(self._user_agent, url)

    async def get_crawl_delay(self, url: str) -> float | None:
        """Get crawl-delay from robots.txt, if specified."""
        parser = await self._get_parser(url)
        delay = parser.crawl_delay(self._user_agent)
        return float(delay) if delay is not None else None
