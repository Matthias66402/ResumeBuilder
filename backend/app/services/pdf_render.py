"""Renders a resume to PDF with headless Chromium.

Chromium opens the frontend's print page (/resumes/<id>/print), which renders the same paginated
preview as the builder and sets `window.__RESUME_READY__` once fonts, pictures and pagination are
done. The PDF therefore matches the preview exactly.
"""

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

from app.config import get_settings

READY_TIMEOUT_MS = 20_000


class RenderError(RuntimeError):
    pass


def render_resume_pdf(resume_id: str) -> bytes:
    url = f"{get_settings().pdf_render_base_url.rstrip('/')}/resumes/{resume_id}/print"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                page = browser.new_page()
                page.goto(url, wait_until="networkidle", timeout=READY_TIMEOUT_MS)
                page.wait_for_function("window.__RESUME_READY__ === true", timeout=READY_TIMEOUT_MS)
                # Page size and zero margins come from the page's @page rule (metadata.page.format).
                return page.pdf(prefer_css_page_size=True, print_background=True)
            finally:
                browser.close()
    except PlaywrightError as exc:
        raise RenderError(f"PDF konnte nicht erzeugt werden: {exc}") from exc
