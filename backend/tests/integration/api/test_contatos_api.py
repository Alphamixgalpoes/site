"""API tests for contatos endpoints."""

from __future__ import annotations


class TestListContatos:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/contatos")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_requires_auth(self, anon_client):
        resp = anon_client.get("/api/v1/contatos")
        assert resp.status_code == 401


class TestCreateContato:
    def test_create(self, client):
        resp = client.post(
            "/api/v1/contatos",
            json={
                "nome": "João Silva",
                "tipo_principal": "proprietario",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["nome"] == "João Silva"

    def test_create_requires_auth(self, anon_client):
        resp = anon_client.post("/api/v1/contatos", json={"nome": "Test"})
        assert resp.status_code == 401


class TestGetContato:
    def test_not_found(self, client):
        resp = client.get("/api/v1/contatos/00000000-0000-0000-0000-000000000099")
        assert resp.status_code == 404

    def test_get_after_create(self, client):
        create = client.post(
            "/api/v1/contatos",
            json={
                "nome": "Maria",
                "tipo_principal": "proprietario",
            },
        )
        contato_id = create.json()["id"]
        resp = client.get(f"/api/v1/contatos/{contato_id}")
        assert resp.status_code == 200
        assert resp.json()["nome"] == "Maria"


class TestDeleteContato:
    def test_delete_requires_auth(self, anon_client):
        resp = anon_client.delete("/api/v1/contatos/00000000-0000-0000-0000-000000000001")
        assert resp.status_code == 401
