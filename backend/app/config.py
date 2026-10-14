from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    # Reads the project-level .env for local development; in Docker the values come from the environment.
    model_config = SettingsConfigDict(env_file=(PROJECT_DIR / ".env", BACKEND_DIR / ".env"), extra="ignore")

    database_url: str = "postgresql+psycopg://resumebuilder:resumebuilder@localhost:5434/resumebuilder"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    max_upload_mb: int = 10
    # Built React app; served by FastAPI when the directory exists.
    static_dir: Path = PROJECT_DIR / "frontend" / "dist"


@lru_cache
def get_settings() -> Settings:
    return Settings()
