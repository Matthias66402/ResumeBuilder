import json
from types import SimpleNamespace

import pytest

from app.routers import resumes as resumes_router
from app.services import parser


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


def test_import_list_get_delete(client, sample_pdf, fake_groq):
    res = client.post("/api/resumes/import", files={"file": ("cv.pdf", sample_pdf, "application/pdf")})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["name"] == "Max Mustermann"
    assert body["data"]["sections"]["experience"]["items"][0]["period"] == "März 2020 – Heute"
    # The PDF text reached the LLM.
    assert "Max Mustermann" in fake_groq.calls[0]["messages"][1]["content"]

    listed = client.get("/api/resumes").json()
    assert [r["id"] for r in listed] == [body["id"]]
    assert "data" not in listed[0]

    assert client.get(f"/api/resumes/{body['id']}").json()["data"]["basics"]["email"] == "max@example.com"
    assert client.delete(f"/api/resumes/{body['id']}").status_code == 204
    assert client.get(f"/api/resumes/{body['id']}").status_code == 404


def test_rejects_non_pdf(client):
    res = client.post("/api/resumes/import", files={"file": ("cv.txt", b"hello", "text/plain")})
    assert res.status_code == 415


def test_rejects_pdf_without_text(client):
    import pymupdf

    doc = pymupdf.open()
    doc.new_page()
    res = client.post("/api/resumes/import", files={"file": ("scan.pdf", doc.tobytes(), "application/pdf")})
    assert res.status_code == 422
