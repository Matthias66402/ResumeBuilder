from app.schemas.extraction import ExtractedResume, strict_json_schema
from app.schemas.resume import ResumeData, ResumeDates
from app.services.sanitize import format_dates, sanitize


def extracted(**kwargs) -> ExtractedResume:
    return ExtractedResume.model_validate(kwargs)


def test_empty_extraction_gives_reactive_resume_defaults():
    data = sanitize(extracted()).model_dump(mode="json")
    assert set(data) == {"picture", "basics", "summary", "sections", "customSections", "metadata"}
    assert data["sections"]["experience"]["icon"] == "briefcase"
    assert data["sections"]["skills"]["keywordLayout"] == "inline"
    assert data["metadata"]["template"] == "onyx"
    assert data["metadata"]["page"]["hideSectionIcons"] is False


def test_drops_items_without_required_field_and_assigns_ids():
    data = sanitize(
        extracted(
            experience=[{"company": "ACME", "position": "Dev"}, {"company": " ", "position": "Ghost"}],
            skills=[{"name": "Python", "keywords": ["FastAPI", ""]}, {"name": ""}],
        )
    )
    items = data.sections.experience.items
    assert [i.company for i in items] == ["ACME"]
    assert len(items[0].id) == 36 and items[0].hidden is False
    assert data.sections.skills.items[0].keywords == ["FastAPI"]
    assert len(data.sections.skills.items) == 1


def test_dates_are_structured_and_period_text_is_written():
    data = sanitize(
        extracted(
            language="de",
            experience=[
                {"company": "ACME", "dates": {"start": "2020-03", "end": None, "present": True, "text": "03/2020 - heute"}}
            ],
            education=[{"school": "TU", "dates": {"start": "Sommer 2016", "text": "Sommer 2016"}}],
        )
    )
    exp = data.sections.experience.items[0]
    assert exp.dates.start == "2020-03" and exp.dates.present
    assert exp.period == "März 2020 – Heute"
    edu = data.sections.education.items[0]
    assert edu.dates.start is None and edu.dates.raw == "Sommer 2016"
    assert edu.period == "Sommer 2016"
    assert data.metadata.page.locale == "de-DE"


def test_date_texts_are_read_when_the_llm_leaves_dates_empty():
    texts = {
        "03/2019 – Heute": ResumeDates(start="2019-03", present=True),
        "04/2012 – 04/2014": ResumeDates(start="2012-04", end="2014-04"),
        "2014 - 2018": ResumeDates(start="2014", end="2018"),
        "März 2020 bis heute": ResumeDates(start="2020-03", present=True),
        "Oct. 2019 to Present": ResumeDates(start="2019-10", present=True),
        "2019-03": ResumeDates(start="2019-03"),
        "03.2019-05.2020": ResumeDates(start="2019-03", end="2020-05"),
    }
    data = sanitize(extracted(language="de", experience=[{"company": t, "dates": {"text": t}} for t in texts]))
    assert [i.dates for i in data.sections.experience.items] == list(texts.values())
    assert data.sections.experience.items[0].period == "März 2019 – Heute"


def test_unreadable_date_texts_stay_raw():
    for text in ("Sommer 2016", "13/2019 – Heute", "seit 2019", "2019 – irgendwann"):
        data = sanitize(extracted(education=[{"school": "TU", "dates": {"text": text}}]))
        assert data.sections.education.items[0].dates.raw == text, text


def test_raw_is_omitted_when_absent():
    dumped = ResumeDates(start="2014", end="2018").model_dump()
    assert dumped == {"start": "2014", "end": "2018", "present": False}
    assert format_dates(ResumeDates(start="2014", end="2018"), "en") == "2014 – 2018"


def test_urls_get_a_scheme():
    data = sanitize(extracted(profiles=[{"network": "GitHub", "username": "max", "url": "github.com/max"}]))
    assert data.sections.profiles.items[0].website.url == "https://github.com/max"


def test_profiles_get_their_network_logo():
    data = sanitize(extracted(profiles=[{"network": "LinkedIn"}, {"network": "Stack Overflow"}, {"network": "Xing"}]))
    assert [p.icon for p in data.sections.profiles.items] == ["linkedin-logo", "stack-overflow-logo", "globe"]


def test_output_round_trips_with_camel_case_keys():
    dumped = sanitize(extracted(basics={"name": "Max"})).model_dump(mode="json")
    assert "customFields" in dumped["basics"] and "showHeading" in dumped["summary"]
    assert ResumeData.model_validate(dumped).basics.name == "Max"


def test_strict_schema_requires_all_properties_and_keeps_title_fields():
    schema = strict_json_schema()
    assert "$defs" not in schema and schema["additionalProperties"] is False
    award = schema["properties"]["awards"]["items"]
    assert "title" in award["properties"] and set(award["required"]) == set(award["properties"])
