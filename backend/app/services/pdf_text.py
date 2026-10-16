import json
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any

import pymupdf

# Name of the resume data attached to exported PDFs (see attach_resume_data), so they import back losslessly.
DATA_ATTACHMENT = "resumebuilder.json"

# Icon fonts (Phosphor) draw glyphs from the Private Use Area; they carry no text.
ICON_GLYPHS = re.compile("[-]")
# Horizontal gaps at least this wide (pt) separate columns; word spacing is narrower.
MIN_GAP = 12
# Parts of a row ("Company | Date") are further apart than this many line heights; justified words are closer.
ROW_PART_GAP = 2.5


class PdfError(ValueError):
    """The upload isn't a readable PDF or has no text layer."""


@dataclass
class _Line:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str


def extract_text(content: bytes) -> str:
    try:
        doc = pymupdf.open(stream=content, filetype="pdf")
    except Exception as exc:  # pymupdf raises several internal error types for broken files
        raise PdfError("Die Datei konnte nicht als PDF gelesen werden.") from exc

    with doc:
        pages = [_page_text(page) for page in doc]
        links = _web_links(doc)

    text = "\n\n".join(p for p in pages if p)
    if not text.strip():
        raise PdfError("Das PDF enthält keinen Text (vermutlich ein Scan). OCR wird noch nicht unterstützt.")
    if links:
        # Profile and project links are often only clickable text ("LinkedIn: Max"), so their URLs aren't in the text.
        text += "\n\nLinks (hyperlinks in the PDF, link text → URL):\n" + "\n".join(links)
    return text


def attach_resume_data(pdf: bytes, data: dict[str, Any]) -> bytes:
    """The PDF with the resume data attached as JSON, which read_resume_data finds again on import."""
    with pymupdf.open(stream=pdf, filetype="pdf") as doc:
        doc.embfile_add(DATA_ATTACHMENT, json.dumps(data).encode(), filename=DATA_ATTACHMENT, desc="ResumeBuilder data")
        return doc.tobytes(garbage=3, deflate=True)


def read_resume_data(content: bytes) -> dict[str, Any] | None:
    """Resume data attached by attach_resume_data, or None (other PDFs, unreadable attachment)."""
    try:
        with pymupdf.open(stream=content, filetype="pdf") as doc:
            if DATA_ATTACHMENT not in doc.embfile_names():
                return None
            data = json.loads(doc.embfile_get(DATA_ATTACHMENT))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _page_text(page: pymupdf.Page) -> str:
    """The page's text in reading order: column by column, each top to bottom, parts of a row on one line.

    The content-stream order isn't the reading order: Chromium, for instance, writes right-aligned dates and
    locations long after the company they belong to. Sorting all lines top to bottom (sort=True) would instead
    interleave the sidebar with the main column, so columns are found first and read one after the other.
    """
    lines = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = ICON_GLYPHS.sub("", "".join(span["text"] for span in line["spans"])).strip()
            if text:
                lines.append(_Line(*line["bbox"], text))

    gutters = _gutters(lines, page.rect.width)
    out: list[str] = []
    band: list[_Line] = []
    for line in sorted(lines, key=lambda l: l.y0):
        if any(line.x0 < start and line.x1 > end for start, end in gutters):
            # A line across the columns (e.g. a full-width header) ends the columns above it.
            out += _columns_text(band, gutters)
            band = []
            out.append(line.text)
        else:
            band.append(line)
    out += _columns_text(band, gutters)
    return "\n".join(out)


def _gutters(lines: list[_Line], width: float) -> list[tuple[float, float]]:
    """x-ranges between text columns: (almost) no line crosses them and the text on their right is left-aligned."""
    coverage = [0] * (int(width) + 1)
    for line in lines:
        for x in range(max(int(line.x0), 0), min(int(line.x1) + 1, len(coverage))):
            coverage[x] += 1
    # A few lines may cross a gutter (a full-width header); justified paragraphs cover any gap inside a column.
    limit = max(2, len(lines) // 20)

    gutters = []
    start = None
    for x in range(int(width * 0.1), int(width * 0.9) + 1):
        if coverage[x] <= limit and x < int(width * 0.9):
            start = x if start is None else start
        elif start is not None:
            if x - start >= MIN_GAP and _is_column([l for l in lines if l.x0 >= x - 1]):
                gutters.append((float(start), float(x)))
            start = None
    return gutters


def _is_column(lines: list[_Line]) -> bool:
    """False for right-aligned dates and locations beside headings, which only look like a column."""
    if len(lines) < 3:
        return False
    left = Counter(round(l.x0 / 3) for l in lines).most_common(1)[0][1]
    right = Counter(round(l.x1 / 3) for l in lines).most_common(1)[0][1]
    return not (right >= 0.8 * len(lines) and left < 0.5 * len(lines))


def _columns_text(lines: list[_Line], gutters: list[tuple[float, float]]) -> list[str]:
    columns: list[list[_Line]] = [[] for _ in range(len(gutters) + 1)]
    for line in lines:
        center = (line.x0 + line.x1) / 2
        columns[sum(center > (start + end) / 2 for start, end in gutters)].append(line)
    return [row for column in columns for row in _rows(column)]


def _rows(lines: list[_Line]) -> list[str]:
    """Lines at the same height joined into one row: words with a space, distant parts with " | "."""
    rows: list[list[_Line]] = []
    for line in sorted(lines, key=lambda l: l.y0):
        if rows and rows[-1][0].y0 <= (line.y0 + line.y1) / 2 <= rows[-1][0].y1:
            rows[-1].append(line)
        else:
            rows.append([line])

    texts = []
    for row in rows:
        row.sort(key=lambda l: l.x0)
        text = row[0].text
        for prev, line in zip(row, row[1:]):
            far = line.x0 - prev.x1 >= ROW_PART_GAP * (prev.y1 - prev.y0)
            text += (" | " if far else " ") + line.text
        texts.append(text)
    return texts


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
