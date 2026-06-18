from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, create_refresh_token
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import LoginOut, LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth import authenticate_user, refresh_tokens, register_user

router = APIRouter(prefix="/auth", tags=["auth"])

_ACCESS_COOKIE_MAX_AGE = settings.access_token_expire_minutes * 60
_REFRESH_COOKIE_MAX_AGE = settings.refresh_token_expire_days * 24 * 60 * 60
_COOKIE_KWARGS = {
    "httponly": True,
    "samesite": "none",
    "secure": True,
}


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie("access_token", access_token, max_age=_ACCESS_COOKIE_MAX_AGE, **_COOKIE_KWARGS)
    response.set_cookie("refresh_token", refresh_token, max_age=_REFRESH_COOKIE_MAX_AGE, **_COOKIE_KWARGS)


@router.post("/register", response_model=LoginOut, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        user = await register_user(body.email, body.password, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    return {**user.__dict__, "access_token": access_token}


@router.post("/login", response_model=LoginOut)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        user = await authenticate_user(body.email, body.password, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    return {**user.__dict__, "access_token": access_token}


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        new_access, new_refresh = await refresh_tokens(refresh_token, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    _set_auth_cookies(response, new_access, new_refresh)
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
