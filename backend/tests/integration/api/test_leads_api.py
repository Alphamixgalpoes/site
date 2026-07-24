"""API tests for leads endpoints."""

from __future__ import annotations


class TestSubmitLead:
    def test_create_lead(self, client):
        resp = client.post(
            "/api/v1/leads",
            json={
                "nome": "João",
                "telefone": "11999998888",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["nome"] == "João"
        assert data["telefone"] == "11999998888"

    def test_create_lead_unauthenticated(self, anon_client):
        """Lead submission is public — should work without auth."""
        resp = anon_client.post(
            "/api/v1/leads",
            json={
                "nome": "Maria",
                "telefone": "11999997777",
            },
        )
        assert resp.status_code == 200

    def test_create_lead_missing_fields(self, client):
        resp = client.post("/api/v1/leads", json={"nome": "João"})
        assert resp.status_code == 422

    def test_create_lead_with_optional_fields(self, client):
        resp = client.post(
            "/api/v1/leads",
            json={
                "nome": "João",
                "telefone": "11999998888",
                "empresa": "Alpha Mix",
                "imovel_titulo": "Galpão G1",
            },
        )
        assert resp.status_code == 200


class TestListLeads:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/leads")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        client.post(
            "/api/v1/leads",
            json={
                "nome": "João",
                "telefone": "11999998888",
            },
        )
        resp = client.get("/api/v1/leads")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_list_requires_auth(self, anon_client):
        resp = anon_client.get("/api/v1/leads")
        assert resp.status_code == 401
