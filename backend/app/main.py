from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_session
from app.routers import resumes

app = FastAPI(title="ResumeBuilder")

api = APIRouter(prefix="/api")
api.include_router(resumes.router)


@api.get("/health")
def health(session: Session = Depends(get_session)) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(api)

# Serve the built React app (production / Docker). In development Vite serves it and proxies /api.
static_dir = get_settings().static_dir
if static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(404)
        file = (static_dir / path).resolve()
        if path and file.is_file() and file.is_relative_to(static_dir.resolve()):
            return FileResponse(file)
        # Unknown paths go to index.html so client-side routes like /resumes/<id> work on reload.
        return FileResponse(static_dir / "index.html")
