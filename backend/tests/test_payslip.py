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
