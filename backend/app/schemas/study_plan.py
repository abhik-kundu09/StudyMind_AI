"""
Study Plan API schemas — request validation and response shaping.

Keeps the API contract separate from the DB model (same pattern as schemas/quiz.py).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.study_plan import (
    ItemStatus,
    PlanGranularity,
    PlanStatus,
    ScheduleItem,
)


# ── Requests ──────────────────────────────────────────────────────────────────

class StudyPlanGenerateRequest(BaseModel):
    """
    Body for POST /study_plan/generate.
    doc_ids are plain strings (documents collection uses plain-string _id — see PROGRESS.md).
    """
    doc_ids: list[str] = Field(min_length=1, max_length=10)
    exam_name: str = Field(min_length=1, max_length=200)
    exam_date: datetime          # ISO-8601; frontend sends UTC
    goal: str = Field(min_length=1, max_length=500)
    daily_hours: float = Field(ge=0.5, le=16.0, default=2.0)

    @field_validator("exam_date")
    @classmethod
    def exam_date_must_be_future(cls, v: datetime) -> datetime:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        # Make v timezone-aware if it isn't (some clients omit Z)
        if v.tzinfo is None:
            from datetime import timezone
            v = v.replace(tzinfo=timezone.utc)
        if v <= now:
            raise ValueError("exam_date must be in the future")
        return v


class ItemStatusUpdateRequest(BaseModel):
    """Body for PATCH /study_plan/{plan_id}/item/{item_index}."""
    status: ItemStatus


class TaskToggleRequest(BaseModel):
    """Body for PATCH /study_plan/{plan_id}/item/{item_index}/task/{task_index}."""
    done: bool


# ── Responses ─────────────────────────────────────────────────────────────────

class StudyPlanPublic(BaseModel):
    """
    Full plan response — all fields including schedule.
    Returned by GET /study_plan/{plan_id} once status == READY.
    """
    id: str
    user_id: str
    doc_ids: list[str]
    doc_titles: list[str]
    exam_name: str
    exam_date: datetime
    goal: str
    daily_hours: float
    granularity: PlanGranularity
    days_until_exam: int
    items: list[ScheduleItem]
    total_tasks: int
    completed_tasks: int
    status: PlanStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class StudyPlanSummary(BaseModel):
    """
    Lightweight response for list endpoints — no items array.
    Used by GET /study_plan/ to avoid sending the full schedule for every plan.
    """
    id: str
    exam_name: str
    exam_date: datetime
    granularity: PlanGranularity
    days_until_exam: int
    total_tasks: int
    completed_tasks: int
    status: PlanStatus
    created_at: datetime


class GenerateResponse(BaseModel):
    """Immediate response from POST /study_plan/generate."""
    plan_id: str
    status: PlanStatus


class StatusResponse(BaseModel):
    """Response from GET /study_plan/{plan_id}/status."""
    plan_id: str
    status: PlanStatus
    error_message: Optional[str] = None