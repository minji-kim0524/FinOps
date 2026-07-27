def test_calculate_endpoint(client):
    response = client.post("/calculate", json={"gross_pay": 3_000_000, "num_dependents": 1})

    assert response.status_code == 200
    body = response.json()
    assert body["gross_pay"] == 3_000_000
    assert body["income_tax"] == 95_000
    assert body["local_income_tax"] == 9_500
    assert body["net_pay"] == 2_613_378
    assert "id" in body


def test_calculate_endpoint_defaults_to_one_dependent(client):
    response = client.post("/calculate", json={"gross_pay": 3_000_000})

    assert response.status_code == 200
    assert response.json()["num_dependents"] == 1


def test_records_endpoint_returns_saved_calculations(client):
    client.post("/calculate", json={"gross_pay": 3_000_000})
    client.post("/calculate", json={"gross_pay": 5_000_000})

    response = client.get("/records")

    assert response.status_code == 200
    records = response.json()
    assert len(records) == 2
    assert records[0]["gross_pay"] == 3_000_000
    assert records[1]["gross_pay"] == 5_000_000
