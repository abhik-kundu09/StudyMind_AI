"""
progress_service.py — Stage 9 update.

Changes from Stage 8:
- Import get_daily_flashcard_counts + get_flashcard_session_count from flashcard_service
- Add flashcard_reviews per day into the activity window
- Replace hardcoded flashcards=0 in summary with real session count
"""

from datetime import datetime, timezone, timedelta
from typing import Any

from app.database.mongodb import get_database
# Import flashcard helpers — these read from the `flashcards` collection
from app.services.flashcard_service import (
    get_daily_flashcard_counts,
    get_flashcard_session_count,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_dt(value: Any) -> datetime:
    """Coerce a Mongo datetime field that may arrive as a native datetime or ISO string."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            pass
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Main aggregation
# ---------------------------------------------------------------------------

async def get_progress_summary(user_id: str) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # ------------------------------------------------------------------ #
    # 1. Pull recent quiz attempts
    # ------------------------------------------------------------------ #
    quiz_by_day: dict[str, int] = {}
    streak_days: set[str] = set()
    total_quizzes = 0

    async for attempt in db["attempts"].find(
        {"user_id": user_id, "completed_at": {"$exists": True}}
    ):
        completed_at = _to_dt(attempt.get("completed_at"))
        day_str = completed_at.strftime("%Y-%m-%d")
        streak_days.add(day_str)
        total_quizzes += 1
        if completed_at >= seven_days_ago:
            quiz_by_day[day_str] = quiz_by_day.get(day_str, 0) + 1

    # ------------------------------------------------------------------ #
    # 2. Pull recent study plan tasks (completed ones indicate study days)
    # ------------------------------------------------------------------ #
    plan_by_day: dict[str, int] = {}

    async for plan in db["study_plans"].find(
        {"user_id": user_id, "tasks": {"$exists": True}}
    ):
        for task in plan.get("tasks", []):
            if task.get("completed"):
                completed_at_raw = task.get("completed_at") or plan.get("created_at")
                if completed_at_raw:
                    completed_at = _to_dt(completed_at_raw)
                    day_str = completed_at.strftime("%Y-%m-%d")
                    streak_days.add(day_str)
                    if completed_at >= seven_days_ago:
                        plan_by_day[day_str] = plan_by_day.get(day_str, 0) + 1

    # ------------------------------------------------------------------ #
    # 3. Flashcard reviews (Stage 9)
    # ------------------------------------------------------------------ #
    flashcard_by_day = await get_daily_flashcard_counts(user_id, days=7)
    for day_str in flashcard_by_day:
        streak_days.add(day_str)

    # Total flashcard session days (all-time)
    all_time_since = datetime.now(timezone.utc) - timedelta(days=3650)
    flashcard_sessions = await get_flashcard_session_count(user_id, since=all_time_since)

    # ------------------------------------------------------------------ #
    # 4. Build 7-day activity array
    # ------------------------------------------------------------------ #
    activity = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        quizzes = quiz_by_day.get(day_str, 0)
        plans = plan_by_day.get(day_str, 0)
        flashcards = flashcard_by_day.get(day_str, 0)
        activity.append({
            "date": day_str,
            "label": day.strftime("%a"),   # Mon, Tue …
            "quizzes": quizzes,
            "study_days": 1 if (quizzes + plans + flashcards) > 0 else 0,
            "flashcards": flashcards,
        })

    # ------------------------------------------------------------------ #
    # 5. Streak calculation — consecutive days with any activity up to today
    # ------------------------------------------------------------------ #
    streak = 0
    check_day = now
    while True:
        ds = check_day.strftime("%Y-%m-%d")
        if ds in streak_days:
            streak += 1
            check_day -= timedelta(days=1)
        else:
            break

    # All-time unique study days
    all_study_days = len(streak_days)

    return {
        "streak": streak,
        "total_quizzes": total_quizzes,
        "study_days": all_study_days,
        "flashcard_sessions": flashcard_sessions,   # was always 0 in Stage 8
        "activity": activity,
    }