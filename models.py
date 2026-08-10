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
    # Tokens issued before this instant are rejected. Bumped on password change
    # so one action invalidates every outstanding session, including access
    # tokens whose jti we never recorded. NULL means "no cutoff".
    sessions_valid_from = db.Column(db.DateTime(timezone=True), nullable=True)


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    jti = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_utcnow)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)


class RefreshToken(db.Model):
    """A single issued refresh token, tracked so it can be rotated exactly once.

    Rotation with reuse detection (OAuth 2.1 BCP): every refresh burns the
    presented token and issues a successor in the same `family_id`. Presenting
    an already-burned or revoked token means it leaked — the whole family is
    revoked, which logs out both the attacker and the legitimate holder.
    """

    __tablename__ = "refresh_tokens"

    jti = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    family_id = db.Column(db.String(36), nullable=False, index=True)
    issued_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_utcnow)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    # Set the moment the token is exchanged; a second exchange is reuse.
    used_at = db.Column(db.DateTime(timezone=True), nullable=True)
    revoked = db.Column(db.Boolean, nullable=False, default=False)


class Statement(db.Model):
    """One uploaded bank statement and its rolled-up totals."""

    __tablename__ = "statements"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    token = db.Column(db.String(32), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    row_count = db.Column(db.Integer, nullable=False, default=0)
    total_income = db.Column(db.Float, nullable=False, default=0.0)
    total_expenses = db.Column(db.Float, nullable=False, default=0.0)
    period_start = db.Column(db.Date, nullable=True)
    period_end = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_utcnow)

    transactions = db.relationship(
        "Transaction",
        back_populates="statement",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.UniqueConstraint("user_id", "token", name="uq_statement_user_token"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "token": self.token,
            "filename": self.filename,
            "row_count": self.row_count,
            "total_income": round(self.total_income, 2),
            "total_expenses": round(self.total_expenses, 2),
            "net_balance": round(self.total_income + self.total_expenses, 2),
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "created_at": self.created_at.isoformat(),
        }


class Transaction(db.Model):
    """A single normalized row parsed out of an uploaded statement."""

    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    statement_id = db.Column(
        db.Integer,
        db.ForeignKey("statements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = db.Column(db.Date, nullable=True, index=True)
    description = db.Column(db.String(512), nullable=False, default="")
    category = db.Column(db.String(64), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    # Derived from the sign of `amount`; stored so the DB can filter on it.
    kind = db.Column(db.String(8), nullable=False, index=True)

    statement = db.relationship("Statement", back_populates="transactions")

    __table_args__ = (
        db.Index("ix_transactions_user_date", "user_id", "date"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "statement_id": self.statement_id,
            "date": self.date.isoformat() if self.date else None,
            "description": self.description,
            "category": self.category,
            "amount": round(self.amount, 2),
            "type": self.kind,
        }


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
