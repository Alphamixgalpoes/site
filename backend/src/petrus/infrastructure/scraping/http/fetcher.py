"""PageFetcher — shared HTTP client for all scrapers."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from petrus.infrastructure.scraping.http.rate_limiter import RateLimiter
from petrus.infrastructure.scraping.http.robots import RobotsTxtChecker

logger = logging.getLogger(__name__)

DEFAULT_USER_AGENT = (
    "AlphamixBot/1.0 (+https://alphamixgalpoes.com.br)"
)


@dataclass(frozen=True)
class PageContent:
    """Value object: fetched page content."""

    url: str
    status_code: int
    body: bytes
    content_type: str
    elapsed_ms: int
    cached: bool = False


class PageFetcher:
    """HTTP client shared across all scrapers.

    Encapsulates:
    - Per-domain rate limiting
    - Retry with exponential backoff
    - robots.txt compliance
    - Configurable timeout and headers
    - Request logging
    """

    def __init__(
        self,
        rate_limiter: RateLimiter | None = None,
        robots_checker: RobotsTxtChecker | None = None,
        user_agent: str = DEFAULT_USER_AGENT,
        timeout: float = 30.0,
        max_retries: int = 3,
    ) -> None:
        self._rate_limiter = rate_limiter or RateLimiter()
        self._robots = robots_checker or RobotsTxtChecker()
        self._user_agent = user_agent
        self._timeout = timeout
        self._max_retries = max_retries
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self._timeout,
                headers={
                    "User-Agent": self._user_agent,
                    "Accept": "text/html,application/xhtml+xml,application/json",
                    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5",
                },
                follow_redirects=True,
            )
        return self._client

    async def fetch(
        self,
        url: str,
        headers: dict[str, str] | None = None,
        check_robots: bool = True,
    ) -> PageContent:
        """Fetch a URL respecting rate limits and robots.txt."""
        if check_robots and not await self._robots.is_allowed(url):
            logger.warning("Blocked by robots.txt: %s", url)
            return PageContent(
                url=url, status_code=403, body=b"",
                content_type="", elapsed_ms=0,
            )

        crawl_delay = await self._robots.get_crawl_delay(url)
        if crawl_delay:
            domain = RateLimiter.extract_domain(url)
            self._rate_limiter.set_interval(domain, crawl_delay)

        await self._rate_limiter.acquire(url)

        client = await self._get_client()

        for attempt in range(1, self._max_retries + 1):
            try:
                resp = await client.get(url, headers=headers or {})
                content_type = resp.headers.get("content-type", "")
                elapsed_ms = int(resp.elapsed.total_seconds() * 1000)

                logger.debug(
                    "GET %s -> %d (%dms, attempt %d)",
                    url, resp.status_code, elapsed_ms, attempt,
                )

                return PageContent(
                    url=url,
                    status_code=resp.status_code,
                    body=resp.content,
                    content_type=content_type,
                    elapsed_ms=elapsed_ms,
                )
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                logger.warning(
                    "Attempt %d/%d failed for %s: %s",
                    attempt, self._max_retries, url, exc,
                )
                if attempt < self._max_retries:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)

        logger.error("All %d attempts failed for %s", self._max_retries, url)
        return PageContent(
            url=url, status_code=0, body=b"",
            content_type="", elapsed_ms=0,
        )

    async def fetch_text(
        self, url: str, encoding: str = "utf-8", **kwargs: object
    ) -> str:
        """Fetch URL and return decoded text."""
        page = await self.fetch(url, **kwargs)  # type: ignore[arg-type]
        if page.status_code == 0:
            return ""
        try:
            return page.body.decode(encoding)
        except UnicodeDecodeError:
            return page.body.decode("latin-1")

    async def fetch_json(self, url: str, **kwargs: object) -> dict | list:
        """Fetch URL and return parsed JSON."""
        import json

        page = await self.fetch(url, **kwargs)  # type: ignore[arg-type]
        if page.status_code == 0 or not page.body:
            return {}
        return json.loads(page.body)

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
