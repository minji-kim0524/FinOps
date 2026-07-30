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


def test_calculate_bulk_endpoint(client):
    csv_content = (
        "employee_name,gross_pay,num_dependents\n"
        "홍길동,3000000,1\n"
        "김철수,5000000,2\n"
    ).encode("utf-8")

    response = client.post(
        "/calculate/bulk",
        files={"file": ("salaries.csv", csv_content, "text/csv")},
    )

    assert response.status_code == 200
    records = response.json()
    assert len(records) == 2
    assert records[0]["employee_name"] == "홍길동"
    assert records[0]["net_pay"] == 2_613_378
    assert records[1]["employee_name"] == "김철수"
    assert records[1]["net_pay"] == 4_256_996

    saved = client.get("/records").json()
    assert len(saved) == 2


def test_calculate_bulk_endpoint_defaults_missing_columns(client):
    csv_content = "gross_pay\n3000000\n".encode("utf-8")

    response = client.post(
        "/calculate/bulk",
        files={"file": ("salaries.csv", csv_content, "text/csv")},
    )

    assert response.status_code == 200
    record = response.json()[0]
    assert record["employee_name"] == ""
    assert record["num_dependents"] == 1


def test_update_record_recalculates_values(client):
    created = client.post(
        "/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000, "num_dependents": 1}
    ).json()

    response = client.put(
        f"/records/{created['id']}",
        json={"employee_name": "홍길동", "gross_pay": 5_000_000, "num_dependents": 2},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["gross_pay"] == 5_000_000
    assert body["net_pay"] == 4_256_996

    saved = client.get("/records").json()
    assert len(saved) == 1
    assert saved[0]["gross_pay"] == 5_000_000


def test_update_record_not_found(client):
    response = client.put("/records/999", json={"gross_pay": 3_000_000})

    assert response.status_code == 404


def test_delete_record(client):
    created = client.post("/calculate", json={"gross_pay": 3_000_000}).json()

    response = client.delete(f"/records/{created['id']}")

    assert response.status_code == 200
    assert client.get("/records").json() == []


def test_delete_record_not_found(client):
    response = client.delete("/records/999")

    assert response.status_code == 404
