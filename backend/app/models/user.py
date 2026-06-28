"""
User document model for MongoDB.
Uses Pydantic v2 with a custom type for MongoDB's ObjectId.
"""

from datetime import datetime, timezone
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field


def _validate_object_id(v: Any) -> ObjectId:
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError("Invalid ObjectId")


# Pydantic v2 pattern for handling Mongo ObjectIds (replaces v1 custom __get_validators__)
PyObjectId = Annotated[ObjectId, BeforeValidator(_validate_object_id)]


class UserPreferences(BaseModel):
    theme: str = "light"
    study_reminders: bool = True


class UserModel(BaseModel):
    """Represents a user document as stored in MongoDB."""

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )

    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    email: str
    hashed_password: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: datetime | None = None
    preferences: UserPreferences = Field(default_factory=UserPreferences)