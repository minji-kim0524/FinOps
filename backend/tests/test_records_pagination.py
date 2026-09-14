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


def test_records_sort_by_gross_pay_ascending(client):
    _create(client, employee_name="중간", gross_pay=5_000_000)
    _create(client, employee_name="최저", gross_pay=2_000_000)
    _create(client, employee_name="최고", gross_pay=8_000_000)

    response = client.get("/records", params={"sort_by": "gross_pay", "sort_order": "asc"})

    names = [item["employee_name"] for item in response.json()["items"]]
    assert names == ["최저", "중간", "최고"]


def test_records_sort_by_gross_pay_descending(client):
    _create(client, employee_name="중간", gross_pay=5_000_000)
    _create(client, employee_name="최저", gross_pay=2_000_000)
    _create(client, employee_name="최고", gross_pay=8_000_000)

    response = client.get("/records", params={"sort_by": "gross_pay", "sort_order": "desc"})

    names = [item["employee_name"] for item in response.json()["items"]]
    assert names == ["최고", "중간", "최저"]


def test_records_sort_applies_across_pages_not_just_current_page(client):
    # 정렬이 서버에서 이뤄지므로, 페이지를 넘겨도 전체 이력 기준으로 정렬된 순서가 이어져야 한다.
    for gross_pay in [7_000_000, 1_000_000, 9_000_000, 3_000_000, 5_000_000]:
        _create(client, gross_pay=gross_pay)

    response = client.get(
        "/records", params={"sort_by": "gross_pay", "sort_order": "asc", "page_size": 2, "page": 2}
    )

    gross_pays = [item["gross_pay"] for item in response.json()["items"]]
    assert gross_pays == [5_000_000, 7_000_000]


def test_records_invalid_sort_by_falls_back_to_default_order(client):
    first = _create(client, employee_name="첫번째")
    second = _create(client, employee_name="두번째")

    response = client.get("/records", params={"sort_by": "not_a_real_column"})

    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [first["id"], second["id"]]
