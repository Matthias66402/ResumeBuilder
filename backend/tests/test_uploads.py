import time

import pymupdf
import pytest

from app.routers import resumes as resumes_router
from app.services.pdf_render import RenderError
from app.services.pdf_text import extract_text


def png_bytes() -> bytes:
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 4, 4), False)
    pix.clear_with(200)  # a new pixmap's memory is uninitialized
    return pix.tobytes("png")


@pytest.fixture
def resume_id(client, sample_pdf, fake_groq) -> str:
    return client.post("/api/resumes/import", files={"file": ("cv.pdf", sample_pdf, "application/pdf")}).json()["id"]


def test_picture_upload_is_served(client, resume_id):
    res = client.post(f"/api/resumes/{resume_id}/picture", files={"file": ("me.png", png_bytes(), "image/png")})
    assert res.status_code == 201, res.text
    url = res.json()["url"]
    assert url.startswith("/api/uploads/")

    served = client.get(url)
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/png"
    assert "immutable" in served.headers["cache-control"]
    assert served.content == png_bytes()


def test_duplicate_copies_data_and_gets_its_own_picture(client, resume_id):
    url = client.post(f"/api/resumes/{resume_id}/picture", files={"file": ("me.png", png_bytes(), "image/png")}).json()["url"]
    data = client.get(f"/api/resumes/{resume_id}").json()["data"]
    data["picture"]["url"] = url
    data["basics"]["headline"] = "Staff Engineer"
    client.put(f"/api/resumes/{resume_id}", json={"data": data})

    res = client.post(f"/api/resumes/{resume_id}/duplicate")
    assert res.status_code == 201, res.text
    copy = res.json()
    assert copy["id"] != resume_id
    assert copy["name"] == "Max Mustermann (Kopie)"
    assert copy["data"]["basics"]["headline"] == "Staff Engineer"
    copy_url = copy["data"]["picture"]["url"]
    assert copy_url.startswith("/api/uploads/") and copy_url != url

    # The copy keeps its picture when the original (and with it the original's upload) is deleted.
    assert client.delete(f"/api/resumes/{resume_id}").status_code == 204
    assert client.get(copy_url).content == png_bytes()
    assert client.get(f"/api/resumes/{copy['id']}").json()["data"]["picture"]["url"] == copy_url


def test_duplicate_of_unknown_resume_is_404(client):
    assert client.post("/api/resumes/00000000-0000-0000-0000-000000000000/duplicate").status_code == 404


def test_picture_type_is_sniffed_not_trusted(client, resume_id):
    res = client.post(f"/api/resumes/{resume_id}/picture", files={"file": ("me.png", b"<svg/>", "image/png")})
    assert res.status_code == 415


def test_picture_for_unknown_resume_is_404(client):
    res = client.post(
        "/api/resumes/00000000-0000-0000-0000-000000000000/picture", files={"file": ("me.png", png_bytes(), "image/png")}
    )
    assert res.status_code == 404


def test_picture_settings_are_validated(client, resume_id):
    data = client.get(f"/api/resumes/{resume_id}").json()["data"]
    data["picture"]["size"] = 9999
    assert client.put(f"/api/resumes/{resume_id}", json={"data": data}).status_code == 422


def test_pdf_download_has_attachment_name(client, resume_id, sample_pdf, monkeypatch):
    monkeypatch.setattr(resumes_router, "render_resume_pdf", lambda rid, token: sample_pdf)
    client.put(f"/api/resumes/{resume_id}", json={"name": "Jürgen Müller"})

    res = client.get(f"/api/resumes/{resume_id}/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    disposition = res.headers["content-disposition"]
    assert 'filename="J_rgen M_ller.pdf"' in disposition
    assert "filename*=UTF-8''J%C3%BCrgen%20M%C3%BCller.pdf" in disposition
    assert "Max Mustermann" in extract_text(res.content)


def test_exported_pdf_imports_back_without_llm(new_client, sample_pdf, fake_groq, monkeypatch):
    monkeypatch.setattr(resumes_router, "render_resume_pdf", lambda rid, token: sample_pdf)
    client = new_client("max@example.com")
    resume_id = client.post("/api/resumes/import", files={"file": ("cv.pdf", sample_pdf, "application/pdf")}).json()["id"]
    url = client.post(f"/api/resumes/{resume_id}/picture", files={"file": ("me.png", png_bytes(), "image/png")}).json()["url"]
    data = client.get(f"/api/resumes/{resume_id}").json()["data"]
    data["picture"]["url"] = url
    data["basics"]["headline"] = "Staff Engineer"
    data["metadata"]["template"] = "azurill"
    client.put(f"/api/resumes/{resume_id}", json={"data": data})
    exported = client.get(f"/api/resumes/{resume_id}/pdf").content
    calls = len(fake_groq.calls)

    res = client.post("/api/resumes/import", files={"file": ("export.pdf", exported, "application/pdf")})
    assert res.status_code == 201, res.text
    imported = res.json()["data"]
    assert len(fake_groq.calls) == calls  # read from the attachment, not parsed
    assert imported["basics"]["headline"] == "Staff Engineer"
    assert imported["metadata"]["template"] == "azurill"
    # Same account: the picture is copied, so it survives deleting the exported resume.
    assert imported["picture"]["url"].startswith("/api/uploads/") and imported["picture"]["url"] != url
    assert client.delete(f"/api/resumes/{resume_id}").status_code == 204
    assert client.get(imported["picture"]["url"]).content == png_bytes()

    # Another account gets the data but not the picture.
    other = new_client("erika@example.com").post(
        "/api/resumes/import", files={"file": ("export.pdf", exported, "application/pdf")}
    )
    assert other.json()["data"]["basics"]["headline"] == "Staff Engineer"
    assert other.json()["data"]["picture"]["url"] == ""


def test_pdf_render_failure_is_502(client, resume_id, monkeypatch):
    def fail(rid, token):
        raise RenderError("boom")

    monkeypatch.setattr(resumes_router, "render_resume_pdf", fail)
    assert client.get(f"/api/resumes/{resume_id}/pdf").status_code == 502


def test_locked_resume_refuses_edits_picture_and_delete_until_unlocked(client, resume_id):
    assert client.get(f"/api/resumes/{resume_id}").json()["locked"] is False
    res = client.put(f"/api/resumes/{resume_id}", json={"locked": True})
    assert res.status_code == 200 and res.json()["locked"] is True
    assert client.get("/api/resumes").json()[0]["locked"] is True

    data = client.get(f"/api/resumes/{resume_id}").json()["data"]
    assert client.put(f"/api/resumes/{resume_id}", json={"name": "Neu"}).status_code == 423
    assert client.put(f"/api/resumes/{resume_id}", json={"data": data}).status_code == 423
    picture = client.post(f"/api/resumes/{resume_id}/picture", files={"file": ("me.png", png_bytes(), "image/png")})
    assert picture.status_code == 423
    assert client.delete(f"/api/resumes/{resume_id}").status_code == 423
    assert client.get(f"/api/resumes/{resume_id}").json()["name"] == "Max Mustermann"

    # Duplicating still works and gives an unlocked copy.
    assert client.post(f"/api/resumes/{resume_id}/duplicate").json()["locked"] is False

    # Locking and unlocking alone don't count as an edit; an edit does.
    edited_at = client.get(f"/api/resumes/{resume_id}").json()["updated_at"]
    time.sleep(1.1)  # SQLite's CURRENT_TIMESTAMP has whole seconds
    assert client.put(f"/api/resumes/{resume_id}", json={"locked": False}).json()["updated_at"] == edited_at
    assert client.put(f"/api/resumes/{resume_id}", json={"locked": True}).json()["updated_at"] == edited_at

    # Unlocking together with an edit applies the edit.
    res = client.put(f"/api/resumes/{resume_id}", json={"locked": False, "name": "Neu"})
    assert res.status_code == 200 and res.json()["name"] == "Neu" and res.json()["locked"] is False
    assert res.json()["updated_at"] != edited_at
    assert client.delete(f"/api/resumes/{resume_id}").status_code == 204
