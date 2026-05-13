def test_health(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.get_json() == {"status": "ok"}


def test_register_validates_password(client):
    r = client.post("/api/auth/register", json={"username": "abc", "password": "short"})
    assert r.status_code == 400


def test_register_validates_username(client):
    r = client.post(
        "/api/auth/register", json={"username": "x", "password": "Valid12345!Pass"}
    )
    assert r.status_code == 400


def test_register_and_login_flow(client):
    r = client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "Strong123Passw"},
    )
    assert r.status_code == 202

    r = client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "Strong123Passw"},
    )
    assert r.status_code == 200
    body = r.get_json()
    assert "access_token" in body
    assert body["token_type"] == "Bearer"


def test_register_duplicate_does_not_leak(client):
    payload = {"username": "bob", "password": "Strong123Passw"}
    r1 = client.post("/api/auth/register", json=payload)
    r2 = client.post("/api/auth/register", json=payload)
    assert r1.status_code == r2.status_code == 202


def test_login_invalid_credentials(client):
    r = client.post(
        "/api/auth/login",
        json={"username": "ghost", "password": "WrongPass1234"},
    )
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_with_token(client, auth_headers):
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.get_json()["username"] == "tester01"


def test_logout_revokes_token(client, auth_headers):
    r = client.post("/api/auth/logout", headers=auth_headers)
    assert r.status_code == 200
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 401


def test_malformed_bearer(client):
    r = client.get("/api/auth/me", headers={"Authorization": "not-a-bearer-token"})
    assert r.status_code == 401
