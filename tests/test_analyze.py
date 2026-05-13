import io


def test_analyze_requires_auth(client):
    r = client.post("/api/analyze")
    assert r.status_code == 401


def test_analyze_rejects_missing_file(client, auth_headers):
    r = client.post("/api/analyze", headers=auth_headers)
    assert r.status_code == 400


def test_analyze_rejects_bad_extension(client, auth_headers):
    data = {"file": (io.BytesIO(b"hello"), "evil.exe")}
    r = client.post(
        "/api/analyze", headers=auth_headers, data=data, content_type="multipart/form-data"
    )
    assert r.status_code == 415


def test_analyze_csv_with_description(client, auth_headers, csv_upload):
    data = {"file": csv_upload}
    r = client.post(
        "/api/analyze", headers=auth_headers, data=data, content_type="multipart/form-data"
    )
    assert r.status_code == 200
    body = r.get_json()
    assert "token" in body and len(body["token"]) == 32
    summary = body["summary"]
    assert summary.get("Income") == 5000.0
    assert summary.get("Transport") == -12.5
    assert summary.get("Groceries") == -80.0
    assert summary.get("Food") == -40.0
    assert summary.get("Other") == -10.0


def test_download_requires_valid_token_shape(client, auth_headers):
    r = client.get("/api/download/not-a-valid-token", headers=auth_headers)
    assert r.status_code == 400


def test_download_unknown_token(client, auth_headers):
    r = client.get("/api/download/" + "a" * 32, headers=auth_headers)
    assert r.status_code == 404


def test_analyze_and_download_roundtrip(client, auth_headers, csv_upload):
    data = {"file": csv_upload}
    r = client.post(
        "/api/analyze", headers=auth_headers, data=data, content_type="multipart/form-data"
    )
    assert r.status_code == 200
    token = r.get_json()["token"]

    r = client.get(f"/api/download/{token}", headers=auth_headers)
    assert r.status_code == 200
    assert r.headers["Content-Disposition"].startswith("attachment")
