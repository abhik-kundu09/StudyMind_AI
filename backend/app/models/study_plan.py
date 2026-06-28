"""
Study Plan models — MongoDB document shapes via plain Pydantic (no ODM).

Collections:
  - "study_plans" : one doc per generated plan, schedule items embedded.

Schedule granularity is adaptive based on days until exam:
  - < 1 day  (hours_until_exam < 24)  → HOURLY  — hour-by-hour blocks for tonight
  - 1-45 days                          → DAILY   — one row per day
  - > 45 days                          → WEEKLY  — one row per week

The `granularity` field is stored on the plan so the frontend can render
the correct view without re-deriving it from dates.

ID convention (matches Stage 6 decision):
  - study_plan._id  → real Mongo ObjectId  (same as quizzes/attempts)
  - doc_ids inside  → plain strings        (same as documents._id — never wrap in ObjectId)
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Enums ─────────────────────────────────────────────────────────────────────

class PlanGranularity(str, Enum):
    HOURLY = "hourly"   # < 24 h until exam
    DAILY  = "daily"    # 1–45 days
    WEEKLY = "weekly"   # > 45 days


class PlanStatus(str, Enum):
    GENERATING = "generating"
    READY      = "ready"
    FAILED     = "failed"


class ItemStatus(str, Enum):
    PENDING     = "pending"
    IN_PROGRESS = "in_progress"
    DONE        = "done"


# ── Embedded sub-documents ────────────────────────────────────────────────────

class StudyTask(BaseModel):
    """
    A single actionable task inside a schedule item.
    e.g. "Revise Newton's Laws definitions", "Do 10 practice MCQs on Chapter 3"
    """
    text: str
    done: bool = False


class ScheduleItem(BaseModel):
    """
    One row in the schedule.

    - HOURLY  plan: label = "10:00 PM – 11:00 PM", duration_minutes = 60
    - DAILY   plan: label = "Day 1 — Mon Jun 24",  duration_minutes = total study minutes that day
    - WEEKLY  plan: label = "Week 1 — Jun 24–30",  duration_minutes = total for the week

    `topic` is the headline theme for the slot.
    `tasks` are the concrete sub-tasks within it.
    """
    index: int                        # 0-based position, used by PATCH endpoint
    label: str                        # human-readable time label
    topic: str                        # headline theme
    tasks: list[StudyTask] = Field(default_factory=list)
    duration_minutes: int = Field(ge=5)
    status: ItemStatus = ItemStatus.PENDING


# ── Top-level document ────────────────────────────────────────────────────────

class StudyPlan(BaseModel):
    """Top-level document in the 'study_plans' collection."""

    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str

    # Source documents this plan was generated from (plain strings — doc convention)
    doc_ids: list[str] = Field(min_length=1)
    doc_titles: list[str] = Field(default_factory=list)  # denormalised for display

    # User inputs preserved for regeneration / display
    exam_name: str
    exam_date: datetime          # target exam date/time (UTC)
    goal: str                    # e.g. "Pass with distinction", "Understand core concepts"
    daily_hours: float = Field(ge=0.5, le=16.0, default=2.0)

    # Derived at generation time
    granularity: PlanGranularity
    days_until_exam: int         # snapshot at generation time

    # Schedule
    items: list[ScheduleItem] = Field(default_factory=list)

    # Completion tracking (derived from items, stored for fast dashboard reads)
    total_tasks: int = 0
    completed_tasks: int = 0

    # State
    status: PlanStatus = PlanStatus.GENERATING
    error_message: Optional[str] = None

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    model_config = {
        "populate_by_name": True,
        "json_encoders": {datetime: lambda dt: dt.isoformat()},
    }