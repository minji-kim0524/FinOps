from datetime import datetime

from app.models import SalaryRecord
from tests.conftest import TestingSessionLocal


def test_monthly_summary_empty(client):
    response = client.get("/records/summary")

    assert response.status_code == 200
    assert response.json() == []


def test_monthly_summary_groups_by_month(client):
    client.post("/calculate", json={"gross_pay": 3_000_000, "num_dependents": 1})
    client.post("/calculate", json={"gross_pay": 5_000_000, "num_dependents": 1})

    db = TestingSessionLocal()
    last_record = db.query(SalaryRecord).order_by(SalaryRecord.id.desc()).first()
    last_record.created_at = datetime(2020, 1, 15)
    db.commit()
    db.close()

    response = client.get("/records/summary")

    assert response.status_code == 200
    data = {row["month"]: row for row in response.json()}

    assert "2020-01" in data
    assert data["2020-01"]["count"] == 1
    assert data["2020-01"]["total_gross_pay"] == 5_000_000
    assert data["2020-01"]["total_deduction"] == 839_221
    assert data["2020-01"]["total_net_pay"] == 4_160_779
    assert data["2020-01"]["avg_net_pay"] == 4_160_779

    current_month = datetime.utcnow().strftime("%Y-%m")
    assert current_month in data
    assert data[current_month]["count"] == 1
    assert data[current_month]["total_net_pay"] == 2_636_093


def test_monthly_summary_total_gross_pay_includes_bonus_pay(client):
    client.post("/calculate", json={"gross_pay": 3_000_000, "bonus_pay": 1_000_000, "num_dependents": 1})

    response = client.get("/records/summary")

    current_month = datetime.utcnow().strftime("%Y-%m")
    data = {row["month"]: row for row in response.json()}
    assert data[current_month]["total_gross_pay"] == 4_000_000


def test_yearly_summary_empty(client):
    response = client.get("/records/summary/yearly")

    assert response.status_code == 200
    assert response.json() == []


def test_yearly_summary_groups_by_year(client):
    client.post("/calculate", json={"gross_pay": 3_000_000, "num_dependents": 1})
    client.post("/calculate", json={"gross_pay": 5_000_000, "num_dependents": 1})

    db = TestingSessionLocal()
    last_record = db.query(SalaryRecord).order_by(SalaryRecord.id.desc()).first()
    last_record.created_at = datetime(2020, 1, 15)
    db.commit()
    db.close()

    response = client.get("/records/summary/yearly")

    assert response.status_code == 200
    data = {row["year"]: row for row in response.json()}

    assert "2020" in data
    assert data["2020"]["count"] == 1
    assert data["2020"]["total_gross_pay"] == 5_000_000
    assert data["2020"]["total_deduction"] == 839_221
    assert data["2020"]["total_net_pay"] == 4_160_779
    assert data["2020"]["avg_net_pay"] == 4_160_779

    current_year = datetime.utcnow().strftime("%Y")
    assert current_year in data
    assert data[current_year]["count"] == 1
    assert data[current_year]["total_net_pay"] == 2_636_093


def test_employee_summary_empty(client):
    response = client.get("/records/summary/by-employee")

    assert response.status_code == 200
    assert response.json() == []


def test_employee_summary_groups_by_employee_name(client):
    client.post(
        "/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000, "num_dependents": 1}
    )
    client.post(
        "/calculate", json={"employee_name": "홍길동", "gross_pay": 5_000_000, "num_dependents": 1}
    )
    client.post("/calculate", json={"gross_pay": 3_000_000, "num_dependents": 1})

    response = client.get("/records/summary/by-employee")

    assert response.status_code == 200
    data = {row["employee_name"]: row for row in response.json()}

    assert data["홍길동"]["count"] == 2
    assert data["홍길동"]["total_gross_pay"] == 8_000_000
    assert data["홍길동"]["total_net_pay"] == 2_636_093 + 4_160_779

    assert data["(미지정)"]["count"] == 1
    assert data["(미지정)"]["total_net_pay"] == 2_636_093
