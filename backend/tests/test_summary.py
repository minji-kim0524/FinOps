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
    assert data["2020-01"]["total_deduction"] == 800_204
    assert data["2020-01"]["total_net_pay"] == 4_199_796
    assert data["2020-01"]["avg_net_pay"] == 4_199_796

    current_month = datetime.utcnow().strftime("%Y-%m")
    assert current_month in data
    assert data[current_month]["count"] == 1
    assert data[current_month]["total_net_pay"] == 2_613_378
