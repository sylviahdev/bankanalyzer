import io
import os
import sys

import pytest

# Ensure project root is on sys.path before importing the app.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)


@pytest.fixture
def app():
    from app import create_app
    from config import TestConfig
    from extensions import db

    application = create_app(TestConfig)
    # Production schema is owned by Alembic; the suite builds it directly from
    # the models so tests stay fast and independent of migration history.
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    username = "tester01"
    password = "CorrectHorse9Battery"
    client.post("/api/auth/register", json={"username": username, "password": password})
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    token = resp.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_csv() -> bytes:
    return (
        b"Description,Amount\n"
        b"Salary March,5000\n"
        b"Uber ride,-12.5\n"
        b"Supermarket,-80\n"
        b"Restaurant,-40\n"
        b"Unknown thing,-10\n"
    )


@pytest.fixture
def csv_upload(sample_csv):
    return (io.BytesIO(sample_csv), "statement.csv")
