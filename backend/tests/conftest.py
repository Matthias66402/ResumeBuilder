import json
from types import SimpleNamespace

import pymupdf
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_session
from app.main import app
from app.routers import resumes as resumes_router
from app.services import parser


@pytest.fixture
def client():
    # In-memory SQLite stands in for Postgres; the JSONB column falls back to JSON there.
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        with TestSession() as session:
            yield session

    app.dependency_overrides[get_session] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def sample_pdf() -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text(
        (72, 72),
        "Max Mustermann\nSoftware Engineer\nmax@example.com\n\nBerufserfahrung\nACME GmbH, 03/2020 - heute",
    )
    return doc.tobytes()


class FakeGroq:
    """Returns a canned extraction and records the prompt it was given."""

    def __init__(self, payload: dict):
        self.payload = payload
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        message = SimpleNamespace(content=json.dumps(self.payload))
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.fixture
def fake_groq(monkeypatch):
    fake = FakeGroq(
        {
            "language": "de",
            "basics": {"name": "Max Mustermann", "headline": "Software Engineer", "email": "max@example.com"},
            "experience": [
                {"company": "ACME GmbH", "dates": {"start": "2020-03", "present": True, "text": "03/2020 - heute"}}
            ],
        }
    )
    monkeypatch.setattr(resumes_router, "parse_resume_text", lambda text: parser.parse_resume_text(text, fake))
    return fake
