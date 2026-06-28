"""
FastAPI dependencies for authentication.

"""

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_token
from app.database.mongodb import get_database
from app.models.user import UserModel


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
    ) -> UserModel:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    token = credentials.credentials
    payload = decode_token(token, expected_type="access")
    if payload is None:
        raise credentials_exception

    try:
        user_oid = ObjectId(payload.sub)
    except Exception:
        raise credentials_exception

    doc = await db.users.find_one({"_id": user_oid})
    if doc is None:
        raise credentials_exception

    return UserModel(**doc)


async def get_current_user_id(
    current_user: UserModel = Depends(get_current_user),
) -> str:
    """Convenience dependency when only the user's ID string is needed."""
    return str(current_user.id)