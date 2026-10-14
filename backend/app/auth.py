"""Accounts and sign-in sessions.

Passwords are hashed with Argon2. A session is a random token in an httpOnly cookie; the database
keeps only its SHA-256, so a leaked database doesn't hand out live sessions.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import delete
from sqlalchemy.orm import Session as DbSession

from app.config import get_settings
from app.db import get_session
from app.models import Session, User

COOKIE_NAME = "rb_session"

_hasher = PasswordHasher()
# Verified when the e-mail is unknown, so a failed sign-in takes the same time either way.
_DUMMY_HASH = _hasher.hash("timing-equalizer")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, InvalidHashError):
        return False


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _as_utc(value: datetime) -> datetime:
    # SQLite (tests) returns naive datetimes; Postgres returns aware ones.
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def start_session(db: DbSession, user: User, response: Response) -> None:
    settings = get_settings()
    token = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(days=settings.session_days)
    db.add(Session(token_hash=_token_hash(token), user_id=user.id, expires_at=expires))
    db.commit()
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings.session_days * 24 * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def end_session(db: DbSession, token: str | None, response: Response) -> None:
    if token:
        db.execute(delete(Session).where(Session.token_hash == _token_hash(token)))
        db.commit()
    response.delete_cookie(COOKIE_NAME, path="/")


def current_user(request: Request, db: DbSession = Depends(get_session)) -> User:
    """Dependency for every protected endpoint: the signed-in user, or 401."""
    token = request.cookies.get(COOKIE_NAME)
    session = db.get(Session, _token_hash(token)) if token else None
    if session is None or _as_utc(session.expires_at) <= datetime.now(UTC):
        raise HTTPException(401, "Bitte anmelden.")
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(401, "Bitte anmelden.")
    return user
