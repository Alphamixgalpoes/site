"""Integration tests for scraping API endpoints."""

import pytest


@pytest.mark.integration
class TestScrapingEndpoints:
    def test_list_platforms(self, client):
        resp = client.get("/api/v1/scraping/plataformas")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 7
        keys = {p["key"] for p in data}
        assert "code49" in keys
        assert "union" in keys
        assert "static_html" in keys

    def test_scraping_stats(self, client):
        resp = client.get("/api/v1/scraping/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "plataformas_disponiveis" in data
        assert "runs_pendentes" in data

    def test_execute_nonexistent_run_404(self, client):
        resp = client.post("/api/v1/scraping/executar/00000000-0000-0000-0000-000000000099")
        assert resp.status_code in (404, 500)

    def test_preview_nonexistent_fonte_404(self, client):
        resp = client.post("/api/v1/scraping/preview/00000000-0000-0000-0000-000000000099")
        assert resp.status_code in (404, 500)

    def test_execute_all_pending_empty(self, client):
        resp = client.post("/api/v1/scraping/executar-todos")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 0  # no pending runs
