import datetime
import uuid
from functools import wraps
from typing import Optional

import bcrypt
import jwt
from flask import current_app, g, jsonify, request

from extensions import db
from models import RefreshToken, RevokedToken, User

ACCESS_TYPE = "access"
REFRESH_TYPE = "refresh"


def hash_password(password: str) -> bytes:
    rounds = current_app.config["BCRYPT_ROUNDS"]
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=rounds))


def verify_password(password: str, password_hash: bytes) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash)
    except (ValueError, TypeError):
        return False


def _encode(user: User, ttl: datetime.timedelta, token_type: str) -> tuple[str, datetime.datetime, str]:
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now + ttl
    jti = str(uuid.uuid4())
    payload = {
        "sub": str(user.id),
        "iat": now,
        "nbf": now,
        "exp": exp,
        "iss": current_app.config["JWT_ISSUER"],
        "aud": current_app.config["JWT_AUDIENCE"],
        "jti": jti,
        "typ": token_type,
    }
    token = jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm=current_app.config["JWT_ALGORITHM"],
    )
    return token, exp, jti


def create_access_token(user: User) -> tuple[str, datetime.datetime, str]:
    return _encode(user, current_app.config["JWT_ACCESS_TTL"], ACCESS_TYPE)


def create_refresh_token(
    user: User, family_id: Optional[str] = None
) -> tuple[str, datetime.datetime, str]:
    """Mint a refresh token and record it so it can be rotated exactly once."""
    token, exp, jti = _encode(user, current_app.config["JWT_REFRESH_TTL"], REFRESH_TYPE)
    db.session.add(
        RefreshToken(
            jti=jti,
            user_id=user.id,
            family_id=family_id or jti,
            expires_at=exp,
        )
    )
    return token, exp, jti


def revoke_refresh_family(family_id: str) -> None:
    """Kill every token descended from one login. Used on logout and on reuse."""
    RefreshToken.query.filter_by(family_id=family_id, revoked=False).update(
        {"revoked": True}, synchronize_session=False
    )


def revoke_all_refresh_tokens(user_id: int) -> None:
    RefreshToken.query.filter_by(user_id=user_id, revoked=False).update(
        {"revoked": True}, synchronize_session=False
    )


def decode_token(token: str, expected_type: str) -> tuple[Optional[dict], Optional[str]]:
    """Decode and validate a JWT. Returns (payload, error_message)."""
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
        return None, "Token expired"
    except jwt.InvalidTokenError:
        return None, "Unauthorized"

    # Tokens minted before `typ` existed are access tokens; no refresh token has
    # ever been issued without it, so defaulting this way cannot be abused.
    if payload.get("typ", ACCESS_TYPE) != expected_type:
        return None, "Unauthorized"

    return payload, None


def session_is_current(user: User, payload: dict) -> bool:
    """False once a password change has invalidated tokens issued before it."""
    cutoff = user.sessions_valid_from
    if cutoff is None:
        return True
    if cutoff.tzinfo is None:
        cutoff = cutoff.replace(tzinfo=datetime.timezone.utc)
    issued_at = datetime.datetime.fromtimestamp(payload["iat"], tz=datetime.timezone.utc)
    return issued_at >= cutoff


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

        # A refresh token must never be accepted as an access token.
        payload, error = decode_token(token, ACCESS_TYPE)
        if payload is None:
            return jsonify({"error": error}), 401

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

        if not session_is_current(user, payload):
            return jsonify({"error": "Token expired"}), 401

        g.user = user
        g.token_jti = jti
        g.token_exp = datetime.datetime.fromtimestamp(
            payload["exp"], tz=datetime.timezone.utc
        )
        return f(*args, **kwargs)

    return wrapped
