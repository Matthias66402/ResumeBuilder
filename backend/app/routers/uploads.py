import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_session
from app.models import Resume, Upload, User
from app.routers.resumes import get_own_resume

router = APIRouter(tags=["uploads"])

MAX_PICTURE_BYTES = 5 * 1024 * 1024

# Detected from the file's first bytes; the client-sent content type isn't trusted.
SIGNATURES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}


def sniff_image(content: bytes) -> str | None:
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return next((ctype for sig, ctype in SIGNATURES.items() if content.startswith(sig)), None)


class UploadOut(BaseModel):
    url: str


@router.post("/resumes/{resume_id}/picture", response_model=UploadOut, status_code=201)
def upload_picture(
    resume_id: uuid.UUID, file: UploadFile, user: User = Depends(current_user), session: Session = Depends(get_session)
) -> UploadOut:
    get_own_resume(session, resume_id, user)
    content = file.file.read(MAX_PICTURE_BYTES + 1)
    if len(content) > MAX_PICTURE_BYTES:
        raise HTTPException(413, "Das Bild ist größer als 5 MB.")
    content_type = sniff_image(content)
    if content_type is None:
        raise HTTPException(415, "Bitte ein JPEG-, PNG- oder WebP-Bild hochladen.")

    # Older pictures stay until the resume is deleted, so undo can bring them back.
    upload = Upload(resume_id=resume_id, content_type=content_type, content=content)
    session.add(upload)
    session.commit()
    return UploadOut(url=f"/api/uploads/{upload.id}")


@router.get("/uploads/{upload_id}")
def get_upload(upload_id: uuid.UUID, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Response:
    upload = session.get(Upload, upload_id)
    resume = session.get(Resume, upload.resume_id) if upload else None
    if upload is None or resume is None or resume.user_id != user.id:
        raise HTTPException(404, "Datei nicht gefunden.")
    # Uploads never change (a new picture gets a new id); private, since they belong to one account.
    return Response(
        upload.content,
        media_type=upload.content_type,
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )
