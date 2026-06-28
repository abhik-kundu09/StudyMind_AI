# backend/app/tasks/pdf_tasks.py
import asyncio
from datetime import datetime, timezone
from celery import Task

from app.tasks.celery_app import celery_app
from app.services.pdf_service import pdf_service
from app.ai.vector_store import faiss_manager
from langchain_core.documents import Document



def _run(coro):
    """Run an async coroutine from sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def process_pdf(self: Task, doc_id: str, user_id: str, filename: str, file_bytes_hex: str):
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings

    async def _process():
        # Create a fresh Motor connection — Celery has no FastAPI lifespan
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_DB_NAME]
        docs_col = db["documents"]

        await docs_col.update_one(
            {"_id": doc_id},
            {"$set": {"status": "processing"}},
        )

        try:
            file_bytes = bytes.fromhex(file_bytes_hex)
            pages, page_count = pdf_service.extract_text(file_bytes)
            chunks = pdf_service.chunk_pages(pages, doc_id, filename)

            documents = [
                Document(page_content=c["text"], metadata=c["metadata"])
                for c in chunks
            ]
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: faiss_manager.add_documents(user_id, documents),
            )

            await docs_col.update_one(
                {"_id": doc_id},
                {
                    "$set": {
                        "status": "ready",
                        "page_count": page_count,
                        "chunk_count": len(chunks),
                        "processed_at": datetime.now(timezone.utc),
                    }
                },
            )

        except Exception as exc:
            await docs_col.update_one(
                {"_id": doc_id},
                {"$set": {"status": "failed", "error_message": str(exc)}},
            )
            raise self.retry(exc=exc)

        finally:
            client.close()

    _run(_process())