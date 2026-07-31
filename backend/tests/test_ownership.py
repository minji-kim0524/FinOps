def _login_as_new_user(client, username, password="otherpass123"):
    client.post("/auth/register", json={"username": username, "password": password})
    token = client.post("/auth/login", json={"username": username, "password": password}).json()[
        "access_token"
    ]
    return {"Authorization": f"Bearer {token}"}


def test_records_are_scoped_to_owner(client):
    client.post("/calculate", json={"gross_pay": 3_000_000})

    other_headers = _login_as_new_user(client, "other_viewer")
    response = client.get("/records", headers=other_headers)

    assert response.status_code == 200
    assert response.json() == []

    own_records = client.get("/records").json()
    assert len(own_records) == 1


def test_cannot_update_other_users_record(client):
    created = client.post("/calculate", json={"gross_pay": 3_000_000}).json()

    other_headers = _login_as_new_user(client, "other_editor")
    response = client.put(
        f"/records/{created['id']}", json={"gross_pay": 5_000_000}, headers=other_headers
    )

    assert response.status_code == 404

    unchanged = client.get("/records").json()
    assert unchanged[0]["gross_pay"] == 3_000_000


def test_cannot_delete_other_users_record(client):
    created = client.post("/calculate", json={"gross_pay": 3_000_000}).json()

    other_headers = _login_as_new_user(client, "other_deleter")
    response = client.delete(f"/records/{created['id']}", headers=other_headers)

    assert response.status_code == 404

    still_there = client.get("/records").json()
    assert len(still_there) == 1
