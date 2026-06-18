from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models import User


async def register_user(email: str, password: str, db: AsyncSession) -> User:
    user = User(
        email=email,
        password_hash=hash_password(password),
        plan="free",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise ValueError("Email already registered")
    return user


async def authenticate_user(email: str, password: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")
    return user


async def refresh_tokens(refresh_token: str, db: AsyncSession) -> tuple[str, str]:
    try:
        user_id = decode_token(refresh_token, "refresh")
    except ValueError:
        raise ValueError("Invalid refresh token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError("User not found")

    return create_access_token(user.id), create_refresh_token(user.id)
