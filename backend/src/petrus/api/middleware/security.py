from __future__ import annotations

BLOCKED_UA_PATTERNS = [
    "python-requests", "python-urllib", "curl", "wget", "go-http-client",
    "java", "libwww", "scrapy", "httpx", "aiohttp", "apache-httpclient",
    "okhttp", "axios", "node-fetch",
]

ALLOWED_ORIGINS = [
    "https://www.alphamixgalpoes.com.br",
    "https://alphamixgalpoes.com.br",
    "https://petrusweb.vercel.app",
]


def is_blocked_user_agent(ua: str | None) -> bool:
    if not ua:
        return True
    ua_lower = ua.lower()
    return any(p in ua_lower for p in BLOCKED_UA_PATTERNS)


def is_allowed_referer(referer: str | None) -> bool:
    if not referer:
        return True  # Direct access allowed
    if ".vercel.app" in referer:
        return True  # Preview deployments
    return any(referer.startswith(origin) for origin in ALLOWED_ORIGINS)
