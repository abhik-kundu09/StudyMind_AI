# backend/app/tasks/celery_app.py
from celery import Celery

# Broker is configured lazily via environment variable at worker startup.
# Do NOT import settings here at module level — that triggers a Redis
# connection attempt on every import, which hangs Render's free tier.
celery_app = Celery("studymind")

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


def configure_celery():
    """
    Call this once at worker startup (not at import time).
    In the FastAPI app we never call this — tasks are dispatched
    via .delay() which works without a live broker connection on the
    web process side (fire-and-forget).
    """
    from app.core.config import settings
    celery_app.conf.broker_url = settings.REDIS_URL
    celery_app.conf.result_backend = settings.REDIS_URL
    celery_app.conf.include = ["app.tasks.pdf_tasks"]