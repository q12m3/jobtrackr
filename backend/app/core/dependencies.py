from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.models import User
from app.db.session import get_db


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )
    if not access_token and authorization and authorization.startswith("Bearer "):
        access_token = authorization[7:]
    if not access_token:
        raise credentials_exception

    try:
        user_id = decode_token(access_token, "access")
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    return user


async def require_pro(current_user: User = Depends(get_current_user)) -> User:
    from datetime import datetime, timezone

    is_pro = current_user.plan in ("pro", "enterprise")
    trial_active = (
        current_user.trial_ends_at is not None
        and current_user.trial_ends_at > datetime.now(timezone.utc)
    )
    if not is_pro and not trial_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro plan required",
        )
    return current_user
