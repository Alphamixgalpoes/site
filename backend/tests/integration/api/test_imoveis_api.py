"""API tests for imoveis endpoints."""

from __future__ import annotations


class TestListImoveis:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/imoveis")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_unauthenticated_ok(self, anon_client):
        """Public listing should work without auth."""
        resp = anon_client.get("/api/v1/imoveis")
        assert resp.status_code == 200


class TestCreateImovel:
    def test_create(self, client):
        resp = client.post(
            "/api/v1/imoveis",
            json={
                "titulo": "Galpão G1",
                "tipo": "galpao",
                "categoria": "logistico",
                "cidade": "Barueri",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["titulo"] == "Galpão G1"

    def test_create_requires_auth(self, anon_client):
        resp = anon_client.post(
            "/api/v1/imoveis",
            json={
                "titulo": "G1",
                "tipo": "galpao",
                "categoria": "log",
                "cidade": "SP",
            },
        )
        assert resp.status_code == 401


class TestGetImovel:
    def test_not_found(self, client):
        resp = client.get("/api/v1/imoveis/00000000-0000-0000-0000-000000000099")
        assert resp.status_code == 404

    def test_get_after_create(self, client):
        create = client.post(
            "/api/v1/imoveis",
            json={
                "titulo": "Galpão G1",
                "tipo": "galpao",
                "categoria": "logistico",
                "cidade": "Barueri",
            },
        )
        imovel_id = create.json()["id"]
        resp = client.get(f"/api/v1/imoveis/{imovel_id}")
        assert resp.status_code == 200
        assert resp.json()["titulo"] == "Galpão G1"


class TestDeleteImovel:
    def test_delete_requires_auth(self, anon_client):
        resp = anon_client.delete("/api/v1/imoveis/00000000-0000-0000-0000-000000000001")
        assert resp.status_code == 401
