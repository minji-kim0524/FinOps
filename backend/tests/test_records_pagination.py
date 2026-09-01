def _create(client, employee_name="", gross_pay=3_000_000, num_dependents=1):
    return client.post(
        "/calculate",
        json={"employee_name": employee_name, "gross_pay": gross_pay, "num_dependents": num_dependents},
    ).json()


def test_records_default_page_size_is_ten(client):
    for i in range(15):
        _create(client, employee_name=f"직원{i}")

    response = client.get("/records")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 15
    assert body["page"] == 1
    assert body["page_size"] == 10
    assert len(body["items"]) == 10


def test_records_second_page_returns_remaining_items(client):
    for i in range(15):
        _create(client, employee_name=f"직원{i}")

    response = client.get("/records", params={"page": 2})

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 2
    assert len(body["items"]) == 5


def test_records_custom_page_size(client):
    for i in range(5):
        _create(client, employee_name=f"직원{i}")

    response = client.get("/records", params={"page_size": 2})

    body = response.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2


def test_records_search_filters_by_employee_name_substring(client):
    _create(client, employee_name="홍길동")
    _create(client, employee_name="김철수")

    response = client.get("/records", params={"search": "길동"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["employee_name"] == "홍길동"


def test_records_employee_name_filters_exact_match(client):
    _create(client, employee_name="홍길동")
    _create(client, employee_name="홍길동2")

    response = client.get("/records", params={"employee_name": "홍길동"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["employee_name"] == "홍길동"


def test_records_gross_pay_range_filter(client):
    _create(client, gross_pay=2_000_000)
    _create(client, gross_pay=5_000_000)
    _create(client, gross_pay=8_000_000)

    response = client.get("/records", params={"min_gross_pay": 3_000_000, "max_gross_pay": 6_000_000})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["gross_pay"] == 5_000_000


def test_records_date_range_filter_excludes_out_of_range(client):
    _create(client, employee_name="in-range")

    response = client.get(
        "/records", params={"start_date": "2099-01-01T00:00:00", "end_date": "2099-12-31T23:59:59"}
    )

    body = response.json()
    assert body["total"] == 0
