if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()

import logging
import os
import sys

from flask import Flask, jsonify
from flask_cors import CORS
from flask_talisman import Talisman
from werkzeug.middleware.proxy_fix import ProxyFix

import analyze
import auth
import transactions
from config import Config
from errors import register_error_handlers
from extensions import db, limiter, migrate


def _configure_logging(app: Flask) -> None:
    level = getattr(logging, str(app.config.get("LOG_LEVEL", "INFO")).upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    app.logger.setLevel(level)


def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY is not configured")
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        raise RuntimeError("DATABASE_URL is not configured")

    _configure_logging(app)

    # Koyeb (like most PaaS edges) terminates TLS and forwards plain HTTP with
    # X-Forwarded-*. Without this, request.is_secure is always False — so
    # Talisman would redirect every request to https in a loop — and
    # request.remote_addr would be the proxy, putting every user in the same
    # rate-limit bucket. One proxy hop.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    CORS(
        app,
        origins=app.config["CORS_ORIGINS"] or [],
        supports_credentials=False,
        max_age=600,
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        methods=["GET", "POST", "DELETE", "OPTIONS"],
    )

    csp = {
        "default-src": "'none'",
        "frame-ancestors": "'none'",
        "base-uri": "'none'",
        "form-action": "'none'",
    }
    talisman = Talisman(
        app,
        force_https=app.config["FORCE_HTTPS"],
        strict_transport_security=True,
        strict_transport_security_max_age=63072000,
        strict_transport_security_include_subdomains=True,
        content_security_policy=csp,
        frame_options="DENY",
        referrer_policy="no-referrer",
        session_cookie_secure=app.config["FORCE_HTTPS"],
    )

    app.register_blueprint(auth.bp)
    app.register_blueprint(analyze.bp)
    app.register_blueprint(transactions.bp)
    register_error_handlers(app)

    @app.get("/")
    def index():
        return jsonify({"name": "bankanalyzer", "status": "ok"})

    @app.get("/healthz")
    @limiter.exempt
    # Platform health probes hit the container directly over plain HTTP with no
    # X-Forwarded-Proto, so forcing https here would 301 the probe and fail the
    # deploy. This endpoint exposes nothing, so exempting it costs nothing.
    @talisman(force_https=False)
    def healthz():
        return jsonify({"status": "ok"})

    # Schema is owned by Alembic (see migrations/). Nothing is created at
    # startup: an app booting under N gunicorn workers must never race to
    # mutate the schema of a financial database. Run `flask db upgrade` as a
    # release step instead — see the README.

    return app


if __name__ == "__main__":
    _app = create_app()
    _app.run(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
        debug=_app.config.get("DEBUG", False),
    )
