"""
Authentication API routes: register, login, refresh, /me, logout.
Rate limits: 5/minute on register+login, 20/minute on refresh+me+logout.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.database.mongodb import get_database
from app.models.user import UserModel
from app.schemas.auth import Token, UserLogin, UserRegister, UserResponse
from app.services.auth_services import (
    authenticate_user,
    issue_tokens,
    logout_user,
    refresh_access_token,
    register_user,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _user_to_response(user: UserModel) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        created_at=user.created_at.isoformat(),
        last_login=user.last_login.isoformat() if user.last_login else None,
    )


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    payload: UserRegister,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user = await register_user(db, payload)
    access_token, refresh_token = await issue_tokens(db, user)
    _set_refresh_cookie(response, refresh_token)
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    payload: UserLogin,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user = await authenticate_user(db, payload.email, payload.password)
    access_token, refresh_token = await issue_tokens(db, user)
    _set_refresh_cookie(response, refresh_token)
    return Token(access_token=access_token)


@router.post("/refresh", response_model=Token)
@limiter.limit("20/minute")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    refresh_token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    new_access_token, new_refresh_token = await refresh_access_token(db, refresh_token)
    _set_refresh_cookie(response, new_refresh_token)
    return Token(access_token=new_access_token)


@router.get("/me", response_model=UserResponse)
@limiter.limit("20/minute")
async def me(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
):
    return _user_to_response(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
async def logout(
    request: Request,
    response: Response,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    await logout_user(db, str(current_user.id))
    _clear_refresh_cookie(response)
    return None