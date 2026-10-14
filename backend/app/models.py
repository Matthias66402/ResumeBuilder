import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    source_filename: Mapped[str | None] = mapped_column(String(255))
    # Plain text extracted from the PDF, kept for re-parsing and debugging.
    raw_text: Mapped[str | None] = mapped_column(Text)
    # Reactive Resume compatible ResumeData (see app/schemas/resume.py).
    data: Mapped[dict[str, Any]] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
