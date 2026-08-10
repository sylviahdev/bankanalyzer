import io

DATED_CSV = (
    b"Date,Description,Amount\n"
    b"2026-01-05,Salary January,5000\n"
    b"2026-01-07,Uber ride,-12.5\n"
    b"2026-01-20,Supermarket,-80\n"
    b"2026-02-03,Salary February,5200\n"
    b"2026-02-11,Restaurant,-40\n"
    b"2026-02-18,Netflix subscription,-15\n"
)


def _upload(client, headers, payload=DATED_CSV, name="statement.csv"):
    return client.post(
        "/api/analyze",
        headers=headers,
        data={"file": (io.BytesIO(payload), name)},
        content_type="multipart/form-data",
    )


def _second_user(client):
    creds = {"username": "intruder", "password": "Strong123Passw"}
    client.post("/api/auth/register", json=creds)
    token = client.post("/api/auth/login", json=creds).get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_analyze_persists_statement(client, auth_headers):
    body = _upload(client, auth_headers).get_json()
    statement = body["statement"]
    assert statement["row_count"] == 6
    assert statement["total_income"] == 10200.0
    assert statement["total_expenses"] == -147.5
    assert statement["net_balance"] == 10052.5
    assert statement["period_start"] == "2026-01-05"
    assert statement["period_end"] == "2026-02-18"
    # The original response contract is unchanged.
    assert body["total_transactions"] == 6
    assert "summary" in body and "token" in body


def test_analyze_response_shape_without_dates(client, auth_headers, csv_upload):
    body = client.post(
        "/api/analyze",
        headers=auth_headers,
        data={"file": csv_upload},
        content_type="multipart/form-data",
    ).get_json()
    assert body["statement"]["period_start"] is None
    assert body["statement"]["row_count"] == 5


def test_data_endpoints_require_auth(client):
    for path in ("/api/statements", "/api/transactions", "/api/analytics/summary"):
        assert client.get(path).status_code == 401


def test_list_statements(client, auth_headers):
    _upload(client, auth_headers)
    rows = client.get("/api/statements", headers=auth_headers).get_json()["statements"]
    assert len(rows) == 1
    assert rows[0]["filename"] == "statement.csv"


def test_transactions_pagination(client, auth_headers):
    _upload(client, auth_headers)
    body = client.get(
        "/api/transactions?page=1&per_page=4", headers=auth_headers
    ).get_json()
    assert body["total"] == 6
    assert body["total_pages"] == 2
    assert body["has_next"] is True
    assert body["has_prev"] is False
    assert len(body["transactions"]) == 4

    page2 = client.get(
        "/api/transactions?page=2&per_page=4", headers=auth_headers
    ).get_json()
    assert len(page2["transactions"]) == 2
    assert page2["has_next"] is False


def test_transactions_filters(client, auth_headers):
    _upload(client, auth_headers)

    income = client.get("/api/transactions?type=income", headers=auth_headers).get_json()
    assert income["total"] == 2
    assert all(t["type"] == "income" for t in income["transactions"])

    search = client.get("/api/transactions?q=uber", headers=auth_headers).get_json()
    assert search["total"] == 1
    assert "Uber" in search["transactions"][0]["description"]

    category = client.get(
        "/api/transactions?category=Groceries", headers=auth_headers
    ).get_json()
    assert category["total"] == 1

    ranged = client.get(
        "/api/transactions?date_from=2026-02-01&date_to=2026-02-28", headers=auth_headers
    ).get_json()
    assert ranged["total"] == 3


def test_transactions_sorting(client, auth_headers):
    _upload(client, auth_headers)
    body = client.get(
        "/api/transactions?sort=amount&order=asc", headers=auth_headers
    ).get_json()
    amounts = [t["amount"] for t in body["transactions"]]
    assert amounts == sorted(amounts)


def test_transactions_reject_bad_params(client, auth_headers):
    _upload(client, auth_headers)
    body = client.get(
        "/api/transactions?per_page=99999&page=abc&sort=drop%20table",
        headers=auth_headers,
    ).get_json()
    assert body["per_page"] == 200
    assert body["page"] == 1


def test_categories(client, auth_headers):
    _upload(client, auth_headers)
    cats = client.get("/api/categories", headers=auth_headers).get_json()["categories"]
    assert "Income" in cats and "Groceries" in cats


def test_analytics_summary(client, auth_headers):
    _upload(client, auth_headers)
    body = client.get("/api/analytics/summary", headers=auth_headers).get_json()

    assert body["totals"]["income"] == 10200.0
    assert body["totals"]["expenses"] == 147.5
    assert body["totals"]["net"] == 10052.5
    assert body["totals"]["transaction_count"] == 6
    assert body["totals"]["statement_count"] == 1

    months = {m["month"]: m for m in body["monthly"]}
    assert months["2026-01"]["income"] == 5000.0
    assert months["2026-01"]["expenses"] == 92.5
    assert months["2026-02"]["income"] == 5200.0

    assert body["top_expenses"][0]["amount"] == -80.0
    assert len(body["recent_transactions"]) == 6
    assert any(c["category"] == "Income" for c in body["by_category"])


def test_delete_statement_cascades(client, auth_headers):
    statement_id = _upload(client, auth_headers).get_json()["statement"]["id"]

    r = client.delete(f"/api/statements/{statement_id}", headers=auth_headers)
    assert r.status_code == 200

    assert client.get("/api/statements", headers=auth_headers).get_json()["statements"] == []
    assert client.get("/api/transactions", headers=auth_headers).get_json()["total"] == 0


def test_user_cannot_read_another_users_data(client, auth_headers):
    statement_id = _upload(client, auth_headers).get_json()["statement"]["id"]
    other = _second_user(client)

    assert client.get("/api/statements", headers=other).get_json()["statements"] == []
    assert client.get("/api/transactions", headers=other).get_json()["total"] == 0
    assert (
        client.get(
            f"/api/transactions?statement_id={statement_id}", headers=other
        ).get_json()["total"]
        == 0
    )
    assert client.get("/api/analytics/summary", headers=other).get_json()[
        "totals"
    ]["transaction_count"] == 0
    assert client.delete(f"/api/statements/{statement_id}", headers=other).status_code == 404


def test_download_regenerates_missing_workbook(client, auth_headers, app):
    import pathlib

    token = _upload(client, auth_headers).get_json()["token"]
    for path in pathlib.Path(app.config["UPLOAD_FOLDER"]).rglob(f"summary_{token}.xlsx"):
        path.unlink()

    r = client.get(f"/api/download/{token}", headers=auth_headers)
    assert r.status_code == 200
    assert r.headers["Content-Disposition"].startswith("attachment")
