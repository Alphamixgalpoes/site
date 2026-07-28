"""Integration tests for Processos (pipeline) endpoints."""

from __future__ import annotations


class TestListProcessos:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/processos")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_requires_auth(self, anon_client):
        resp = anon_client.get("/api/v1/processos")
        assert resp.status_code == 401


class TestCreateProcesso:
    def test_create(self, client):
        resp = client.post(
            "/api/v1/processos",
            json={"titulo": "Venda Galpão Alpha", "tipo": "venda"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["titulo"] == "Venda Galpão Alpha"
        assert data["tipo"] == "venda"
        assert "id" in data

    def test_create_requires_auth(self, anon_client):
        resp = anon_client.post(
            "/api/v1/processos",
            json={"titulo": "Test", "tipo": "venda"},
        )
        assert resp.status_code == 401


class TestGetProcesso:
    def test_get(self, client):
        created = client.post(
            "/api/v1/processos",
            json={"titulo": "Get Test", "tipo": "locacao"},
        ).json()
        resp = client.get(f"/api/v1/processos/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["titulo"] == "Get Test"

    def test_not_found(self, client):
        resp = client.get("/api/v1/processos/00000000-0000-0000-0000-000000000099")
        assert resp.status_code == 404


class TestUpdateProcesso:
    def test_update(self, client):
        created = client.post(
            "/api/v1/processos",
            json={"titulo": "Before", "tipo": "venda"},
        ).json()
        resp = client.put(
            f"/api/v1/processos/{created['id']}",
            json={"titulo": "After", "status": "concluido"},
        )
        assert resp.status_code == 200

    def test_requires_auth(self, anon_client):
        resp = anon_client.put(
            "/api/v1/processos/00000000-0000-0000-0000-000000000001",
            json={"titulo": "Nope"},
        )
        assert resp.status_code == 401


class TestDeleteProcesso:
    def test_delete(self, client):
        created = client.post(
            "/api/v1/processos",
            json={"titulo": "To Delete", "tipo": "venda"},
        ).json()
        resp = client.delete(f"/api/v1/processos/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True


class TestProcessoItems:
    def test_list_items_empty(self, client):
        created = client.post(
            "/api/v1/processos",
            json={"titulo": "Items Test", "tipo": "venda"},
        ).json()
        resp = client.get(f"/api/v1/processos/{created['id']}/itens")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_item(self, client):
        proc = client.post(
            "/api/v1/processos",
            json={"titulo": "Item Create", "tipo": "venda"},
        ).json()
        resp = client.post(
            f"/api/v1/processos/{proc['id']}/itens",
            json={"categoria": "docs", "titulo": "Certidão negativa", "ordem": 0},
        )
        assert resp.status_code == 200
        item = resp.json()
        assert item["titulo"] == "Certidão negativa"
        assert item["feito"] is False

    def test_update_item_toggle(self, client):
        proc = client.post(
            "/api/v1/processos",
            json={"titulo": "Toggle Test", "tipo": "venda"},
        ).json()
        item = client.post(
            f"/api/v1/processos/{proc['id']}/itens",
            json={"categoria": "docs", "titulo": "IPTU", "ordem": 0},
        ).json()
        resp = client.put(
            f"/api/v1/processos/{proc['id']}/itens/{item['id']}",
            json={"feito": True},
        )
        assert resp.status_code == 200

    def test_delete_item(self, client):
        proc = client.post(
            "/api/v1/processos",
            json={"titulo": "Del Item", "tipo": "venda"},
        ).json()
        item = client.post(
            f"/api/v1/processos/{proc['id']}/itens",
            json={"categoria": "docs", "titulo": "Temp", "ordem": 0},
        ).json()
        resp = client.delete(f"/api/v1/processos/{proc['id']}/itens/{item['id']}")
        assert resp.status_code == 200


class TestProcessoCategories:
    def test_list_categories_empty(self, client):
        proc = client.post(
            "/api/v1/processos",
            json={"titulo": "Cat Test", "tipo": "venda"},
        ).json()
        resp = client.get(f"/api/v1/processos/{proc['id']}/categorias")
        assert resp.status_code == 200
        assert resp.json() == []


class TestProcessoContacts:
    def test_list_contacts_empty(self, client):
        proc = client.post(
            "/api/v1/processos",
            json={"titulo": "Contact Test", "tipo": "venda"},
        ).json()
        resp = client.get(f"/api/v1/processos/{proc['id']}/contatos")
        assert resp.status_code == 200
        assert resp.json() == []


class TestProcessoSignedUrls:
    def test_signed_urls_empty(self, client):
        proc = client.post(
            "/api/v1/processos",
            json={"titulo": "URLs Test", "tipo": "venda"},
        ).json()
        resp = client.get(f"/api/v1/processos/{proc['id']}/signed-urls")
        assert resp.status_code == 200


class TestProcessoImovelLink:
    def test_link_and_unlink(self, client):
        proc = client.post(
            "/api/v1/processos",
            json={"titulo": "Imovel Link", "tipo": "venda"},
        ).json()
        # Create an imovel to link
        imovel = client.post(
            "/api/v1/imoveis",
            json={"titulo": "Galpão Test", "tipo": "venda", "categoria": "galpao", "cidade": "Barueri"},
        ).json()
        # Link
        resp = client.put(
            f"/api/v1/processos/{proc['id']}/imovel",
            json={"imovel_id": imovel["id"]},
        )
        assert resp.status_code == 200
        # Unlink
        resp = client.delete(f"/api/v1/processos/{proc['id']}/imovel")
        assert resp.status_code == 200
