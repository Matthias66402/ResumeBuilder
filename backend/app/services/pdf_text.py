import pymupdf


class PdfError(ValueError):
    """The upload isn't a readable PDF or has no text layer."""


def extract_text(content: bytes) -> str:
    try:
        doc = pymupdf.open(stream=content, filetype="pdf")
    except Exception as exc:  # pymupdf raises several internal error types for broken files
        raise PdfError("Die Datei konnte nicht als PDF gelesen werden.") from exc

    with doc:
        # sort=True orders blocks top-to-bottom, left-to-right, which keeps multi-column layouts readable.
        pages = [page.get_text("text", sort=True).strip() for page in doc]

    text = "\n\n".join(p for p in pages if p)
    if not text.strip():
        raise PdfError("Das PDF enthält keinen Text (vermutlich ein Scan). OCR wird noch nicht unterstützt.")
    return text
