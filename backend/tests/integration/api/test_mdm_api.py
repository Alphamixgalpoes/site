"""API tests for MDM endpoints."""

from __future__ import annotations


class TestMdmStats:
    def test_stats(self, client):
        resp = client.get("/api/v1/mdm/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "fontes" in data
        assert "cards_pendentes" in data
        assert "cards_por_tipo" in data

    def test_stats_requires_auth(self, anon_client):
        resp = anon_client.get("/api/v1/mdm/stats")
        assert resp.status_code == 401


class TestMdmFontes:
    def test_list_fontes_empty(self, client):
        resp = client.get("/api/v1/mdm/fontes")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_fontes_requires_auth(self, anon_client):
        resp = anon_client.get("/api/v1/mdm/fontes")
        assert resp.status_code == 401

    def test_get_fonte_not_found(self, client):
        resp = client.get("/api/v1/mdm/fontes/00000000-0000-0000-0000-000000000099")
        assert resp.status_code == 404


class TestMdmCards:
    def test_list_cards_empty(self, client):
        resp = client.get("/api/v1/mdm/cards")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_cards_resumo(self, client):
        resp = client.get("/api/v1/mdm/cards/resumo")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0

    def test_cards_requires_auth(self, anon_client):
        resp = anon_client.get("/api/v1/mdm/cards")
        assert resp.status_code == 401


class TestMdmSubmitUrl:
    def test_submit_url(self, client):
        resp = client.post(
            "/api/v1/mdm/submeter/url",
            json={
                "nome": "Fonte Teste",
                "url": "https://example.com/imoveis",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["nome"] == "Fonte Teste"

    def test_submit_url_requires_auth(self, anon_client):
        resp = anon_client.post(
            "/api/v1/mdm/submeter/url",
            json={
                "nome": "Test",
                "url": "https://example.com",
            },
        )
        assert resp.status_code == 401


class TestMdmScrapingQueue:
    def test_scraping_queue_empty(self, client):
        resp = client.get("/api/v1/mdm/scraping/fila")
        assert resp.status_code == 200
        assert resp.json() == []


class TestMdmQualidade:
    def test_ranking(self, client):
        resp = client.get("/api/v1/mdm/qualidade/ranking")
        assert resp.status_code == 200

    def test_recalcular(self, client):
        resp = client.post("/api/v1/mdm/qualidade/recalcular")
        assert resp.status_code == 200
        assert resp.json()["recalculados"] == 0
