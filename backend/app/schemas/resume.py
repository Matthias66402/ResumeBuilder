"""Pydantic mirror of the Reactive Resume data schema.

Source: reactive-resume/packages/schema/src/resume/data.ts and default.ts.
JSON is serialized with camelCase keys so the stored `data` stays importable into Reactive Resume.
"""

import re
import uuid
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_serializer
from pydantic.alias_generators import to_camel

YEAR_MONTH_RE = re.compile(r"^\d{4}(?:-(?:0[1-9]|1[0-2]))?$")


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, serialize_by_alias=True)


def new_id() -> str:
    return str(uuid.uuid4())


class Website(CamelModel):
    url: str = ""
    label: str = ""


class ItemWebsite(Website):
    inline_link: bool = False


class ResumeDates(CamelModel):
    start: str | None = None
    end: str | None = None
    present: bool = False
    # Original text when it couldn't be read as year/year-month, e.g. "Summer 2016".
    raw: str | None = None

    @field_validator("start", "end", mode="before")
    @classmethod
    def _year_month(cls, value: Any) -> str | None:
        # Mirrors zod's `.catch(null)`: anything that isn't "YYYY" or "YYYY-MM" becomes null.
        return value if isinstance(value, str) and YEAR_MONTH_RE.match(value) else None

    @model_serializer(mode="wrap")
    def _drop_empty_raw(self, handler):
        # `raw` is optional (not nullable) in Reactive Resume, so it must be omitted rather than null.
        data = handler(self)
        if data.get("raw") is None:
            data.pop("raw", None)
        return data


class BaseItem(CamelModel):
    id: str = Field(default_factory=new_id)
    hidden: bool = False


class CustomField(CamelModel):
    id: str = Field(default_factory=new_id)
    icon: str = ""
    text: str = ""
    link: str = ""


class Picture(CamelModel):
    hidden: bool = False
    fit: Literal["cover", "contain"] = "cover"
    url: str = ""
    size: float = 80
    rotation: float = 0
    aspect_ratio: float = 1
    border_radius: float = 0
    border_color: str = "rgba(0, 0, 0, 0.5)"
    border_width: float = 0
    shadow_color: str = "rgba(0, 0, 0, 0.5)"
    shadow_width: float = 0


class Basics(CamelModel):
    name: str = ""
    headline: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    website: Website = Field(default_factory=Website)
    custom_fields: list[CustomField] = Field(default_factory=list)


class SectionBase(CamelModel):
    title: str = ""
    icon: str = ""
    columns: int = Field(default=1, ge=1, le=6)
    hidden: bool = False
    show_heading: bool = True
    keep_together: bool = False
    start_on_new_page: bool = False


class Summary(SectionBase):
    icon: str = "article"
    content: str = ""


# --- Section items -------------------------------------------------------------------------------


class ProfileItem(BaseItem):
    icon: str = ""
    icon_color: str = ""
    network: str = ""
    username: str = ""
    website: ItemWebsite = Field(default_factory=ItemWebsite)


class RoleItem(CamelModel):
    id: str = Field(default_factory=new_id)
    position: str = ""
    period: str = ""
    dates: ResumeDates = Field(default_factory=ResumeDates)
    description: str = ""


class ExperienceItem(BaseItem):
    company: str = ""
    position: str = ""
    location: str = ""
    period: str = ""
    dates: ResumeDates = Field(default_factory=ResumeDates)
    website: ItemWebsite = Field(default_factory=ItemWebsite)
    description: str = ""
    roles: list[RoleItem] = Field(default_factory=list)


class EducationItem(BaseItem):
    school: str = ""
    degree: str = ""
    area: str = ""
    grade: str = ""
    location: str = ""
    period: str = ""
    dates: ResumeDates = Field(default_factory=ResumeDates)
    website: ItemWebsite = Field(default_factory=ItemWebsite)
    description: str = ""


class ProjectItem(BaseItem):
    name: str = ""
    period: str = ""
    dates: ResumeDates = Field(default_factory=ResumeDates)
    website: ItemWebsite = Field(default_factory=ItemWebsite)
    description: str = ""


class SkillItem(BaseItem):
    icon: str = ""
    icon_color: str = ""
    name: str = ""
    proficiency: str = ""
    level: int = Field(default=0, ge=0, le=5)
    keywords: list[str] = Field(default_factory=list)


class LanguageItem(BaseItem):
    language: str = ""
    fluency: str = ""
    level: int = Field(default=0, ge=0, le=5)


class InterestItem(BaseItem):
    icon: str = ""
    icon_color: str = ""
    name: str = ""
    keywords: list[str] = Field(default_factory=list)


class AwardItem(BaseItem):
    title: str = ""
    awarder: str = ""
    date: str = ""
    dates: ResumeDates = Field(default_factory=ResumeDates)
    website: ItemWebsite = Field(default_factory=ItemWebsite)
    description: str = ""


class CertificationItem(BaseItem):
    title: str = ""
    issuer: str = ""
    date: str = ""
    dates: ResumeDates = Field(default_factory=ResumeDates)
    website: ItemWebsite = Field(default_factory=ItemWebsite)
    description: str = ""


class PublicationItem(BaseItem):
    title: str = ""
    publisher: str = ""
    date: str = ""
    dates: ResumeDates = Field(default_factory=ResumeDates)
    website: ItemWebsite = Field(default_factory=ItemWebsite)
    description: str = ""


class VolunteerItem(BaseItem):
    organization: str = ""
    location: str = ""
    period: str = ""
    dates: ResumeDates = Field(default_factory=ResumeDates)
    website: ItemWebsite = Field(default_factory=ItemWebsite)
    description: str = ""


class ReferenceItem(BaseItem):
    name: str = ""
    position: str = ""
    website: ItemWebsite = Field(default_factory=ItemWebsite)
    phone: str = ""
    description: str = ""


# --- Sections ------------------------------------------------------------------------------------

T = TypeVar("T", bound=BaseModel)


class Section(SectionBase, Generic[T]):
    items: list[T] = Field(default_factory=list)


class SkillsSection(Section[SkillItem]):
    layout: Literal["default", "inline"] = "default"
    keyword_layout: Literal["inline", "list"] = "inline"


def _section(cls, icon: str):
    return Field(default_factory=lambda: cls(icon=icon))


class Sections(CamelModel):
    profiles: Section[ProfileItem] = _section(Section[ProfileItem], "messenger-logo")
    experience: Section[ExperienceItem] = _section(Section[ExperienceItem], "briefcase")
    education: Section[EducationItem] = _section(Section[EducationItem], "graduation-cap")
    projects: Section[ProjectItem] = _section(Section[ProjectItem], "code-simple")
    skills: SkillsSection = _section(SkillsSection, "compass-tool")
    languages: Section[LanguageItem] = _section(Section[LanguageItem], "translate")
    interests: Section[InterestItem] = _section(Section[InterestItem], "football")
    awards: Section[AwardItem] = _section(Section[AwardItem], "trophy")
    certifications: Section[CertificationItem] = _section(Section[CertificationItem], "certificate")
    publications: Section[PublicationItem] = _section(Section[PublicationItem], "books")
    volunteer: Section[VolunteerItem] = _section(Section[VolunteerItem], "hand-heart")
    references: Section[ReferenceItem] = _section(Section[ReferenceItem], "phone")


def default_metadata() -> dict[str, Any]:
    # Layout/design are not edited yet, so metadata is kept as an opaque dict with Reactive Resume's defaults.
    return {
        "template": "onyx",
        "layout": {
            "sidebarWidth": 35,
            "pages": [
                {
                    "fullWidth": False,
                    "main": ["profiles", "summary", "education", "experience", "projects", "volunteer", "references"],
                    "sidebar": ["skills", "certifications", "awards", "languages", "interests", "publications"],
                }
            ],
        },
        "page": {
            "gapX": 4,
            "gapY": 6,
            "marginX": 14,
            "marginY": 12,
            "format": "a4",
            "locale": "en-US",
            "dateFormat": "short",
            "hideLinkUnderline": False,
            "hideIcons": False,
            "hideSectionIcons": True,
        },
        "design": {
            "colors": {
                "primary": "rgba(220, 38, 38, 1)",
                "text": "rgba(0, 0, 0, 1)",
                "background": "rgba(255, 255, 255, 1)",
            },
            "level": {"icon": "star", "type": "circle"},
        },
        "typography": {
            "body": {"fontFamily": "IBM Plex Serif", "fontWeights": ["400", "500"], "fontSize": 10, "lineHeight": 1.5},
            "heading": {"fontFamily": "IBM Plex Serif", "fontWeights": ["600"], "fontSize": 14, "lineHeight": 1.5},
        },
        "notes": "",
        "styleRules": [],
    }


class ResumeData(CamelModel):
    model_config = ConfigDict(extra="allow")

    picture: Picture = Field(default_factory=Picture)
    basics: Basics = Field(default_factory=Basics)
    summary: Summary = Field(default_factory=Summary)
    sections: Sections = Field(default_factory=Sections)
    custom_sections: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=default_metadata)
