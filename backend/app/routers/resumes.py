import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_session
from app.models import Resume
from app.schemas.api import ResumeOut, ResumeSummary
from app.services.parser import ParseError, parse_resume_text
from app.services.pdf_text import PdfError, extract_text

router = APIRouter(prefix="/resumes", tags=["resumes"])


# Sync handlers: FastAPI runs them in a threadpool, so PDF parsing and the Groq call don't block the event loop.
@router.post("/import", response_model=ResumeOut, status_code=201)
def import_resume(file: UploadFile, session: Session = Depends(get_session)) -> Resume:
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
def list_resumes(session: Session = Depends(get_session)) -> list[Resume]:
    return list(session.scalars(select(Resume).order_by(Resume.created_at.desc())))


def _get_or_404(session: Session, resume_id: uuid.UUID) -> Resume:
    resume = session.get(Resume, resume_id)
    if resume is None:
        raise HTTPException(404, "Lebenslauf nicht gefunden.")
    return resume


@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(resume_id: uuid.UUID, session: Session = Depends(get_session)) -> Resume:
    return _get_or_404(session, resume_id)


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: uuid.UUID, session: Session = Depends(get_session)) -> None:
    session.delete(_get_or_404(session, resume_id))
    session.commit()
