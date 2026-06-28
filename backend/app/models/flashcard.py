from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId


class FlashcardModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    doc_id: str
    doc_name: str

    front: str           # question / term
    back: str            # answer / definition

    # SM-2 fields
    easiness: float = 2.5       # EF — starts at 2.5
    interval: int = 0           # days until next review
    repetitions: int = 0        # successful reviews in a row
    next_review: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_reviewed: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class FlashcardDeck(BaseModel):
    """Grouped view of flashcards for a document."""
    doc_id: str
    doc_name: str
    total: int
    due: int
    cards: list[FlashcardModel]