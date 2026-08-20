from app.rate_limit import limiter
from tests.conftest import TEST_PASSWORD, TEST_USERNAME


def test_login_rate_limit_blocks_after_too_many_attempts(client):
    # client 픽스처가 셋업 중 이미 로그인을 1회 성공시켰으므로, 여기서 다시 리셋해서
    # "5/minute" 한도를 이 테스트 안에서 정확히 5번 소비하고 6번째에 막히는지 확인한다.
    limiter.reset()

    for _ in range(5):
        response = client.post(
            "/auth/login", json={"username": TEST_USERNAME, "password": "wrongpass"}
        )
        assert response.status_code == 401

    blocked = client.post(
        "/auth/login", json={"username": TEST_USERNAME, "password": "wrongpass"}
    )

    assert blocked.status_code == 429


def test_register_rate_limit_blocks_after_too_many_attempts(client):
    limiter.reset()

    for i in range(5):
        response = client.post(
            "/auth/register",
            json={"username": f"ratelimituser{i}", "password": TEST_PASSWORD},
        )
        assert response.status_code == 200

    blocked = client.post(
        "/auth/register", json={"username": "oneMoreUser", "password": TEST_PASSWORD}
    )

    assert blocked.status_code == 429
