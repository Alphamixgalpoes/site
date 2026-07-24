"""Smoke test — validates the entire test infrastructure works."""


def test_health_returns_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"


def test_health_unauthenticated(anon_client):
    """Health endpoint should be accessible without auth."""
    resp = anon_client.get("/health")
    assert resp.status_code == 200
