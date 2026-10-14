import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


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
