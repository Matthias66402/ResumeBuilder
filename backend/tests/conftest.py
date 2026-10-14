import pymupdf
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_session
from app.main import app


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
