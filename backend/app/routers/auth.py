import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session as DbSession

from app.auth import COOKIE_NAME, current_user, end_session, hash_password, start_session, verify_password
from app.db import get_session
from app.models import Resume, User

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(min_length=8, max_length=200)

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        value = value.strip().lower()
        local, _, domain = value.partition("@")
        if not local or "." not in domain:
            raise ValueError("Bitte eine gültige E-Mail-Adresse angeben.")
        return value


class UserOut(BaseModel):
    id: uuid.UUID
    email: str


@router.post("/register", response_model=UserOut, status_code=201)
def register(credentials: Credentials, response: Response, db: DbSession = Depends(get_session)) -> UserOut:
    if db.scalar(select(User).where(User.email == credentials.email)):
        raise HTTPException(409, "Für diese E-Mail-Adresse gibt es bereits ein Konto.")
    first_account = db.scalar(select(func.count()).select_from(User)) == 0
    user = User(email=credentials.email, password_hash=hash_password(credentials.password))
    db.add(user)
    db.flush()
    if first_account:
        # Resumes imported before accounts existed belong to whoever signs up first.
        db.execute(update(Resume).where(Resume.user_id.is_(None)).values(user_id=user.id))
    db.commit()
    start_session(db, user, response)
    return UserOut(id=user.id, email=user.email)


@router.post("/login", response_model=UserOut)
def login(credentials: Credentials, response: Response, db: DbSession = Depends(get_session)) -> UserOut:
    user = db.scalar(select(User).where(User.email == credentials.email))
    if not verify_password(user.password_hash if user else None, credentials.password) or user is None:
        raise HTTPException(401, "E-Mail oder Passwort ist falsch.")
    start_session(db, user, response)
    return UserOut(id=user.id, email=user.email)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: DbSession = Depends(get_session)) -> None:
    end_session(db, request.cookies.get(COOKIE_NAME), response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut(id=user.id, email=user.email)
