import uuid

from app.models import Resume

PASSWORD = "correct horse battery"


def import_resume(client, sample_pdf) -> str:
    res = client.post("/api/resumes/import", files={"file": ("cv.pdf", sample_pdf, "application/pdf")})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_endpoints_require_sign_in(new_client):
    anon = new_client()
    assert anon.get("/api/resumes").status_code == 401
    assert anon.get("/api/auth/me").status_code == 401
    assert anon.get(f"/api/resumes/{uuid.uuid4()}/pdf").status_code == 401


def test_register_signs_in_with_httponly_cookie(new_client):
    client = new_client()
    res = client.post("/api/auth/register", json={"email": " Max@Example.com ", "password": PASSWORD})
    assert res.status_code == 201
    assert res.json()["email"] == "max@example.com"
    cookie = res.headers["set-cookie"]
    assert "rb_session=" in cookie and "HttpOnly" in cookie and "samesite=lax" in cookie.lower()
    assert client.get("/api/auth/me").json()["email"] == "max@example.com"


def test_register_validates_input(new_client):
    client = new_client("taken@example.com")
    assert client.post("/api/auth/register", json={"email": "TAKEN@example.com", "password": PASSWORD}).status_code == 409
    assert client.post("/api/auth/register", json={"email": "no-at-sign", "password": PASSWORD}).status_code == 422
    assert client.post("/api/auth/register", json={"email": "a@b.de", "password": "short"}).status_code == 422


def test_login_and_logout(new_client):
    new_client("max@example.com")
    client = new_client()
    assert client.post("/api/auth/login", json={"email": "max@example.com", "password": "wrong password"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "MAX@example.com", "password": PASSWORD}).status_code == 200
    assert client.get("/api/auth/me").status_code == 200

    stolen = client.cookies.get("rb_session")
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    # The session is gone server-side too, not just the cookie.
    replay = new_client()
    replay.cookies.set("rb_session", stolen)
    assert replay.get("/api/auth/me").status_code == 401


def test_users_only_see_their_own_resumes(new_client, sample_pdf, fake_groq):
    alice = new_client("alice@example.com")
    bob = new_client("bob@example.com")
    resume_id = import_resume(alice, sample_pdf)
    picture = alice.post(
        f"/api/resumes/{resume_id}/picture", files={"file": ("p.jpg", b"\xff\xd8\xff\xe0" + b"0" * 20, "image/jpeg")}
    ).json()["url"]

    assert [r["id"] for r in alice.get("/api/resumes").json()] == [resume_id]
    assert bob.get("/api/resumes").json() == []
    # Someone else's resume looks exactly like a missing one.
    for res in (
        bob.get(f"/api/resumes/{resume_id}"),
        bob.put(f"/api/resumes/{resume_id}", json={"name": "x"}),
        bob.delete(f"/api/resumes/{resume_id}"),
        bob.get(f"/api/resumes/{resume_id}/pdf"),
        bob.post(f"/api/resumes/{resume_id}/picture", files={"file": ("p.jpg", b"\xff\xd8\xff", "image/jpeg")}),
        bob.get(picture),
    ):
        assert res.status_code == 404
    assert alice.get(picture).status_code == 200


def test_first_account_adopts_ownerless_resumes(new_client):
    with new_client.session_factory() as db:
        db.add(Resume(name="Alt", data={}))
        db.commit()

    first = new_client("first@example.com")
    second = new_client("second@example.com")
    assert [r["name"] for r in first.get("/api/resumes").json()] == ["Alt"]
    assert second.get("/api/resumes").json() == []
