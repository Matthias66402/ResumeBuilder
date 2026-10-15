import copy as copy_module
import re
import uuid
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.auth import COOKIE_NAME, current_user
from app.config import get_settings
from app.db import get_session
from app.models import Resume, Upload, User
from app.schemas.api import ResumeOut, ResumeSummary, ResumeUpdate
from app.services.parser import ParseError, parse_resume_text
from app.services.pdf_render import RenderError, render_resume_pdf
from app.services.pdf_text import PdfError, extract_text

router = APIRouter(prefix="/resumes", tags=["resumes"])

# Picture URLs written by routers/uploads.py.
UPLOAD_URL_RE = re.compile(r"/api/uploads/([0-9a-f-]{36})")


# Sync handlers: FastAPI runs them in a threadpool, so PDF parsing and the Groq call don't block the event loop.
@router.post("/import", response_model=ResumeOut, status_code=201)
def import_resume(file: UploadFile, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Resume:
    max_bytes = get_settings().max_upload_mb * 1024 * 1024
    content = file.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(413, f"Die Datei ist größer als {get_settings().max_upload_mb} MB.")
    if not content.startswith(b"%PDF"):
        raise HTTPException(415, "Bitte eine PDF-Datei hochladen.")

    try:
        text = extract_text(content)
    except PdfError as exc:
        raise HTTPException(422, str(exc)) from exc

    try:
        data = parse_resume_text(text)
    except ParseError as exc:
        raise HTTPException(502, str(exc)) from exc

    filename = file.filename or "resume.pdf"
    resume = Resume(
        user_id=user.id,
        name=data.basics.name or Path(filename).stem,
        source_filename=filename,
        raw_text=text,
        data=data.model_dump(mode="json"),
    )
    session.add(resume)
    session.commit()
    session.refresh(resume)
    return resume


@router.get("", response_model=list[ResumeSummary])
def list_resumes(user: User = Depends(current_user), session: Session = Depends(get_session)) -> list[Resume]:
    return list(session.scalars(select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc())))


def get_own_resume(session: Session, resume_id: uuid.UUID, user: User) -> Resume:
    """The user's resume, or 404 – also for other users' resumes, so ids can't be probed."""
    resume = session.get(Resume, resume_id)
    if resume is None or resume.user_id != user.id:
        raise HTTPException(404, "Lebenslauf nicht gefunden.")
    return resume


def ensure_unlocked(resume: Resume) -> None:
    if resume.locked:
        raise HTTPException(423, "Der Lebenslauf ist gesperrt. Zum Bearbeiten erst entsperren.")


@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(resume_id: uuid.UUID, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Resume:
    return get_own_resume(session, resume_id, user)


@router.put("/{resume_id}", response_model=ResumeOut)
def update_resume(
    resume_id: uuid.UUID, update: ResumeUpdate, user: User = Depends(current_user), session: Session = Depends(get_session)
) -> Resume:
    resume = get_own_resume(session, resume_id, user)
    if update.locked is False:
        resume.locked = False
    if update.name is not None or update.data is not None:
        ensure_unlocked(resume)
    if update.name is not None:
        resume.name = update.name
    if update.data is not None:
        resume.data = update.data.model_dump(mode="json")
    if update.locked:
        resume.locked = True
    if update.name is None and update.data is None:
        # Locking isn't an edit: writing updated_at back unchanged keeps its onupdate from moving it.
        flag_modified(resume, "updated_at")
    session.commit()
    session.refresh(resume)
    return resume


@router.post("/{resume_id}/duplicate", response_model=ResumeOut, status_code=201)
def duplicate_resume(resume_id: uuid.UUID, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Resume:
    original = get_own_resume(session, resume_id, user)
    data = copy_module.deepcopy(original.data)
    copy = Resume(
        id=uuid.uuid4(),
        user_id=user.id,
        name=f"{original.name} (Kopie)"[:255],
        source_filename=original.source_filename,
        raw_text=original.raw_text,
        data=data,
    )

    # The picture belongs to the original and is deleted with it, so the copy gets its own. The new URL goes into
    # `data` before anything is added to the session: edits inside a JSON column aren't tracked once it's stored.
    picture = data.get("picture") or {}
    match = UPLOAD_URL_RE.fullmatch(picture.get("url", ""))
    upload = session.get(Upload, uuid.UUID(match[1])) if match else None
    own = None
    if upload and upload.resume_id == original.id:
        own = Upload(id=uuid.uuid4(), resume_id=copy.id, content_type=upload.content_type, content=upload.content)
        picture["url"] = f"/api/uploads/{own.id}"

    session.add(copy)
    session.flush()  # the copy must exist before its upload references it
    if own:
        session.add(own)
    session.commit()
    session.refresh(copy)
    return copy


@router.get("/{resume_id}/pdf")
def download_pdf(
    resume_id: uuid.UUID, request: Request, user: User = Depends(current_user), session: Session = Depends(get_session)
) -> Response:
    resume = get_own_resume(session, resume_id, user)
    try:
        # Chromium signs in with the caller's session, so the print page and pictures stay protected.
        pdf = render_resume_pdf(str(resume.id), request.cookies[COOKIE_NAME])
    except RenderError as exc:
        raise HTTPException(502, str(exc)) from exc
    # ASCII fallback plus RFC 5987 name, so umlauts survive in the downloaded file name.
    filename = f"{resume.name}.pdf"
    ascii_name = re.sub(r"[^A-Za-z0-9._ -]", "_", filename)
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"},
    )


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: uuid.UUID, user: User = Depends(current_user), session: Session = Depends(get_session)) -> None:
    resume = get_own_resume(session, resume_id, user)
    ensure_unlocked(resume)
    session.delete(resume)
    session.commit()
