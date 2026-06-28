"""
MongoDB connection management using Motor (async driver).
Provides a single shared AsyncIOMotorClient for the app lifecycle,
plus startup/shutdown hooks and index creation.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


mongodb = MongoDB()


async def connect_to_mongo() -> None:
    """Create the Motor client and verify connectivity. Call on app startup."""
    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URI)
    mongodb.db = mongodb.client[settings.MONGODB_DB_NAME]

    # Verify connection early so startup fails loudly if Mongo is down
    await mongodb.client.admin.command("ping")

    await _ensure_indexes()


async def close_mongo_connection() -> None:
    """Close the Motor client. Call on app shutdown."""
    if mongodb.client is not None:
        mongodb.client.close()


async def _ensure_indexes() -> None:
    """Create required indexes. Safe to call repeatedly (idempotent)."""
    if mongodb.db is None:
        raise RuntimeError("MongoDB not initialized")

    # users
    await mongodb.db.users.create_index("email", unique=True)

    # flashcards — Stage 9
    await mongodb.db.flashcards.create_index([("user_id", 1), ("next_review", 1)])
    await mongodb.db.flashcards.create_index([("user_id", 1), ("doc_id", 1)])


def get_database() -> AsyncIOMotorDatabase:
    """Dependency-style accessor for the database instance."""
    if mongodb.db is None:
        raise RuntimeError("MongoDB connection not initialized")
    return mongodb.db