import re

from flask import Blueprint, current_app, g, jsonify, request

from extensions import db, limiter
from models import RevokedToken, User
from security import (
    auth_required,
    create_access_token,
    hash_password,
    verify_password,
)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

USERNAME_RE = re.compile(r"^[a-z0-9_.-]{3,32}$")
MIN_PASSWORD_LEN = 12
MAX_PASSWORD_LEN = 128


def _validate_password(pw: str) -> str | None:
    if not isinstance(pw, str):
        return "Password is required"
    if len(pw) < MIN_PASSWORD_LEN:
        return f"Password must be at least {MIN_PASSWORD_LEN} characters"
    if len(pw) > MAX_PASSWORD_LEN:
        return f"Password must be at most {MAX_PASSWORD_LEN} characters"
    classes = sum(
        [
            any(c.isupper() for c in pw),
            any(c.islower() for c in pw),
            any(c.isdigit() for c in pw),
            any(not c.isalnum() for c in pw),
        ]
    )
    if classes < 3:
        return "Password must contain at least 3 of: upper, lower, digit, symbol"
    return None


@bp.post("/register")
@limiter.limit("5 per hour")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    if not USERNAME_RE.match(username):
        return jsonify({"error": "Username must be 3-32 chars; letters, digits, . _ -"}), 400

    err = _validate_password(password)
    if err:
        return jsonify({"error": err}), 400

    if User.query.filter_by(username=username).first() is not None:
        # Avoid leaking existence; respond identically to the success case.
        current_app.logger.info("register_conflict", extra={"username_hash": hash(username)})
        return jsonify({"message": "Account created if it did not already exist"}), 202

    user = User(username=username, password_hash=hash_password(password))
    db.session.add(user)
    db.session.commit()
    current_app.logger.info("user_registered", extra={"user_id": user.id})
    return jsonify({"message": "Account created if it did not already exist"}), 202


@bp.post("/login")
@limiter.limit("10 per minute;100 per hour")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(username=username).first()
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        current_app.logger.info(
            "login_failed", extra={"username_hash": hash(username), "ip": request.remote_addr}
        )
        return jsonify({"error": "Invalid credentials"}), 401

    token, exp, _ = create_access_token(user)
    current_app.logger.info("user_login", extra={"user_id": user.id})
    return jsonify(
        {
            "access_token": token,
            "token_type": "Bearer",
            "expires_at": exp.isoformat(),
        }
    )


@bp.post("/logout")
@auth_required
def logout():
    revoked = RevokedToken(jti=g.token_jti, user_id=g.user.id, expires_at=g.token_exp)
    db.session.merge(revoked)
    db.session.commit()
    current_app.logger.info("user_logout", extra={"user_id": g.user.id})
    return jsonify({"message": "Logged out"})


@bp.get("/me")
@auth_required
def me():
    u = g.user
    return jsonify(
        {
            "id": u.id,
            "username": u.username,
            "created_at": u.created_at.isoformat(),
        }
    )
