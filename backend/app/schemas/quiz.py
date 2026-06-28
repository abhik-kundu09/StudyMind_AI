"""
Request/response schemas for the quiz API.
question_count clamped to [3, 20] for production.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.quiz import QuizDifficulty, QuizStatus


class QuizGenerateRequest(BaseModel):
    doc_id: str
    question_count: int = Field(default=10, ge=3, le=20)
    difficulty: QuizDifficulty = QuizDifficulty.MEDIUM


class QuizGenerateResponse(BaseModel):
    quiz_id: str
    status: QuizStatus


class QuizStatusResponse(BaseModel):
    quiz_id: str
    status: QuizStatus
    question_count: int
    error_message: Optional[str] = None


class QuizPublicQuestion(BaseModel):
    id: str
    question_text: str
    options: list[str]


class QuizPublic(BaseModel):
    id: str
    title: str
    difficulty: QuizDifficulty
    question_count: int
    questions: list[QuizPublicQuestion]
    created_at: datetime


class QuizSubmitAnswer(BaseModel):
    question_id: str
    selected_index: int = Field(ge=0)


class QuizSubmitRequest(BaseModel):
    answers: list[QuizSubmitAnswer]
    time_taken_seconds: Optional[int] = None


class QuizResultAnswer(BaseModel):
    question_id: str
    question_text: str
    options: list[str]
    correct_index: int
    selected_index: int
    is_correct: bool
    explanation: Optional[str] = None


class QuizResult(BaseModel):
    attempt_id: str
    quiz_id: str
    score: int
    total_questions: int
    score_percent: float
    time_taken_seconds: Optional[int] = None
    answers: list[QuizResultAnswer]
    completed_at: datetime


class QuizListItem(BaseModel):
    id: str
    doc_id: str
    title: str
    status: QuizStatus
    difficulty: QuizDifficulty
    question_count: int
    created_at: datetime
    best_score_percent: Optional[float] = None


class AttemptHistoryItem(BaseModel):
    attempt_id: str
    quiz_id: str
    quiz_title: str
    score_percent: float
    completed_at: datetime