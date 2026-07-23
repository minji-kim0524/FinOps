from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_calculate_endpoint():
    response = client.post("/calculate", json={"gross_pay": 3_000_000})

    assert response.status_code == 200
    body = response.json()
    assert body["gross_pay"] == 3_000_000
    assert body["net_pay"] == 2_717_878
