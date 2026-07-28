"""Page content cache to avoid re-fetching within TTL."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path


class PageCache:
    """Local JSON-based page cache for development.

    Each URL is cached as a JSON file keyed by SHA256 of the URL.
    TTL is checked on read; expired entries are ignored.

    Can be replaced by a Supabase/Redis implementation
    sharing the same interface.
    """

    def __init__(
        self,
        cache_dir: str | Path = ".scraping_cache",
        ttl_hours: int = 24,
    ) -> None:
        self._dir = Path(cache_dir)
        self._dir.mkdir(parents=True, exist_ok=True)
        self._ttl_seconds = ttl_hours * 3600

    @staticmethod
    def _url_hash(url: str) -> str:
        return hashlib.sha256(url.encode()).hexdigest()[:16]

    def _path(self, url: str) -> Path:
        return self._dir / f"{self._url_hash(url)}.json"

    def get(self, url: str) -> bytes | None:
        """Get cached content if not expired. Returns None on miss."""
        path = self._path(url)
        if not path.exists():
            return None

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            fetched_at = data.get("fetched_at", 0)
            if time.time() - fetched_at > self._ttl_seconds:
                return None
            content_hex = data.get("content", "")
            return bytes.fromhex(content_hex)
        except (json.JSONDecodeError, ValueError, KeyError):
            return None

    def set(self, url: str, content: bytes) -> None:
        """Cache content for this URL."""
        path = self._path(url)
        data = {
            "url": url,
            "content": content.hex(),
            "fetched_at": time.time(),
        }
        path.write_text(json.dumps(data), encoding="utf-8")

    def invalidate(self, url: str) -> None:
        """Remove cached entry for URL."""
        path = self._path(url)
        if path.exists():
            path.unlink()

    def stats(self) -> dict:
        """Return cache statistics."""
        files = list(self._dir.glob("*.json"))
        valid = 0
        expired = 0
        now = time.time()
        for f in files:
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if now - data.get("fetched_at", 0) <= self._ttl_seconds:
                    valid += 1
                else:
                    expired += 1
            except Exception:
                expired += 1
        return {"total": len(files), "valid": valid, "expired": expired}
