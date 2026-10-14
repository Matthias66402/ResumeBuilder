"""Renders a resume to PDF with headless Chromium.

Chromium opens the frontend's print page (/resumes/<id>/print), which renders the same paginated
preview as the builder and sets `window.__RESUME_READY__` once fonts, pictures and pagination are
done. The PDF therefore matches the preview exactly.
"""

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

from app.auth import COOKIE_NAME
from app.config import get_settings

READY_TIMEOUT_MS = 20_000


class RenderError(RuntimeError):
    pass


def render_resume_pdf(resume_id: str, session_token: str) -> bytes:
    base_url = get_settings().pdf_render_base_url.rstrip("/")
    url = f"{base_url}/resumes/{resume_id}/print"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                # The print page and pictures need the caller's sign-in, like in their own browser.
                context = browser.new_context()
                context.add_cookies([{"name": COOKIE_NAME, "value": session_token, "url": base_url}])
                page = context.new_page()
                page.goto(url, wait_until="networkidle", timeout=READY_TIMEOUT_MS)
                page.wait_for_function("window.__RESUME_READY__ === true", timeout=READY_TIMEOUT_MS)
                # Page size and zero margins come from the page's @page rule (metadata.page.format).
                return page.pdf(prefer_css_page_size=True, print_background=True)
            finally:
                browser.close()
    except PlaywrightError as exc:
        raise RenderError(f"PDF konnte nicht erzeugt werden: {exc}") from exc
