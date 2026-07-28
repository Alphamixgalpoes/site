"""Tests for local page cache."""

import pytest

from petrus.infrastructure.scraping.cache.page_cache import PageCache


@pytest.mark.unit
class TestPageCache:
    def test_set_and_get(self, tmp_path):
        cache = PageCache(cache_dir=tmp_path / "cache", ttl_hours=24)
        url = "https://example.com/page1"
        content = b"<html>test</html>"

        cache.set(url, content)
        result = cache.get(url)
        assert result == content

    def test_miss_returns_none(self, tmp_path):
        cache = PageCache(cache_dir=tmp_path / "cache", ttl_hours=24)
        assert cache.get("https://nonexistent.com") is None

    def test_expired_returns_none(self, tmp_path):
        cache = PageCache(cache_dir=tmp_path / "cache", ttl_hours=0)
        url = "https://example.com/expired"
        cache.set(url, b"data")

        import time
        time.sleep(0.1)
        assert cache.get(url) is None

    def test_invalidate(self, tmp_path):
        cache = PageCache(cache_dir=tmp_path / "cache", ttl_hours=24)
        url = "https://example.com/remove"
        cache.set(url, b"data")
        assert cache.get(url) is not None

        cache.invalidate(url)
        assert cache.get(url) is None

    def test_stats(self, tmp_path):
        cache = PageCache(cache_dir=tmp_path / "cache", ttl_hours=24)
        cache.set("https://a.com", b"a")
        cache.set("https://b.com", b"b")

        stats = cache.stats()
        assert stats["total"] == 2
        assert stats["valid"] == 2
        assert stats["expired"] == 0
