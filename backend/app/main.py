from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.limiter import limiter
from app.database.mongodb import close_mongo_connection, connect_to_mongo
from app.api.v1.auth import router as auth_router
from app.api.v1 import documents, progress, quiz, study_plan
from app.api.v1.chat import router as chat_router
from app.api.v1.flashcards import router as flashcard_router

# Build: v4

ALLOWED_ORIGINS = [
    "https://studymind-ai-ten.vercel.app",
    "http://localhost:5173",
    settings.FRONTEND_ORIGIN,
]


class CORSHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        if request.method == "OPTIONS":
            response = Response(status_code=200)
            if origin in ALLOWED_ORIGINS:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cookie"
                response.headers["Access-Control-Max-Age"] = "600"
            return response

        response = await call_next(request)
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cookie"
        return response


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

# ── Custom CORS middleware (handles HuggingFace proxy stripping) ──────────────
app.add_middleware(CORSHandlerMiddleware)

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
    return {"message": "StudyMind AI API is running", "version": "2.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0"}