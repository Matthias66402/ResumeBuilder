"""Turns the LLM extraction into valid Reactive Resume data.

Port of the relevant steps of reactive-resume/packages/ai/src/resume/sanitize.ts: start from defaults, add ids,
drop draft items without their required field, and write the legacy `period`/`date` text from structured dates.
"""

import re

from app.schemas import extraction as x
from app.schemas.resume import (
    AwardItem,
    CertificationItem,
    EducationItem,
    ExperienceItem,
    InterestItem,
    ItemWebsite,
    LanguageItem,
    ProfileItem,
    ProjectItem,
    PublicationItem,
    ReferenceItem,
    ResumeData,
    ResumeDates,
    RoleItem,
    SkillItem,
    VolunteerItem,
    Website,
)

LOCALES = {"de": "de-DE", "en": "en-US"}
MONTHS = {
    "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "de": ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."],
}
PRESENT = {"en": "Present", "de": "Heute"}
URL_SCHEME_RE = re.compile(r"^[a-z][a-z0-9+.-]*://", re.IGNORECASE)

# Phosphor logo per network, as the builder assigns them (frontend/src/lib/icons.ts).
NETWORK_ICONS = {
    "linkedin": "linkedin-logo",
    "github": "github-logo",
    "gitlab": "gitlab-logo",
    "x": "x-logo",
    "twitter": "twitter-logo",
    "instagram": "instagram-logo",
    "facebook": "facebook-logo",
    "youtube": "youtube-logo",
    "stackoverflow": "stack-overflow-logo",
    "medium": "medium-logo",
    "dribbble": "dribbble-logo",
    "behance": "behance-logo",
    "mastodon": "mastodon-logo",
    "threads": "threads-logo",
    "tiktok": "tiktok-logo",
    "reddit": "reddit-logo",
    "discord": "discord-logo",
    "telegram": "telegram-logo",
    "whatsapp": "whatsapp-logo",
    "codepen": "codepen-logo",
    "figma": "figma-logo",
}


def network_icon(network: str) -> str:
    key = re.sub(r"[^a-z]", "", network.lower())
    return NETWORK_ICONS.get(key, "globe") if key else ""


def to_dates(d: x.XDates) -> ResumeDates:
    dates = ResumeDates(start=d.start, end=d.end, present=d.present)
    # Keep the original text when it couldn't be read exactly, as Reactive Resume does.
    if dates.start is None and d.text.strip():
        dates.raw = d.text.strip()
    return dates


def format_dates(dates: ResumeDates, lang: str) -> str:
    """Prints dates like Reactive Resume's short format: "Mar 2022 – Present", "2014 – 2018"."""
    if dates.raw is not None:
        return dates.raw

    def ym(value: str | None) -> str:
        if not value:
            return ""
        year, _, month = value.partition("-")
        return f"{MONTHS[lang][int(month) - 1]} {year}" if month else year

    start = ym(dates.start)
    end = PRESENT[lang] if dates.present else ym(dates.end)
    return f"{start} – {end}" if start and end else start or end


def to_url(url: str) -> str:
    url = url.strip()
    if url and not URL_SCHEME_RE.match(url):
        url = "https://" + url.lstrip("/")
    return url


def to_website(url: str) -> ItemWebsite:
    return ItemWebsite(url=to_url(url))


def sanitize(ex: x.ExtractedResume) -> ResumeData:
    lang = ex.language.lower()[:2] if ex.language.lower()[:2] in LOCALES else "en"

    def dated(d: x.XDates) -> tuple[ResumeDates, str]:
        dates = to_dates(d)
        return dates, format_dates(dates, lang)

    data = ResumeData()
    data.metadata.page.locale = LOCALES[lang]
    # Imported resumes show section heading icons; Reactive Resume's own default hides them.
    data.metadata.page.hide_section_icons = False

    b = ex.basics
    data.basics.name = b.name.strip()
    data.basics.headline = b.headline.strip()
    data.basics.email = b.email.strip()
    data.basics.phone = b.phone.strip()
    data.basics.location = b.location.strip()
    data.basics.website = Website(url=to_url(b.website.url), label=b.website.label.strip())
    data.summary.content = ex.summary.strip()

    s = data.sections
    # Each comprehension drops items whose required field is empty (drafts in Reactive Resume).
    s.profiles.items = [
        ProfileItem(icon=network_icon(p.network), network=p.network, username=p.username, website=to_website(p.url))
        for p in ex.profiles
        if p.network.strip()
    ]

    for e in ex.experience:
        if not e.company.strip():
            continue
        dates, period = dated(e.dates)
        roles = []
        for r in e.roles:
            if not r.position.strip():
                continue
            r_dates, r_period = dated(r.dates)
            roles.append(RoleItem(position=r.position, dates=r_dates, period=r_period, description=r.description))
        s.experience.items.append(
            ExperienceItem(
                company=e.company,
                position=e.position,
                location=e.location,
                dates=dates,
                period=period,
                website=to_website(e.url),
                description=e.description,
                roles=roles,
            )
        )

    for ed in ex.education:
        if not ed.school.strip():
            continue
        dates, period = dated(ed.dates)
        s.education.items.append(
            EducationItem(
                school=ed.school,
                degree=ed.degree,
                area=ed.area,
                grade=ed.grade,
                location=ed.location,
                dates=dates,
                period=period,
                website=to_website(ed.url),
                description=ed.description,
            )
        )

    for p in ex.projects:
        if not p.name.strip():
            continue
        dates, period = dated(p.dates)
        s.projects.items.append(
            ProjectItem(name=p.name, dates=dates, period=period, website=to_website(p.url), description=p.description)
        )

    s.skills.items = [
        SkillItem(name=sk.name, proficiency=sk.proficiency, keywords=[k for k in sk.keywords if k.strip()])
        for sk in ex.skills
        if sk.name.strip()
    ]
    s.languages.items = [
        LanguageItem(language=lg.language, fluency=lg.fluency) for lg in ex.languages if lg.language.strip()
    ]
    s.interests.items = [
        InterestItem(name=i.name, keywords=[k for k in i.keywords if k.strip()]) for i in ex.interests if i.name.strip()
    ]

    for a in ex.awards:
        if not a.title.strip():
            continue
        dates, date = dated(a.dates)
        s.awards.items.append(
            AwardItem(
                title=a.title,
                awarder=a.awarder,
                dates=dates,
                date=date,
                website=to_website(a.url),
                description=a.description,
            )
        )

    for c in ex.certifications:
        if not c.title.strip():
            continue
        dates, date = dated(c.dates)
        s.certifications.items.append(
            CertificationItem(
                title=c.title,
                issuer=c.issuer,
                dates=dates,
                date=date,
                website=to_website(c.url),
                description=c.description,
            )
        )

    for pub in ex.publications:
        if not pub.title.strip():
            continue
        dates, date = dated(pub.dates)
        s.publications.items.append(
            PublicationItem(
                title=pub.title,
                publisher=pub.publisher,
                dates=dates,
                date=date,
                website=to_website(pub.url),
                description=pub.description,
            )
        )

    for v in ex.volunteer:
        if not v.organization.strip():
            continue
        dates, period = dated(v.dates)
        s.volunteer.items.append(
            VolunteerItem(
                organization=v.organization,
                location=v.location,
                dates=dates,
                period=period,
                website=to_website(v.url),
                description=v.description,
            )
        )

    s.references.items = [
        ReferenceItem(
            name=r.name, position=r.position, phone=r.phone, website=to_website(r.url), description=r.description
        )
        for r in ex.references
        if r.name.strip()
    ]

    # Round-trip through validation so the result is exactly what the schema accepts.
    return ResumeData.model_validate(data.model_dump())
