"""
Authentication business logic: registration, login, and refresh-token
rotation. Talks to MongoDB via Motor and uses core.security for
hashing/JWT.
"""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import UserModel
from app.schemas.auth import UserRegister


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


async def register_user(db: AsyncIOMotorDatabase, payload: UserRegister) -> UserModel:
    """Create a new user. Raises 409 if email already exists."""

    existing = await db.users.find_one({"email": payload.email})
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = UserModel(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
    )

    doc = user.model_dump(by_alias=True, exclude={"id"})

    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        # Race condition fallback — unique index on email caught it
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user.id = result.inserted_id
    return user


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


async def authenticate_user(
    db: AsyncIOMotorDatabase, email: str, password: str
) -> UserModel:
    """Verify credentials and return the user. Raises 401 on failure."""

    doc = await db.users.find_one({"email": email})
    if doc is None or not verify_password(password, doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    await db.users.update_one(
        {"_id": doc["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}},
    )
    doc["last_login"] = datetime.now(timezone.utc)

    return UserModel(**doc)


# ---------------------------------------------------------------------------
# Token issuance helpers
# ---------------------------------------------------------------------------


async def issue_tokens(db: AsyncIOMotorDatabase, user: UserModel) -> tuple[str, str]:
    """
    Create a new access/refresh token pair, store the refresh token's jti
    on the user document (overwriting any previous one — single active
    session per user for refresh-token purposes).
    """
    user_id = str(user.id)
    jti = str(uuid.uuid4())

    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id, jti=jti)

    await db.users.update_one(
        {"_id": user.id},
        {"$set": {"current_refresh_jti": jti}},
    )

    return access_token, refresh_token


# ---------------------------------------------------------------------------
# Refresh (with rotation)
# ---------------------------------------------------------------------------


async def refresh_access_token(
    db: AsyncIOMotorDatabase, refresh_token: str
) -> tuple[str, str]:
    """
    Validate the refresh token, check it matches the user's currently
    active jti (rotation enforcement), then issue a brand new
    access/refresh pair and invalidate the old refresh token.

    Raises 401 if the token is invalid, expired, of wrong type, or has
    already been rotated/invalidated (reuse detection).
    """
    payload = decode_token(refresh_token, expected_type="refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    from bson import ObjectId

    try:
        user_oid = ObjectId(payload.sub)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    doc = await db.users.find_one({"_id": user_oid})
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    stored_jti = doc.get("current_refresh_jti")
    if stored_jti is None or stored_jti != payload.jti:
        # Token reuse or already-rotated token presented — invalidate session
        await db.users.update_one(
            {"_id": user_oid}, {"$set": {"current_refresh_jti": None}}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been invalidated. Please log in again.",
        )

    user = UserModel(**doc)
    return await issue_tokens(db, user)


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


async def logout_user(db: AsyncIOMotorDatabase, user_id: str) -> None:
    """Invalidate the user's current refresh token jti."""
    from bson import ObjectId

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"current_refresh_jti": None}},
    )