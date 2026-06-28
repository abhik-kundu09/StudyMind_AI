"""
Application configuration using Pydantic Settings.
Loads values from environment variables / .env file.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "StudyMind AI"
    ENVIRONMENT: str = "development"  # development | production
    DEBUG: bool = True

    # --- MongoDB ---
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "studymind"

    # --- JWT / Auth ---
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Cookies ---
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"
    COOKIE_SECURE: bool = False  # set True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"  # "lax" | "strict" | "none"

    # --- CORS ---
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # --- Redis (used in later stages, kept here for config consistency) ---
    REDIS_URL: str = "redis://localhost:6379/0"

    # --- Gemini / AI (used from Stage 3 onward) ---
    GROQ_API_KEY: str 

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — avoids re-reading .env on every call."""
    return Settings()


settings = get_settings()