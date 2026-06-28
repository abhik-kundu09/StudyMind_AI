from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.limiter import limiter
from app.database.mongodb import close_mongo_connection, connect_to_mongo
from app.api.v1.auth import router as auth_router
from app.api.v1 import documents, progress, quiz, study_plan
from app.api.v1.chat import router as chat_router
from app.api.v1.flashcards import router as flashcard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(title="StudyMind AI API", version="1.0.0", lifespan=lifespan)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(documents.router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(quiz.router, prefix="/api/v1")
app.include_router(study_plan.router, prefix="/api/v1")
app.include_router(progress.router, prefix="/api/v1")
app.include_router(flashcard_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "StudyMind AI API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}