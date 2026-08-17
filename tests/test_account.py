import io

CREDS = {"username": "accountowner", "password": "Strong123Passw"}
NEW_PASSWORD = "Fresh456Password!"

CSV = (
    b"Date,Description,Amount\n"
    b"2026-01-05,Salary,3000\n"
    b"2026-01-07,Uber ride,-20\n"
)


def _login(client, creds=CREDS):
    client.post("/api/auth/register", json=creds)
    return client.post("/api/auth/login", json=creds).get_json()


def _headers(session):
    return {"Authorization": f"Bearer {session['access_token']}"}


def _upload(client, session):
    return client.post(
        "/api/analyze",
        headers=_headers(session),
        data={"file": (io.BytesIO(CSV), "statement.csv")},
        content_type="multipart/form-data",
    )


# --------------------------------------------------------------- password


def test_password_change_requires_auth(client):
    r = client.post(
        "/api/auth/password",
        json={"current_password": "x", "new_password": NEW_PASSWORD},
    )
    assert r.status_code == 401


def test_password_change_requires_current_password(client):
    session = _login(client)
    r = client.post(
        "/api/auth/password", headers=_headers(session), json={"new_password": NEW_PASSWORD}
    )
    assert r.status_code == 400
    assert "Current password" in r.get_json()["error"]


def test_password_change_rejects_wrong_current_password(client):
    session = _login(client)
    r = client.post(
        "/api/auth/password",
        headers=_headers(session),
        json={"current_password": "NotMyPassword1!", "new_password": NEW_PASSWORD},
    )
    assert r.status_code == 401
    # The old password must still work.
    assert client.post("/api/auth/login", json=CREDS).status_code == 200


def test_password_change_enforces_strength_rules(client):
    session = _login(client)
    for weak in ["short", "alllowercaseletters", "x" * 200]:
        r = client.post(
            "/api/auth/password",
            headers=_headers(session),
            json={"current_password": CREDS["password"], "new_password": weak},
        )
        assert r.status_code == 400, weak


def test_password_change_rejects_reusing_the_same_password(client):
    session = _login(client)
    r = client.post(
        "/api/auth/password",
        headers=_headers(session),
        json={"current_password": CREDS["password"], "new_password": CREDS["password"]},
    )
    assert r.status_code == 400
    assert "different" in r.get_json()["error"]


def test_password_change_succeeds_and_swaps_credentials(client):
    session = _login(client)
    r = client.post(
        "/api/auth/password",
        headers=_headers(session),
        json={"current_password": CREDS["password"], "new_password": NEW_PASSWORD},
    )
    assert r.status_code == 200
    body = r.get_json()
    assert "password" not in str(body).lower() or "Password changed" in body["message"]

    assert client.post("/api/auth/login", json=CREDS).status_code == 401
    assert client.post(
        "/api/auth/login",
        json={"username": CREDS["username"], "password": NEW_PASSWORD},
    ).status_code == 200


def test_password_change_invalidates_every_existing_session(client):
    first = _login(client)
    second = client.post("/api/auth/login", json=CREDS).get_json()

    r = client.post(
        "/api/auth/password",
        headers=_headers(first),
        json={"current_password": CREDS["password"], "new_password": NEW_PASSWORD},
    )
    assert r.status_code == 200

    # Both access tokens are dead, including the one that made the change.
    assert client.get("/api/auth/me", headers=_headers(first)).status_code == 401
    assert client.get("/api/auth/me", headers=_headers(second)).status_code == 401
    # ...and neither refresh token can mint a new one.
    for session in (first, second):
        assert client.post(
            "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
        ).status_code == 401


def test_password_hash_is_never_returned(client):
    session = _login(client)
    for path in ["/api/auth/me"]:
        body = client.get(path, headers=_headers(session)).get_json()
        assert "password" not in str(body).lower()
        assert "hash" not in str(body).lower()


# --------------------------------------------------------------- deletion


def test_delete_requires_auth(client):
    assert client.delete("/api/auth/account", json={"password": "x"}).status_code == 401


def test_delete_requires_password_confirmation(client):
    session = _login(client)
    r = client.delete("/api/auth/account", headers=_headers(session), json={})
    assert r.status_code == 400
    assert client.get("/api/auth/me", headers=_headers(session)).status_code == 200


def test_delete_rejects_wrong_password(client):
    session = _login(client)
    r = client.delete(
        "/api/auth/account", headers=_headers(session), json={"password": "WrongPass123!"}
    )
    assert r.status_code == 401
    # Account survives.
    assert client.get("/api/auth/me", headers=_headers(session)).status_code == 200


def test_delete_removes_the_user_and_all_owned_data(client, app):
    from models import RefreshToken, Statement, Transaction, User

    session = _login(client)
    assert _upload(client, session).status_code == 200

    with app.app_context():
        user = User.query.filter_by(username=CREDS["username"]).one()
        user_id = user.id
        assert Statement.query.filter_by(user_id=user_id).count() == 1
        assert Transaction.query.filter_by(user_id=user_id).count() == 2

    r = client.delete(
        "/api/auth/account",
        headers=_headers(session),
        json={"password": CREDS["password"]},
    )
    assert r.status_code == 200

    with app.app_context():
        assert User.query.filter_by(id=user_id).count() == 0
        assert Statement.query.filter_by(user_id=user_id).count() == 0
        assert Transaction.query.filter_by(user_id=user_id).count() == 0
        assert RefreshToken.query.filter_by(user_id=user_id).count() == 0


def test_delete_invalidates_authentication(client):
    session = _login(client)
    client.delete(
        "/api/auth/account", headers=_headers(session), json={"password": CREDS["password"]}
    )

    assert client.get("/api/auth/me", headers=_headers(session)).status_code == 401
    assert client.post(
        "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
    ).status_code == 401
    assert client.post("/api/auth/login", json=CREDS).status_code == 401


def test_delete_leaves_other_users_data_untouched(client, app):
    from models import Statement, Transaction, User

    victim = {"username": "bystander2", "password": "Strong123Passw"}
    victim_session = _login(client, victim)
    assert _upload(client, victim_session).status_code == 200

    doomed_session = _login(client)
    assert _upload(client, doomed_session).status_code == 200

    client.delete(
        "/api/auth/account",
        headers=_headers(doomed_session),
        json={"password": CREDS["password"]},
    )

    with app.app_context():
        other = User.query.filter_by(username=victim["username"]).one()
        assert Statement.query.filter_by(user_id=other.id).count() == 1
        assert Transaction.query.filter_by(user_id=other.id).count() == 2

    # And they can still use the API.
    assert client.get("/api/auth/me", headers=_headers(victim_session)).status_code == 200
    assert client.get("/api/transactions", headers=_headers(victim_session)).get_json()["total"] == 2


def test_delete_removes_uploaded_files(client, app, tmp_path):
    from pathlib import Path

    session = _login(client)
    _upload(client, session)

    upload_root = Path(app.config["UPLOAD_FOLDER"])
    dirs_before = list(upload_root.glob("user_*"))
    assert dirs_before, "expected an upload directory to exist"

    client.delete(
        "/api/auth/account", headers=_headers(session), json={"password": CREDS["password"]}
    )

    for d in dirs_before:
        assert not d.exists(), f"{d} should have been removed"
