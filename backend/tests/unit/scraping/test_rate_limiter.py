"""Tests for per-domain rate limiter."""

import time

import pytest

from petrus.infrastructure.scraping.http.rate_limiter import RateLimiter


@pytest.mark.unit
class TestRateLimiter:
    @pytest.mark.asyncio
    async def test_extract_domain(self):
        assert RateLimiter.extract_domain("https://example.com/page") == "example.com"
        assert RateLimiter.extract_domain("https://sub.example.com/page") == "sub.example.com"

    @pytest.mark.asyncio
    async def test_first_request_no_delay(self):
        limiter = RateLimiter(default_interval=1.0, jitter_fraction=0)
        start = time.monotonic()
        await limiter.acquire("https://example.com/page1")
        elapsed = time.monotonic() - start
        assert elapsed < 0.1  # no delay on first request

    @pytest.mark.asyncio
    async def test_second_request_has_delay(self):
        limiter = RateLimiter(default_interval=0.2, jitter_fraction=0)
        await limiter.acquire("https://example.com/page1")
        start = time.monotonic()
        await limiter.acquire("https://example.com/page2")
        elapsed = time.monotonic() - start
        assert elapsed >= 0.15  # should wait ~0.2s

    @pytest.mark.asyncio
    async def test_different_domains_no_delay(self):
        limiter = RateLimiter(default_interval=1.0, jitter_fraction=0)
        await limiter.acquire("https://a.com/page")
        start = time.monotonic()
        await limiter.acquire("https://b.com/page")
        elapsed = time.monotonic() - start
        assert elapsed < 0.1  # different domain, no delay

    @pytest.mark.asyncio
    async def test_custom_interval(self):
        limiter = RateLimiter(default_interval=1.0, jitter_fraction=0)
        limiter.set_interval("fast.com", 0.1)
        await limiter.acquire("https://fast.com/page1")
        start = time.monotonic()
        await limiter.acquire("https://fast.com/page2")
        elapsed = time.monotonic() - start
        assert elapsed >= 0.08
        assert elapsed < 0.5  # should use custom interval, not default

    @pytest.mark.asyncio
    async def test_jitter_adds_variability(self):
        limiter = RateLimiter(default_interval=0.1, jitter_fraction=0.5)
        await limiter.acquire("https://example.com/page1")
        start = time.monotonic()
        await limiter.acquire("https://example.com/page2")
        elapsed = time.monotonic() - start
        # With 50% jitter on 0.1s base, delay should be 0.1-0.15s
        assert elapsed >= 0.08
        assert elapsed < 0.5
