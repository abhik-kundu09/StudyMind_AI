"""
Progress endpoints with rate limiting.
  GET /progress/summary — 60/minute
"""
from fastapi import APIRouter, Depends, Request

from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.models.user import UserModel
from app.services.progress_service import get_progress_summary

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/summary")
@limiter.limit("60/minute")
async def progress_summary(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
):
    return await get_progress_summary(str(current_user.id))