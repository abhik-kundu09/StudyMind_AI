# backend/app/tasks/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "studymind",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.pdf_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Retry failed tasks once after 60s
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)