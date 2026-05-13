import datetime

from extensions import db


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.LargeBinary, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_utcnow)


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    jti = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_utcnow)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)


class IdempotencyKey(db.Model):
    __tablename__ = "idempotency_keys"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    key = db.Column(db.String(128), nullable=False)
    endpoint = db.Column(db.String(64), nullable=False)
    request_hash = db.Column(db.String(64), nullable=False)
    status_code = db.Column(db.Integer, nullable=False)
    response_body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_utcnow)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)

    __table_args__ = (
        db.UniqueConstraint(
            "user_id", "key", "endpoint", name="uq_idempotency_user_key_endpoint"
        ),
    )
