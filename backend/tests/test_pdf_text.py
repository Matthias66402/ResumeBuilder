import pymupdf

from app.services.pdf_text import extract_text


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
