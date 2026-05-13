# Bank Analyzer

A JSON API for uploading bank statements (`.xlsx` / `.csv`), categorizing transactions, and downloading a summary spreadsheet.

Stack: Flask 3 · SQLAlchemy 2 · PostgreSQL · JWT · bcrypt · Gunicorn · Render.

## Features

- Username / password auth with bcrypt (cost factor 12) and JWT bearer tokens (HS256, with `iss`, `aud`, `nbf`, `jti`, `exp`).
- Token revocation via DB-backed `jti` denylist (logout invalidates immediately).
- Per-user file isolation under `UPLOAD_FOLDER/user_<id>/`; clients reference results only via opaque UUID tokens.
- Upload allowlist (`.xlsx`, `.csv`), 5 MB cap, 50 000-row cap, magic-byte parsing via pandas.
- Rate limits on register, login, analyze, download via `flask-limiter`.
- HSTS, strict CSP, frame deny, referrer no-referrer via `flask-talisman`.
- Errors return a generic message + correlation ID; full traces only in server logs.

## Layout

```
.
├── app.py              # create_app factory
├── wsgi.py             # gunicorn entry
├── config.py           # Env-driven Config + TestConfig
├── extensions.py       # SQLAlchemy, Limiter singletons
├── models.py           # User, RevokedToken
├── security.py         # password hashing, JWT, auth_required
├── auth.py             # /api/auth/{register,login,logout,me}
├── analyze.py          # /api/{analyze,download/<token>}
├── errors.py           # JSON error handlers
├── requirements.txt
├── render.yaml         # Render service + Postgres
├── Procfile
├── runtime.txt
└── tests/
```

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | – | Service banner. |
| GET | `/healthz` | – | Liveness probe. |
| POST | `/api/auth/register` | – | Create account. Body: `{username, password}`. |
| POST | `/api/auth/login` | – | Returns `{access_token, token_type, expires_at}`. |
| POST | `/api/auth/logout` | Bearer | Revokes current token. |
| GET | `/api/auth/me` | Bearer | Returns current user. |
| POST | `/api/analyze` | Bearer | Multipart upload `file=...`. Returns `{token, summary, total_transactions}`. |
| GET | `/api/download/<token>` | Bearer | Streams the user's summary `.xlsx`. |

### Input format

Files must contain an `Amount` numeric column plus either:

- `Category` — used as-is, or
- `Description` — passed through a keyword classifier into a built-in category set.

## Local setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in SECRET_KEY (python -c "import secrets; print(secrets.token_urlsafe(64))") and DATABASE_URL
python -m flask --app wsgi run --debug --port 8000
```

Run tests:

```bash
pip install pytest
pytest
```

## Deploy on Render

1. Create a new Blueprint from this repo. `render.yaml` declares the web service and a managed Postgres.
2. Set `CORS_ORIGINS` in the Render dashboard to your frontend origin(s) (comma-separated). `SECRET_KEY` and `DATABASE_URL` are managed automatically.
3. The first deploy creates tables via `db.create_all()`. Replace with Alembic migrations before onboarding real users.

## Known limitations / TODO

- File storage is ephemeral on Render's free tier. Move to S3/R2 with signed URLs before production.
- No Alembic migrations yet; schema changes currently require `db.create_all()` on fresh tables.
- Rate limiter uses in-memory storage by default; configure `RATELIMIT_STORAGE_URI` (Redis) when running multi-worker.
- No MFA, no email verification, no password reset flow — required before fintech production use.
- Add ClamAV scan in front of `pd.read_excel` / `pd.read_csv` before accepting untrusted uploads at scale.
