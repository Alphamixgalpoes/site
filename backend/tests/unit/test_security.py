"""Tests for security middleware: UA blocking and referer checks."""

from __future__ import annotations

import pytest

from petrus.api.middleware.security import is_allowed_referer, is_blocked_user_agent


class TestIsBlockedUserAgent:
    def test_none_blocked(self):
        assert is_blocked_user_agent(None) is True

    def test_browser_allowed(self):
        assert is_blocked_user_agent("Mozilla/5.0 (Windows NT 10.0)") is False

    @pytest.mark.parametrize(
        "ua",
        [
            "python-requests/2.28",
            "curl/7.88",
            "wget/1.21",
            "Go-http-client/2.0",
            "Scrapy/2.7",
            "node-fetch/1.0",
        ],
    )
    def test_known_bots_blocked(self, ua):
        assert is_blocked_user_agent(ua) is True

    def test_case_insensitive(self):
        assert is_blocked_user_agent("Python-Requests/2.28") is True


class TestIsAllowedReferer:
    def test_none_allowed(self):
        assert is_allowed_referer(None) is True

    def test_production_allowed(self):
        assert is_allowed_referer("https://www.alphamixgalpoes.com.br/imoveis") is True

    def test_vercel_preview_allowed(self):
        assert is_allowed_referer("https://my-preview.vercel.app/page") is True

    def test_localhost_allowed(self):
        assert is_allowed_referer("http://localhost:3000/admin") is True

    def test_unknown_blocked(self):
        assert is_allowed_referer("https://evil-site.com/steal") is False
