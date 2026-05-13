import datetime
import hashlib
from functools import wraps

from flask import current_app, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import IdempotencyKey

IDEM_TTL = datetime.timedelta(hours=24)
KEY_MAX_LEN = 128


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _request_fingerprint() -> str:
    # Multipart uploads regenerate boundaries per request, so hashing the raw
    # body would make legitimate retries diverge. Hash file contents and form
    # fields directly when applicable.
    if request.files:
        h = hashlib.sha256()
        for name in sorted(request.files):
            for f in request.files.getlist(name):
                h.update(name.encode())
                h.update((f.filename or "").encode())
                pos = f.stream.tell()
                f.stream.seek(0)
                while True:
                    chunk = f.stream.read(65536)
                    if not chunk:
                        break
                    h.update(chunk)
                f.stream.seek(pos)
        for k in sorted(request.form):
            for v in request.form.getlist(k):
                h.update(f"{k}={v}".encode())
        return h.hexdigest()
    return hashlib.sha256(request.get_data(cache=True)).hexdigest()


def idempotent(f):
    """Cache the response of a write endpoint keyed by Idempotency-Key + user + endpoint.

    Same key + same body  -> replay the cached response.
    Same key + different body -> 409 Conflict (Stripe/RFC pattern).
    No header sent -> behave as a normal request.
    5xx responses are not cached so transient server errors can be retried.
    """

    @wraps(f)
    def wrapped(*args, **kwargs):
        key = request.headers.get("Idempotency-Key")
        if not key:
            return f(*args, **kwargs)

        if len(key) > KEY_MAX_LEN:
            return jsonify({"error": "Idempotency-Key too long"}), 400

        body_hash = _request_fingerprint()
        endpoint = request.endpoint or ""
        user_id = g.user.id

        existing = (
            db.session.query(IdempotencyKey)
            .filter_by(user_id=user_id, key=key, endpoint=endpoint)
            .first()
        )
        if existing is not None:
            if existing.expires_at <= _utcnow():
                db.session.delete(existing)
                db.session.commit()
            elif existing.request_hash != body_hash:
                return jsonify(
                    {"error": "Idempotency-Key reused with a different payload"}
                ), 409
            else:
                return current_app.response_class(
                    response=existing.response_body,
                    status=existing.status_code,
                    mimetype="application/json",
                )

        response = current_app.make_response(f(*args, **kwargs))

        if 200 <= response.status_code < 500:
            try:
                record = IdempotencyKey(
                    user_id=user_id,
                    key=key,
                    endpoint=endpoint,
                    request_hash=body_hash,
                    status_code=response.status_code,
                    response_body=response.get_data(as_text=True),
                    expires_at=_utcnow() + IDEM_TTL,
                )
                db.session.add(record)
                db.session.commit()
            except IntegrityError:
                db.session.rollback()

        return response

    return wrapped
