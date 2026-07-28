"""Per-domain rate limiter using token bucket pattern."""

from __future__ import annotations

import asyncio
import random
import time
from urllib.parse import urlparse


class RateLimiter:
    """Ensures at most 1 request per interval per domain.

    Each domain has its own independent bucket.
    Thread-safe via asyncio locks.
    Adds random jitter (0-30% of interval) to avoid detection.
    """

    def __init__(
        self,
        default_interval: float = 1.5,
        jitter_fraction: float = 0.3,
    ) -> None:
        self._default_interval = default_interval
        self._jitter_fraction = jitter_fraction
        self._intervals: dict[str, float] = {}
        self._last_request: dict[str, float] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    def set_interval(self, domain: str, interval: float) -> None:
        self._intervals[domain] = interval

    def _get_interval(self, domain: str) -> float:
        base = self._intervals.get(domain, self._default_interval)
        jitter = random.uniform(0, base * self._jitter_fraction)
        return base + jitter

    def _get_lock(self, domain: str) -> asyncio.Lock:
        if domain not in self._locks:
            self._locks[domain] = asyncio.Lock()
        return self._locks[domain]

    @staticmethod
    def extract_domain(url: str) -> str:
        parsed = urlparse(url)
        return parsed.netloc or parsed.path.split("/")[0]

    async def acquire(self, url: str) -> None:
        """Wait until rate limit allows a request to this domain."""
        domain = self.extract_domain(url)
        lock = self._get_lock(domain)

        async with lock:
            interval = self._get_interval(domain)
            last = self._last_request.get(domain, 0.0)
            elapsed = time.monotonic() - last
            if elapsed < interval:
                await asyncio.sleep(interval - elapsed)
            self._last_request[domain] = time.monotonic()
