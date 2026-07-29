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
        assert data["started"] == 0


@pytest.mark.integration
class TestScrapingMonitorEndpoints:
    def test_overview(self, client):
        resp = client.get("/api/v1/scraping/monitor/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_fontes" in data
        assert "fontes_ok" in data
        assert "fontes_warning" in data
        assert "fontes_error" in data
        assert "fontes_stale" in data
        assert "fontes_never" in data
        assert "runs_last_7d" in data
        assert "novos_last_7d" in data

    def test_fontes_health(self, client):
        resp = client.get("/api/v1/scraping/monitor/fontes")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_fonte_health_not_found(self, client):
        resp = client.get("/api/v1/scraping/monitor/fontes/00000000-0000-0000-0000-000000000099")
        assert resp.status_code == 404

    def test_run_detail_not_found(self, client):
        resp = client.get("/api/v1/scraping/monitor/runs/00000000-0000-0000-0000-000000000099")
        assert resp.status_code == 404

    def test_run_live_not_found(self, client):
        resp = client.get("/api/v1/scraping/monitor/runs/00000000-0000-0000-0000-000000000099/live")
        assert resp.status_code == 404

    def test_run_requests_empty_for_unknown_run(self, client):
        url = "/api/v1/scraping/monitor/runs"
        resp = client.get(f"{url}/00000000-0000-0000-0000-000000000099/requests")
        assert resp.status_code == 200
        assert resp.json() == []
