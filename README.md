# Bank Analyzer

Upload a bank statement (`.xlsx` / `.csv`), have every transaction categorized, and read the
result as a financial dashboard — income, expenses, spending categories and monthly trends.

Backend: Flask 3 · SQLAlchemy 2 · PostgreSQL · JWT · bcrypt · Gunicorn · Render.
Frontend: React 19 · Vite · TypeScript · Tailwind CSS 4 · React Router · Axios · Recharts.

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
├── transactions.py     # /api/{statements,transactions,categories,analytics/summary}
├── errors.py           # JSON error handlers
├── requirements.txt
├── render.yaml         # Render service + Postgres
├── Procfile
├── runtime.txt
├── tests/
└── frontend/           # React SPA (see "Frontend" below)
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
| POST | `/api/analyze` | Bearer | Multipart upload `file=...`. Returns `{token, summary, total_transactions, statement}`. |
| GET | `/api/download/<token>` | Bearer | Streams the user's summary `.xlsx`. |
| GET | `/api/statements` | Bearer | The user's uploads with per-statement totals. |
| DELETE | `/api/statements/<id>` | Bearer | Deletes a statement and its transactions. |
| GET | `/api/transactions` | Bearer | Paged, filterable, sortable transaction list. |
| GET | `/api/categories` | Bearer | Distinct categories present in the user's data. |
| GET | `/api/analytics/summary` | Bearer | Totals, per-category breakdown, monthly series, top expenses, recent activity. |

`GET /api/transactions` accepts `page`, `per_page` (max 200), `category`, `type`
(`income` / `expense`), `q` (description search), `date_from`, `date_to`,
`statement_id`, `sort` (`date` / `amount` / `description` / `category`) and
`order` (`asc` / `desc`). `GET /api/analytics/summary` accepts `statement_id` to
scope the figures to a single upload. Every query is filtered by the
authenticated user at the database level.

### Input format

Files must contain an `Amount` numeric column plus either:

- `Category` — used as-is, or
- `Description` — passed through a keyword classifier into a built-in category set.

An optional `Date` column (resolved case-insensitively, parsed leniently) unlocks
monthly aggregation and date filtering. Without it, transactions are still stored
and categorized, but the monthly charts report that they cannot be calculated.

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

## Frontend

A React single-page app in [`frontend/`](frontend/). It talks to the Flask API over
HTTP only — there is no shared runtime, so the two can be developed and deployed
independently.

### Setup

```bash
cd frontend
npm install
cp .env.example .env.local     # then set VITE_API_URL
npm run dev                    # http://localhost:5173
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | yes | Base URL of the Flask API, e.g. `http://127.0.0.1:8000`. Defaults to `http://127.0.0.1:8000` if unset. |
| `VITE_CURRENCY` | no | ISO 4217 code used to format amounts (default `USD`). The API stores plain numbers with no currency unit, so this is purely a display choice. |
| `VITE_LOCALE` | no | BCP 47 locale for number/date formatting. Defaults to the browser locale. |

Vite inlines `VITE_*` variables into the client bundle, so they are public by
definition — never put a secret in one. `.env` and `.env.local` are gitignored.

### Commands

```bash
npm run dev       # dev server with HMR on :5173
npm run build     # type-check (tsc -b) then production build into frontend/dist
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

### How it connects to Flask

- **Base URL.** A single Axios instance (`src/services/client.ts`) is configured from
  `VITE_API_URL`. Nothing else in the app constructs a URL.
- **CORS.** The backend must list the frontend origin in `CORS_ORIGINS`, or the
  browser blocks every request. `http://localhost:5173` is already in
  `.env.example`; set it in the Render dashboard for production.
- **Auth.** Login stores the bearer token, a request interceptor attaches
  `Authorization: Bearer <jwt>` to every call, and a response interceptor clears the
  session and redirects on any 401. The API sets `supports_credentials=False` and
  allows only the `Authorization` and `Content-Type` headers, so an httpOnly cookie
  is not available — a client-held bearer token is what the backend's design
  requires. Tokens are stored with their expiry and treated as absent once lapsed;
  they are never rendered, logged, or placed in a URL.
- **Errors.** 401/403/404/413/415/422/429/5xx and transport failures are normalized
  into a single `ApiError` with a human-readable message, so every page renders a
  real error state rather than a blank screen.

### Deploying the frontend

`npm run build` emits a static bundle in `frontend/dist` — deploy it to any static
host (Vercel, Netlify, Render static site, S3+CloudFront) with `VITE_API_URL`
pointing at the Flask service. Because it is a client-side-routed SPA, the host must
rewrite unknown paths to `/index.html`; the repo's `vercel.json` already does this.

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
