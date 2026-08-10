import datetime

import jwt
import pytest

CREDS = {"username": "refresher", "password": "Strong123Passw"}


@pytest.fixture
def session(client):
    client.post("/api/auth/register", json=CREDS)
    return client.post("/api/auth/login", json=CREDS).get_json()


def _headers(access):
    return {"Authorization": f"Bearer {access}"}


def test_login_issues_both_tokens(session):
    assert session["access_token"] and session["refresh_token"]
    assert session["token_type"] == "Bearer"
    assert session["expires_at"] and session["refresh_expires_at"]
    assert session["access_token"] != session["refresh_token"]


def test_tokens_carry_distinct_types(session, app):
    def claims(token):
        return jwt.decode(
            token,
            app.config["SECRET_KEY"],
            algorithms=[app.config["JWT_ALGORITHM"]],
            audience=app.config["JWT_AUDIENCE"],
            issuer=app.config["JWT_ISSUER"],
        )

    assert claims(session["access_token"])["typ"] == "access"
    assert claims(session["refresh_token"])["typ"] == "refresh"


def test_normal_authenticated_request(client, session):
    r = client.get("/api/auth/me", headers=_headers(session["access_token"]))
    assert r.status_code == 200
    assert r.get_json()["username"] == CREDS["username"]


def test_refresh_token_is_rejected_as_an_access_token(client, session):
    r = client.get("/api/auth/me", headers=_headers(session["refresh_token"]))
    assert r.status_code == 401


def test_access_token_is_rejected_as_a_refresh_token(client, session):
    r = client.post("/api/auth/refresh", json={"refresh_token": session["access_token"]})
    assert r.status_code == 401


def test_successful_refresh_rotates_both_tokens(client, session):
    r = client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert r.status_code == 200
    body = r.get_json()

    assert body["refresh_token"] != session["refresh_token"]
    # The new access token works...
    assert client.get("/api/auth/me", headers=_headers(body["access_token"])).status_code == 200
    # ...and so does the successor refresh token.
    assert client.post(
        "/api/auth/refresh", json={"refresh_token": body["refresh_token"]}
    ).status_code == 200


def test_expired_access_token_is_rejected_but_refresh_still_works(client, session, app):
    from models import User
    from security import _encode

    with app.app_context():
        user = User.query.filter_by(username=CREDS["username"]).one()
        expired, _, _ = _encode(user, datetime.timedelta(seconds=-10), "access")

    r = client.get("/api/auth/me", headers=_headers(expired))
    assert r.status_code == 401
    assert r.get_json()["error"] == "Token expired"

    assert client.post(
        "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
    ).status_code == 200


def test_expired_refresh_token_is_rejected(client, session, app):
    from models import User
    from security import _encode

    with app.app_context():
        user = User.query.filter_by(username=CREDS["username"]).one()
        expired, _, _ = _encode(user, datetime.timedelta(seconds=-10), "refresh")

    r = client.post("/api/auth/refresh", json={"refresh_token": expired})
    assert r.status_code == 401


def test_reuse_of_a_burned_token_revokes_the_whole_family(client, session):
    first = session["refresh_token"]
    second = client.post("/api/auth/refresh", json={"refresh_token": first}).get_json()[
        "refresh_token"
    ]

    # Replaying the burned token is treated as theft.
    assert client.post("/api/auth/refresh", json={"refresh_token": first}).status_code == 401

    # ...and takes the legitimate successor down with it.
    assert client.post("/api/auth/refresh", json={"refresh_token": second}).status_code == 401


def test_refresh_rejects_forged_and_malformed_tokens(client, session, app):
    from models import User
    from security import _encode

    assert client.post("/api/auth/refresh", json={}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": "nonsense"}).status_code == 401

    # Correctly signed by us, but never recorded in refresh_tokens.
    with app.app_context():
        user = User.query.filter_by(username=CREDS["username"]).one()
        unknown, _, _ = _encode(user, datetime.timedelta(days=1), "refresh")
    assert client.post("/api/auth/refresh", json={"refresh_token": unknown}).status_code == 401


def test_logout_revokes_the_refresh_token(client, session):
    r = client.post(
        "/api/auth/logout",
        headers=_headers(session["access_token"]),
        json={"refresh_token": session["refresh_token"]},
    )
    assert r.status_code == 200

    assert client.get("/api/auth/me", headers=_headers(session["access_token"])).status_code == 401
    assert client.post(
        "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
    ).status_code == 401


def test_logout_without_a_refresh_token_still_revokes_every_session(client, session):
    assert client.post(
        "/api/auth/logout", headers=_headers(session["access_token"])
    ).status_code == 200
    assert client.post(
        "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
    ).status_code == 401


def test_one_users_refresh_token_cannot_be_revoked_by_another(client, session):
    other = {"username": "bystander", "password": "Strong123Passw"}
    client.post("/api/auth/register", json=other)
    victim_refresh = session["refresh_token"]

    attacker = client.post("/api/auth/login", json=other).get_json()
    client.post(
        "/api/auth/logout",
        headers=_headers(attacker["access_token"]),
        json={"refresh_token": victim_refresh},
    )

    # The victim's session is untouched.
    assert client.post(
        "/api/auth/refresh", json={"refresh_token": victim_refresh}
    ).status_code == 200
