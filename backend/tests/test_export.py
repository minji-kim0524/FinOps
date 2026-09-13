import io

import pandas as pd


def test_export_records_returns_xlsx_with_data(client):
    client.post("/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000, "num_dependents": 1})

    response = client.get("/records/export")

    assert response.status_code == 200
    assert (
        response.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    df = pd.read_excel(io.BytesIO(response.content))
    assert list(df.columns) == [
        "직원명",
        "세전 급여",
        "상여금/성과급",
        "부양가족 수",
        "8~20세 자녀 수",
        "국민연금",
        "건강보험",
        "장기요양보험",
        "고용보험",
        "소득세",
        "지방소득세",
        "공제액 합계",
        "실수령액",
    ]
    assert len(df) == 1
    assert df.iloc[0]["직원명"] == "홍길동"
    assert int(df.iloc[0]["실수령액"]) == 2_636_093


def test_export_records_filters_by_employee_name(client):
    client.post("/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000, "num_dependents": 1})
    client.post("/calculate", json={"employee_name": "김철수", "gross_pay": 5_000_000, "num_dependents": 1})

    response = client.get("/records/export", params={"employee_name": "홍길동"})

    df = pd.read_excel(io.BytesIO(response.content))
    assert len(df) == 1
    assert df.iloc[0]["직원명"] == "홍길동"


def test_export_records_filters_by_gross_pay_range(client):
    client.post("/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000, "num_dependents": 1})
    client.post("/calculate", json={"employee_name": "김철수", "gross_pay": 5_000_000, "num_dependents": 1})

    response = client.get(
        "/records/export", params={"min_gross_pay": 4_000_000, "max_gross_pay": 6_000_000}
    )

    df = pd.read_excel(io.BytesIO(response.content))
    assert len(df) == 1
    assert df.iloc[0]["직원명"] == "김철수"


def test_export_records_empty(client):
    response = client.get("/records/export")

    assert response.status_code == 200
    df = pd.read_excel(io.BytesIO(response.content))
    assert len(df) == 0
    assert "직원명" in df.columns
