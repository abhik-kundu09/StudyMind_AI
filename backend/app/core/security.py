"""
Security utilities: password hashing (bcrypt) and JWT creation/verification.

"""

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

_BCRYPT_ROUNDS = 12


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        # Malformed hash in DB — treat as failed verification, not a crash
        return False


# ---------------------------------------------------------------------------
# JWT token creation
# ---------------------------------------------------------------------------

TokenType = Literal["access", "refresh"]


def _create_token(
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra_claims:
        to_encode.update(extra_claims)

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_access_token(user_id: str, extra_claims: dict[str, Any] | None = None) -> str:
    """Create a short-lived access token (default 30 min)."""
    return _create_token(
        subject=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_claims=extra_claims,
    )


def create_refresh_token(user_id: str, jti: str | None = None) -> str:
    """Create a long-lived refresh token (default 7 days).

    `jti` (JWT ID) can be used as a unique token identifier for rotation
    tracking — caller (auth_service) generates and stores it.
    """
    extra = {"jti": jti} if jti else None
    return _create_token(
        subject=user_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        extra_claims=extra,
    )


# ---------------------------------------------------------------------------
# JWT decoding / verification
# ---------------------------------------------------------------------------


class TokenPayload:
    """Lightweight wrapper around decoded JWT claims."""

    def __init__(self, sub: str, type: TokenType, exp: int, iat: int, jti: str | None = None):
        self.sub = sub
        self.type = type
        self.exp = exp
        self.iat = iat
        self.jti = jti


def decode_token(token: str, expected_type: TokenType | None = None) -> TokenPayload | None:
    """
    Decode and validate a JWT.

    Returns None if the token is invalid, expired, malformed, or
    (when expected_type is provided) of the wrong type.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None

    sub = payload.get("sub")
    token_type = payload.get("type")
    exp = payload.get("exp")
    iat = payload.get("iat")

    if sub is None or token_type is None or exp is None or iat is None:
        return None

    if expected_type is not None and token_type != expected_type:
        return None

    return TokenPayload(sub=sub, type=token_type, exp=exp, iat=iat, jti=payload.get("jti"))