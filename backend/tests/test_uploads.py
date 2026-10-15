import pymupdf
import pytest

from app.routers import resumes as resumes_router
from app.services.pdf_render import RenderError


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


def test_pdf_download_has_attachment_name(client, resume_id, monkeypatch):
    monkeypatch.setattr(resumes_router, "render_resume_pdf", lambda rid, token: b"%PDF-1.7 fake")
    client.put(f"/api/resumes/{resume_id}", json={"name": "Jürgen Müller"})

    res = client.get(f"/api/resumes/{resume_id}/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    disposition = res.headers["content-disposition"]
    assert 'filename="J_rgen M_ller.pdf"' in disposition
    assert "filename*=UTF-8''J%C3%BCrgen%20M%C3%BCller.pdf" in disposition
    assert res.content == b"%PDF-1.7 fake"


def test_pdf_render_failure_is_502(client, resume_id, monkeypatch):
    def fail(rid, token):
        raise RenderError("boom")

    monkeypatch.setattr(resumes_router, "render_resume_pdf", fail)
    assert client.get(f"/api/resumes/{resume_id}/pdf").status_code == 502
