import io
import zipfile
from datetime import datetime

import pytest

from app import payslip
from app.models import SalaryRecord, User
from app.routers.records import MAX_PAYSLIP_ZIP_RECORDS
from tests.conftest import TEST_USERNAME, TestingSessionLocal


def _bulk_insert_bare_records(owner_id: int, count: int) -> None:
    # 매 건을 /calculate로 계산해 저장하면 수천 건에서 테스트가 느려지므로, 한도 검사(개수만
    # 세면 되고 실제 계산값은 중요하지 않음)를 위해 DB에 바로 대량 삽입한다.
    db = TestingSessionLocal()
    db.bulk_insert_mappings(
        SalaryRecord,
        [
            dict(
                owner_id=owner_id,
                created_at=datetime.utcnow(),
                employee_name=f"직원{i}",
                gross_pay=3_000_000,
                bonus_pay=0,
                num_dependents=1,
                num_children_8_to_20=0,
                national_pension=0,
                health_insurance=0,
                long_term_care=0,
                employment_insurance=0,
                income_tax=0,
                local_income_tax=0,
                total_deduction=0,
                net_pay=3_000_000,
            )
            for i in range(count)
        ],
    )
    db.commit()
    db.close()


def test_register_font_raises_when_no_candidate_font_exists(monkeypatch):
    # 서버에 나눔고딕/AppleGothic 둘 다 없는 배포 환경(예: 커스텀 베이스 이미지)을 재현한다.
    monkeypatch.setattr(payslip.pdfmetrics, "getRegisteredFontNames", lambda: [])
    monkeypatch.setattr(payslip.Path, "exists", lambda self: False)

    with pytest.raises(RuntimeError, match="한글 폰트를 찾을 수 없습니다"):
        payslip._register_font()


def test_download_payslip_returns_pdf(client):
    created = client.post(
        "/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000, "num_dependents": 1}
    ).json()

    response = client.get(f"/records/{created['id']}/payslip")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert f"payslip_{created['id']}.pdf" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")


def test_download_payslip_not_found(client):
    response = client.get("/records/999/payslip")

    assert response.status_code == 404


def test_download_payslip_requires_ownership(client):
    created = client.post("/calculate", json={"gross_pay": 3_000_000}).json()

    client.post(
        "/auth/register",
        json={
            "username": "payslip_other",
            "password": "otherpass123",
            "security_question": "질문",
            "security_answer": "답변",
        },
    )
    other_token = client.post(
        "/auth/login", json={"username": "payslip_other", "password": "otherpass123"}
    ).json()["access_token"]

    response = client.get(
        f"/records/{created['id']}/payslip",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    assert response.status_code == 404


def test_download_payslips_zip_contains_one_pdf_per_record(client):
    first = client.post(
        "/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000, "num_dependents": 1}
    ).json()
    second = client.post(
        "/calculate", json={"employee_name": "김철수", "gross_pay": 5_000_000, "num_dependents": 1}
    ).json()

    response = client.get("/records/payslips")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "salary_payslips.zip" in response.headers["content-disposition"]

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        names = zf.namelist()
        assert sorted(names) == [f"payslip_{first['id']}.pdf", f"payslip_{second['id']}.pdf"]
        for name in names:
            assert zf.read(name).startswith(b"%PDF")


def test_download_payslips_zip_applies_filters(client):
    client.post("/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000, "num_dependents": 1})
    client.post("/calculate", json={"employee_name": "김철수", "gross_pay": 5_000_000, "num_dependents": 1})

    response = client.get("/records/payslips", params={"employee_name": "홍길동"})

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        assert len(zf.namelist()) == 1


def test_download_payslips_zip_empty_when_no_records(client):
    response = client.get("/records/payslips")

    assert response.status_code == 200
    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        assert zf.namelist() == []


def test_download_payslips_zip_allows_exactly_the_limit(client):
    owner = TestingSessionLocal().query(User).filter(User.username == TEST_USERNAME).first()
    _bulk_insert_bare_records(owner.id, MAX_PAYSLIP_ZIP_RECORDS)

    response = client.get("/records/payslips")

    assert response.status_code == 200
    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        assert len(zf.namelist()) == MAX_PAYSLIP_ZIP_RECORDS


def test_download_payslips_zip_rejects_when_over_the_limit(client):
    owner = TestingSessionLocal().query(User).filter(User.username == TEST_USERNAME).first()
    _bulk_insert_bare_records(owner.id, MAX_PAYSLIP_ZIP_RECORDS + 1)

    response = client.get("/records/payslips")

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert str(MAX_PAYSLIP_ZIP_RECORDS) in detail
    assert str(MAX_PAYSLIP_ZIP_RECORDS + 1) in detail


def test_download_payslips_zip_only_includes_own_records(client):
    client.post("/calculate", json={"employee_name": "홍길동", "gross_pay": 3_000_000})

    client.post(
        "/auth/register",
        json={
            "username": "payslips_zip_other",
            "password": "otherpass123",
            "security_question": "질문",
            "security_answer": "답변",
        },
    )
    other_token = client.post(
        "/auth/login", json={"username": "payslips_zip_other", "password": "otherpass123"}
    ).json()["access_token"]

    response = client.get("/records/payslips", headers={"Authorization": f"Bearer {other_token}"})

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        assert zf.namelist() == []
