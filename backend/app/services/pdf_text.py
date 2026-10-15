import pymupdf


class PdfError(ValueError):
    """The upload isn't a readable PDF or has no text layer."""


def extract_text(content: bytes) -> str:
    try:
        doc = pymupdf.open(stream=content, filetype="pdf")
    except Exception as exc:  # pymupdf raises several internal error types for broken files
        raise PdfError("Die Datei konnte nicht als PDF gelesen werden.") from exc

    with doc:
        # Content-stream order keeps each column of a multi-column layout together (e.g. sidebar, then main column);
        # sort=True would interleave the columns line by line and glue words of neighbouring columns together.
        pages = [page.get_text("text").strip() for page in doc]
        links = _web_links(doc)

    text = "\n\n".join(p for p in pages if p)
    if not text.strip():
        raise PdfError("Das PDF enthält keinen Text (vermutlich ein Scan). OCR wird noch nicht unterstützt.")
    if links:
        # Profile and project links are often only clickable text ("LinkedIn: Max"), so their URLs aren't in the text.
        text += "\n\nLinks (hyperlinks in the PDF, link text → URL):\n" + "\n".join(links)
    return text


def _web_links(doc: pymupdf.Document) -> list[str]:
    lines: list[str] = []
    for page in doc:
        for link in page.get_links():
            uri = link.get("uri") or ""
            # mailto:/tel: duplicate the e-mail and phone that are already in the text.
            if not uri.lower().startswith(("http://", "https://")):
                continue
            label = " ".join(page.get_textbox(link["from"]).split())
            line = f"- {label} → {uri}" if label else f"- {uri}"
            if line not in lines:
                lines.append(line)
    return lines
