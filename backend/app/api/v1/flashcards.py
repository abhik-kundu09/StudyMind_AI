from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional

from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.models.user import UserModel
from app.services import flashcard_service

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


class ReviewRequest(BaseModel):
    quality: int  # 0–5


@router.post("/generate/{doc_id}", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def generate_flashcards(
    request: Request,
    doc_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    try:
        cards = await flashcard_service.generate_flashcards(str(current_user.id), doc_id)
        return {"cards": cards, "count": len(cards)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Flashcard generation failed: {str(e)}")


@router.get("/decks")
@limiter.limit("60/minute")
async def get_decks(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
):
    decks = await flashcard_service.get_user_decks(str(current_user.id))
    return {"decks": decks}


@router.get("/due")
@limiter.limit("60/minute")
async def get_due_cards(
    request: Request,
    doc_id: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
):
    cards = await flashcard_service.get_due_cards(str(current_user.id), doc_id)
    return {"cards": cards, "count": len(cards)}


@router.post("/review/{card_id}")
@limiter.limit("60/minute")
async def submit_review(
    request: Request,
    card_id: str,
    body: ReviewRequest,
    current_user: UserModel = Depends(get_current_user),
):
    try:
        updated = await flashcard_service.submit_review(str(current_user.id), card_id, body.quality)
        return {"card": updated}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/deck/{doc_id}")
@limiter.limit("30/minute")
async def delete_deck(
    request: Request,
    doc_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    deleted = await flashcard_service.delete_deck(str(current_user.id), doc_id)
    return {"deleted": deleted}