from tests.conftest import TEST_PASSWORD, TEST_USERNAME


def test_change_password_success(client):
    response = client.put(
        "/auth/password",
        json={"current_password": TEST_PASSWORD, "new_password": "newpass456"},
    )

    assert response.status_code == 200

    old_login = client.post("/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/login", json={"username": TEST_USERNAME, "password": "newpass456"}
    )
    assert new_login.status_code == 200


def test_change_password_wrong_current_password(client):
    response = client.put(
        "/auth/password",
        json={"current_password": "wrongpassword", "new_password": "newpass456"},
    )

    assert response.status_code == 400

    still_works = client.post(
        "/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    assert still_works.status_code == 200


def test_change_password_rejects_weak_new_password(client):
    response = client.put(
        "/auth/password",
        json={"current_password": TEST_PASSWORD, "new_password": "weak"},
    )

    assert response.status_code == 422

    still_works = client.post(
        "/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    assert still_works.status_code == 200


def test_change_password_requires_auth(client):
    from fastapi.testclient import TestClient

    from app.main import app

    unauthenticated_client = TestClient(app)
    response = unauthenticated_client.put(
        "/auth/password",
        json={"current_password": "whatever", "new_password": "newpass456"},
    )

    assert response.status_code == 401
