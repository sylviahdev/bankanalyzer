import os
from datetime import timedelta


def _normalize_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://") and "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return url


class Config:
    ENV = os.environ.get("FLASK_ENV", "production")
    DEBUG = ENV == "development"
    TESTING = False
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    SECRET_KEY = os.environ.get("SECRET_KEY", "")

    _raw_db_url = os.environ.get("DATABASE_URL", "")
    SQLALCHEMY_DATABASE_URI = _normalize_db_url(_raw_db_url) if _raw_db_url else ""
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}

    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TTL = timedelta(minutes=int(os.environ.get("JWT_ACCESS_TTL_MINUTES", "30")))
    # Refresh tokens rotate on every use, so the ceiling is how long a fully
    # idle session may sit before the user has to sign in again.
    JWT_REFRESH_TTL = timedelta(days=int(os.environ.get("JWT_REFRESH_TTL_DAYS", "14")))
    JWT_ISSUER = os.environ.get("JWT_ISSUER", "bankanalyzer")
    JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "bankanalyzer-api")

    BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", "12"))

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "/tmp/bankanalyzer-uploads")
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
    ALLOWED_EXTENSIONS = {"xlsx", "csv"}
    MAX_ROWS = int(os.environ.get("MAX_ROWS", "50000"))

    CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]

    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    FORCE_HTTPS = ENV == "production"


class TestConfig(Config):
    ENV = "test"
    TESTING = True
    DEBUG = False
    SECRET_KEY = "test-secret-key-not-for-production"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    UPLOAD_FOLDER = "/tmp/bankanalyzer-tests"
    CORS_ORIGINS = ["http://localhost"]
    FORCE_HTTPS = False
    RATELIMIT_ENABLED = False
