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


def test_update_replaces_name_and_data_and_keeps_unknown_metadata(client, sample_pdf, fake_groq):
    created = client.post("/api/resumes/import", files={"file": ("cv.pdf", sample_pdf, "application/pdf")}).json()
    data = created["data"]
    data["basics"]["headline"] = "Staff Engineer"
    data["metadata"]["template"] = "azurill"
    data["metadata"]["stylesheet"] = {"custom": True}
    data["sections"]["experience"]["items"][0]["hidden"] = True

    res = client.put(f"/api/resumes/{created['id']}", json={"name": "Neu", "data": data})
    assert res.status_code == 200, res.text

    stored = client.get(f"/api/resumes/{created['id']}").json()
    assert stored["name"] == "Neu"
    assert stored["data"]["basics"]["headline"] == "Staff Engineer"
    assert stored["data"]["metadata"]["template"] == "azurill"
    assert stored["data"]["metadata"]["stylesheet"] == {"custom": True}
    assert stored["data"]["sections"]["experience"]["items"][0]["hidden"] is True


def test_update_rejects_invalid_data(client, sample_pdf, fake_groq):
    created = client.post("/api/resumes/import", files={"file": ("cv.pdf", sample_pdf, "application/pdf")}).json()
    data = created["data"]
    data["sections"]["skills"]["items"] = [{"name": "Python", "level": 9}]
    assert client.put(f"/api/resumes/{created['id']}", json={"data": data}).status_code == 422
    assert client.put(f"/api/resumes/{created['id']}", json={"name": ""}).status_code == 422


def test_update_unknown_resume_is_404(client):
    assert client.put("/api/resumes/00000000-0000-0000-0000-000000000000", json={"name": "x"}).status_code == 404


def test_create_empty_resume(client):
    res = client.post("/api/resumes")
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["name"] == "Neuer Lebenslauf"
    assert body["source_filename"] is None
    assert body["data"]["basics"]["name"] == ""
    assert body["data"]["sections"]["experience"]["items"] == []
    assert body["data"]["metadata"]["template"] == "onyx"
    # The empty document is valid, so the builder can save it back unchanged.
    assert client.put(f"/api/resumes/{body['id']}", json={"data": body["data"]}).status_code == 200
    assert [r["id"] for r in client.get("/api/resumes").json()] == [body["id"]]
