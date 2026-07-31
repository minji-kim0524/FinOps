from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import TEST_PASSWORD, TEST_USERNAME


def test_register_new_user(client):
    response = client.post("/auth/register", json={"username": "newuser", "password": "secret123"})

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_register_duplicate_username(client):
    response = client.post("/auth/register", json={"username": TEST_USERNAME, "password": "whatever"})

    assert response.status_code == 400


def test_login_success(client):
    response = client.post("/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client):
    response = client.post("/auth/login", json={"username": TEST_USERNAME, "password": "wrongpass"})

    assert response.status_code == 401


def test_protected_endpoint_requires_auth(client):
    unauthenticated_client = TestClient(app)

    response = unauthenticated_client.get("/records")

    assert response.status_code == 401


def test_protected_endpoint_rejects_invalid_token(client):
    unauthenticated_client = TestClient(app)

    response = unauthenticated_client.get(
        "/records", headers={"Authorization": "Bearer invalid-token"}
    )

    assert response.status_code == 401
