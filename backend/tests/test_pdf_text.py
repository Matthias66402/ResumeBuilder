import pymupdf

from app.services.pdf_text import attach_resume_data, extract_text, read_resume_data


def test_hyperlinks_are_appended_with_their_link_text():
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), "LinkedIn\nMax")
    page.insert_text((72, 120), "max@example.com")
    # The username "Max" links to the profile; the e-mail link must not be repeated.
    page.insert_link({"kind": pymupdf.LINK_URI, "from": pymupdf.Rect(70, 80, 100, 92), "uri": "https://linkedin.com/in/max"})
    page.insert_link({"kind": pymupdf.LINK_URI, "from": pymupdf.Rect(70, 110, 180, 124), "uri": "mailto:max@example.com"})

    text = extract_text(doc.tobytes())

    assert text.endswith("Links (hyperlinks in the PDF, link text → URL):\n- Max → https://linkedin.com/in/max")
    assert "mailto:" not in text


def test_pdf_without_links_has_no_links_list():
    doc = pymupdf.open()
    doc.new_page().insert_text((72, 72), "Max Mustermann")

    assert "Links (" not in extract_text(doc.tobytes())


def test_columns_are_read_one_after_the_other_with_row_parts_together():
    doc = pymupdf.open()
    page = doc.new_page()  # A4 portrait, 595 pt wide
    # Written in the order Chromium uses: sidebar, main column, then the right-aligned dates and locations.
    for i, skill in enumerate(["Skills", "PHP", "Python", "Docker"]):
        page.insert_text((30, 100 + 14 * i), skill)
    page.insert_text((200, 100), "ACME GmbH")
    page.insert_text((200, 114), "Entwickler")
    for i in range(4):
        page.insert_text((200, 128 + 14 * i), "Lange Beschreibung der Aufgaben, die fast bis zum Rand reicht.")
    page.insert_text((200, 200), "Beta AG")
    page.insert_text((200, 214), "Praktikant")
    for y, text in [(100, "03/2020 - Heute"), (114, "Berlin"), (200, "01/2019 - 02/2020"), (214, "Hamburg")]:
        page.insert_text((560 - pymupdf.get_text_length(text, fontsize=11), y), text)

    lines = extract_text(doc.tobytes()).splitlines()

    assert lines[:4] == ["Skills", "PHP", "Python", "Docker"]
    assert lines[4:6] == ["ACME GmbH | 03/2020 - Heute", "Entwickler | Berlin"]
    assert lines[-2:] == ["Beta AG | 01/2019 - 02/2020", "Praktikant | Hamburg"]


def test_full_width_lines_are_not_split_into_columns():
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Max Mustermann")
    page.insert_text((72, 100), "ACME GmbH")
    page.insert_text((450, 100), "03/2020 - Heute")
    page.insert_text((72, 114), "Beschreibung der Aufgaben über die ganze Breite der Seite hinweg.")

    assert extract_text(doc.tobytes()).splitlines() == [
        "Max Mustermann",
        "ACME GmbH | 03/2020 - Heute",
        "Beschreibung der Aufgaben über die ganze Breite der Seite hinweg.",
    ]


def test_attached_resume_data_round_trips():
    doc = pymupdf.open()
    doc.new_page().insert_text((72, 72), "Max Mustermann")
    pdf = attach_resume_data(doc.tobytes(), {"basics": {"name": "Max Mustermann"}})

    assert read_resume_data(pdf) == {"basics": {"name": "Max Mustermann"}}
    assert extract_text(pdf).startswith("Max Mustermann")
    assert read_resume_data(doc.tobytes()) is None
