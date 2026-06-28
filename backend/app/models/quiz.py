"""
Quiz models — MongoDB document shapes via plain Pydantic (no ODM), Motor used directly in services.

Collections:
  - "quizzes"   : one doc per generated quiz, questions embedded (no join needed at read time)
  - "attempts"  : one doc per user attempt at a quiz (separate collection — needed for
                  independent querying: attempt history, score trends over time for the dashboard)

Design notes:
  - Questions are embedded sub-documents inside Quiz, not a top-level collection. A quiz's
    questions never need to be queried independently of the quiz, so embedding avoids an
    unnecessary join/lookup (same reasoning as why FAISS chunk metadata lives inline).
  - correct_answer is stored on the Quiz document server-side only. The schema layer
    (schemas/quiz.py) is responsible for stripping it before a quiz is sent to the frontend
    for "take quiz" mode — grading happens server-side against this stored value.
  - MVP scope: MCQ only, single source document per quiz.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class QuizDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    MIXED = "mixed"


class QuizStatus(str, Enum):
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


class QuizQuestion(BaseModel):
    """
    Embedded sub-document. `id` is a short uuid4 hex (not a Mongo ObjectId) so the frontend
    can reference a specific question in a submission payload without needing bson on the client.
    """

    id: str = Field(default_factory=lambda: uuid4().hex[:8])
    question_text: str
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0)
    explanation: Optional[str] = None
    source_chunk_id: Optional[str] = None  # traceability back to the FAISS chunk used, if any
    difficulty: QuizDifficulty = QuizDifficulty.MEDIUM

    @field_validator("correct_index")
    @classmethod
    def validate_correct_index_range(cls, v: int, info) -> int:
        options = info.data.get("options")
        if options is not None and v >= len(options):
            raise ValueError(
                f"correct_index {v} out of range for {len(options)} options"
            )
        return v


class Quiz(BaseModel):
    """Top-level document in the 'quizzes' collection."""

    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    doc_id: str  # source document this quiz was generated from
    title: str
    status: QuizStatus = QuizStatus.GENERATING
    difficulty: QuizDifficulty = QuizDifficulty.MEDIUM
    question_count: int = Field(ge=1, le=50)
    questions: list[QuizQuestion] = Field(default_factory=list)
    error_message: Optional[str] = None  # populated if status == FAILED
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    model_config = {
        "populate_by_name": True,
        "json_encoders": {datetime: lambda dt: dt.isoformat()},
    }


class AttemptAnswer(BaseModel):
    question_id: str
    selected_index: int
    is_correct: bool


class QuizAttempt(BaseModel):
    """Top-level document in the 'attempts' collection. One per user attempt at a quiz."""

    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    quiz_id: str
    doc_id: str  # denormalized from Quiz for fast dashboard aggregation (avoid a join)
    answers: list[AttemptAnswer] = Field(default_factory=list)
    score: int = 0  # number correct
    total_questions: int
    score_percent: float = 0.0
    time_taken_seconds: Optional[int] = None
    completed_at: datetime = Field(default_factory=utcnow)

    model_config = {
        "populate_by_name": True,
        "json_encoders": {datetime: lambda dt: dt.isoformat()},
    }