import json
import logging
from functools import lru_cache
from pathlib import Path

from groq import BadRequestError, Groq
from pydantic import ValidationError

from app.config import get_settings
from app.schemas.extraction import ExtractedResume, strict_json_schema
from app.schemas.resume import ResumeData
from app.services.sanitize import sanitize

log = logging.getLogger(__name__)

SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "parser_system.md").read_text(encoding="utf-8")


class ParseError(RuntimeError):
    """The LLM call failed or returned something unusable."""


@lru_cache
def get_client() -> Groq:
    settings = get_settings()
    if not settings.groq_api_key:
        raise ParseError("GROQ_API_KEY ist nicht gesetzt.")
    return Groq(api_key=settings.groq_api_key)


def _complete(client: Groq, text: str, response_format: dict) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Resume text:\n\n<resume>\n{text}\n</resume>\n\nReturn the JSON object only."},
    ]
    if response_format["type"] == "json_object":
        # JSON mode has no schema parameter, so the schema goes into the prompt instead.
        messages[0]["content"] += "\n\n## JSON Schema\n\n" + json.dumps(ExtractedResume.model_json_schema())
    completion = client.chat.completions.create(
        model=get_settings().groq_model,
        messages=messages,
        response_format=response_format,
        temperature=0,
    )
    return completion.choices[0].message.content or ""


def extract(text: str, client: Groq | None = None) -> ExtractedResume:
    client = client or get_client()
    strict = {
        "type": "json_schema",
        "json_schema": {"name": "resume", "strict": True, "schema": strict_json_schema()},
    }
    try:
        content = _complete(client, text, strict)
    except BadRequestError as exc:
        # Models without strict structured-output support reject the schema; fall back to JSON mode.
        log.warning("Structured output rejected (%s), retrying with JSON mode", exc)
        try:
            content = _complete(client, text, {"type": "json_object"})
        except Exception as inner:
            raise ParseError(f"LLM-Aufruf fehlgeschlagen: {inner}") from inner
    except Exception as exc:
        raise ParseError(f"LLM-Aufruf fehlgeschlagen: {exc}") from exc

    try:
        return ExtractedResume.model_validate_json(content)
    except ValidationError as exc:
        raise ParseError("Das LLM hat kein gültiges JSON geliefert.") from exc


def parse_resume_text(text: str, client: Groq | None = None) -> ResumeData:
    return sanitize(extract(text, client))
