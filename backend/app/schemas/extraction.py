"""Slim schema the LLM fills in. Only content fields: ids, visibility, icons and layout are added afterwards."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class _Strict(BaseModel):
    model_config = ConfigDict(extra="ignore")


class XDates(_Strict):
    start: str | None = Field(
        default=None, description='Start date (or the single date) as "YYYY" or "YYYY-MM"; null if not stated.'
    )
    end: str | None = Field(default=None, description='End date as "YYYY" or "YYYY-MM"; null if ongoing or not stated.')
    present: bool = Field(default=False, description="True if explicitly ongoing (e.g. 'present', 'heute', 'bis jetzt').")
    text: str = Field(default="", description="The date or period exactly as written in the resume.")


class XWebsite(_Strict):
    url: str = ""
    label: str = ""


class XBasics(_Strict):
    name: str = ""
    headline: str = Field(default="", description="Job title or tagline directly under the name.")
    email: str = ""
    phone: str = ""
    location: str = ""
    website: XWebsite = Field(default_factory=XWebsite)


class XProfile(_Strict):
    network: str = Field(default="", description="e.g. LinkedIn, GitHub, Xing.")
    username: str = ""
    url: str = ""


class XRole(_Strict):
    position: str = ""
    dates: XDates = Field(default_factory=XDates)
    description: str = ""


class XExperience(_Strict):
    company: str = ""
    position: str = ""
    location: str = ""
    dates: XDates = Field(default_factory=XDates)
    url: str = ""
    description: str = Field(default="", description="HTML using <p>, <ul>, <li>.")
    roles: list[XRole] = Field(
        default_factory=list, description="Only when several distinct positions are listed under one company."
    )


class XEducation(_Strict):
    school: str = ""
    degree: str = ""
    area: str = Field(default="", description="Field of study.")
    grade: str = ""
    location: str = ""
    dates: XDates = Field(default_factory=XDates)
    url: str = ""
    description: str = ""


class XProject(_Strict):
    name: str = ""
    dates: XDates = Field(default_factory=XDates)
    url: str = ""
    description: str = ""


class XSkill(_Strict):
    name: str = Field(default="", description="Skill or skill group name.")
    proficiency: str = Field(default="", description="Proficiency only if explicitly stated.")
    keywords: list[str] = Field(default_factory=list)


class XLanguage(_Strict):
    language: str = ""
    fluency: str = Field(default="", description="As written, e.g. 'Muttersprache', 'C1', 'fluent'.")


class XInterest(_Strict):
    name: str = ""
    keywords: list[str] = Field(default_factory=list)


class XAward(_Strict):
    title: str = ""
    awarder: str = ""
    dates: XDates = Field(default_factory=XDates)
    url: str = ""
    description: str = ""


class XCertification(_Strict):
    title: str = ""
    issuer: str = ""
    dates: XDates = Field(default_factory=XDates)
    url: str = ""
    description: str = ""


class XPublication(_Strict):
    title: str = ""
    publisher: str = ""
    dates: XDates = Field(default_factory=XDates)
    url: str = ""
    description: str = ""


class XVolunteer(_Strict):
    organization: str = ""
    location: str = ""
    dates: XDates = Field(default_factory=XDates)
    url: str = ""
    description: str = ""


class XReference(_Strict):
    name: str = ""
    position: str = ""
    phone: str = ""
    url: str = ""
    description: str = ""


class ExtractedResume(_Strict):
    language: str = Field(default="en", description="ISO 639-1 code of the resume's language, e.g. 'de' or 'en'.")
    basics: XBasics = Field(default_factory=XBasics)
    summary: str = Field(default="", description="Profile/summary text as HTML.")
    profiles: list[XProfile] = Field(default_factory=list)
    experience: list[XExperience] = Field(default_factory=list)
    education: list[XEducation] = Field(default_factory=list)
    projects: list[XProject] = Field(default_factory=list)
    skills: list[XSkill] = Field(default_factory=list)
    languages: list[XLanguage] = Field(default_factory=list)
    interests: list[XInterest] = Field(default_factory=list)
    awards: list[XAward] = Field(default_factory=list)
    certifications: list[XCertification] = Field(default_factory=list)
    publications: list[XPublication] = Field(default_factory=list)
    volunteer: list[XVolunteer] = Field(default_factory=list)
    references: list[XReference] = Field(default_factory=list)


def strict_json_schema() -> dict[str, Any]:
    """JSON schema for strict structured outputs: refs inlined, every property required, no extra keys."""
    schema = ExtractedResume.model_json_schema()
    defs = schema.pop("$defs", {})

    def walk(node: Any) -> Any:
        if isinstance(node, list):
            return [walk(n) for n in node]
        if not isinstance(node, dict):
            return node
        if "$ref" in node:
            return walk(defs[node["$ref"].split("/")[-1]])
        out = {k: walk(v) for k, v in node.items() if k not in ("default", "title", "properties")}
        if "properties" in node:
            # Property names like "title" are data here, not schema keywords, so they are kept.
            out["properties"] = {name: walk(prop) for name, prop in node["properties"].items()}
        if out.get("type") == "object" and "properties" in out:
            out["required"] = list(out["properties"])
            out["additionalProperties"] = False
        return out

    return walk(schema)
