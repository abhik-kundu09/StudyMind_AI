"""
Progress models — computed from existing quizzes/attempts/study_plans collections.
No separate MongoDB collection needed; progress_service aggregates on the fly.
"""

from pydantic import BaseModel


class DailyActivity(BaseModel):
    date: str           # "YYYY-MM-DD"
    quizzes: int = 0    # quiz attempts that day
    tasks: int = 0      # study plan tasks completed that day


class ProgressSummary(BaseModel):
    streak_days: int = 0
    total_study_days: int = 0
    quizzes_this_week: int = 0
    tasks_this_week: int = 0
    activity: list[DailyActivity] = []   # last 7 days, oldest first