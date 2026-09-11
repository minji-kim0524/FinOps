from fastapi.testclient import TestClient

from app.main import app
from app.models import User
from tests.conftest import (
    TEST_PASSWORD,
    TEST_SECURITY_ANSWER,
    TEST_SECURITY_QUESTION,
    TEST_USERNAME,
    TestingSessionLocal,
)

REGISTER_DEFAULTS = {
    "security_question": TEST_SECURITY_QUESTION,
    "security_answer": TEST_SECURITY_ANSWER,
}


def test_register_new_user(client):
    response = client.post(
        "/auth/register",
        json={"username": "newuser", "password": "secret123", **REGISTER_DEFAULTS},
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_register_duplicate_username(client):
    response = client.post(
        "/auth/register",
        json={"username": TEST_USERNAME, "password": "whatever123", **REGISTER_DEFAULTS},
    )

    assert response.status_code == 400


def test_register_password_too_short(client):
    response = client.post(
        "/auth/register", json={"username": "shortpw", "password": "ab1", **REGISTER_DEFAULTS}
    )

    assert response.status_code == 422


def test_register_password_without_digit(client):
    response = client.post(
        "/auth/register",
        json={"username": "nodigitpw", "password": "onlyletters", **REGISTER_DEFAULTS},
    )

    assert response.status_code == 422


def test_register_password_without_letter(client):
    response = client.post(
        "/auth/register",
        json={"username": "noletterpw", "password": "12345678", **REGISTER_DEFAULTS},
    )

    assert response.status_code == 422


def test_register_missing_security_question(client):
    response = client.post(
        "/auth/register",
        json={"username": "noquestion", "password": "secret123", "security_answer": "답변"},
    )

    assert response.status_code == 422


def test_register_blank_security_answer(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "blankanswer",
            "password": "secret123",
            "security_question": "질문",
            "security_answer": "   ",
        },
    )

    assert response.status_code == 422


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


def test_protected_endpoint_rejects_token_for_deleted_user(client):
    # 토큰 자체는 유효하지만, 발급 이후 계정이 삭제된 경우를 재현한다.
    db = TestingSessionLocal()
    db.query(User).filter(User.username == TEST_USERNAME).delete()
    db.commit()
    db.close()

    response = client.get("/records")

    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"


def test_get_security_question(client):
    response = client.post("/auth/security-question", json={"username": TEST_USERNAME})

    assert response.status_code == 200
    assert response.json()["security_question"] == TEST_SECURITY_QUESTION


def test_get_security_question_unknown_user(client):
    response = client.post("/auth/security-question", json={"username": "no-such-user"})

    assert response.status_code == 404


def test_password_reset_success(client):
    response = client.post(
        "/auth/password-reset",
        json={
            "username": TEST_USERNAME,
            "security_answer": TEST_SECURITY_ANSWER,
            "new_password": "brandnew123",
        },
    )

    assert response.status_code == 200

    login_response = client.post(
        "/auth/login", json={"username": TEST_USERNAME, "password": "brandnew123"}
    )
    assert login_response.status_code == 200


def test_password_reset_is_case_and_whitespace_insensitive(client):
    response = client.post(
        "/auth/password-reset",
        json={
            "username": TEST_USERNAME,
            "security_answer": f"  {TEST_SECURITY_ANSWER.upper()}  ",
            "new_password": "brandnew123",
        },
    )

    assert response.status_code == 200


def test_password_reset_wrong_answer(client):
    response = client.post(
        "/auth/password-reset",
        json={
            "username": TEST_USERNAME,
            "security_answer": "wrong answer",
            "new_password": "brandnew123",
        },
    )

    assert response.status_code == 400

    login_response = client.post(
        "/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    assert login_response.status_code == 200


def test_password_reset_unknown_user(client):
    response = client.post(
        "/auth/password-reset",
        json={
            "username": "no-such-user",
            "security_answer": "whatever",
            "new_password": "brandnew123",
        },
    )

    assert response.status_code == 400


def test_password_reset_weak_new_password(client):
    response = client.post(
        "/auth/password-reset",
        json={
            "username": TEST_USERNAME,
            "security_answer": TEST_SECURITY_ANSWER,
            "new_password": "short",
        },
    )

    assert response.status_code == 422
