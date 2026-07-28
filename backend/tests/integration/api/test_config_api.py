"""Integration tests for Config endpoints (campos + processo tipos)."""

from __future__ import annotations


class TestConfigCampos:
    def test_list_campos(self, client):
        resp = client.get("/api/v1/config/campos")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_requires_auth(self, anon_client):
        resp = anon_client.get("/api/v1/config/campos")
        assert resp.status_code == 401


class TestConfigProcessoTipos:
    def test_list_tipos(self, client):
        resp = client.get("/api/v1/config/processo-tipos")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_tipo(self, client):
        resp = client.post(
            "/api/v1/config/processo-tipos",
            json={"slug": "teste", "label": "Teste", "ativo": True, "ordem": 0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["slug"] == "teste"
        assert data["label"] == "Teste"

    def test_requires_auth(self, anon_client):
        resp = anon_client.get("/api/v1/config/processo-tipos")
        assert resp.status_code == 401
