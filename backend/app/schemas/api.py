import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.resume import ResumeData


class ResumeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    source_filename: str | None
    created_at: datetime
    updated_at: datetime


class ResumeOut(ResumeSummary):
    # Stored camelCase JSON, returned as-is so it matches Reactive Resume's format.
    data: dict[str, Any]


class ResumeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    # Replaces the whole document, as Reactive Resume's builder does on save.
    data: ResumeData | None = None
