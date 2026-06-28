#!/bin/bash
# Start Celery worker in background
celery -A app.tasks.celery_app.celery_app worker --loglevel=info --concurrency=1 &

# Start FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 7860