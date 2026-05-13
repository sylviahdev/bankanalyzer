import datetime
import uuid
from functools import wraps
from typing import Optional

import bcrypt
import jwt
from flask import current_app, g, jsonify, request

from extensions import db
from models import RevokedToken, User


def hash_password(password: str) -> bytes:
    rounds = current_app.config["BCRYPT_ROUNDS"]
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=rounds))


def verify_password(password: str, password_hash: bytes) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash)
    except (ValueError, TypeError):
        return False


def create_access_token(user: User) -> tuple[str, datetime.datetime, str]:
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now + current_app.config["JWT_ACCESS_TTL"]
    jti = str(uuid.uuid4())
    payload = {
        "sub": str(user.id),
        "iat": now,
        "nbf": now,
        "exp": exp,
        "iss": current_app.config["JWT_ISSUER"],
        "aud": current_app.config["JWT_AUDIENCE"],
        "jti": jti,
    }
    token = jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm=current_app.config["JWT_ALGORITHM"],
    )
    return token, exp, jti


def _extract_bearer_token() -> Optional[str]:
    header = request.headers.get("Authorization", "")
    parts = header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


def auth_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        token = _extract_bearer_token()
        if not token:
            return jsonify({"error": "Unauthorized"}), 401

        try:
            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=[current_app.config["JWT_ALGORITHM"]],
                audience=current_app.config["JWT_AUDIENCE"],
                issuer=current_app.config["JWT_ISSUER"],
                options={"require": ["exp", "iat", "nbf", "sub", "jti", "aud", "iss"]},
            )
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Unauthorized"}), 401

        jti = payload.get("jti")
        if jti and db.session.get(RevokedToken, jti) is not None:
            return jsonify({"error": "Token revoked"}), 401

        try:
            user_id = int(payload["sub"])
        except (KeyError, ValueError, TypeError):
            return jsonify({"error": "Unauthorized"}), 401

        user = db.session.get(User, user_id)
        if user is None or not user.is_active:
            return jsonify({"error": "Unauthorized"}), 401

        g.user = user
        g.token_jti = jti
        g.token_exp = datetime.datetime.fromtimestamp(
            payload["exp"], tz=datetime.timezone.utc
        )
        return f(*args, **kwargs)

    return wrapped
