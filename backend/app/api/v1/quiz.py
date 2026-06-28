"""
Quiz API endpoints with rate limiting.
Generate: 10/minute. All read/submit endpoints: 60/minute.
"""
from datetime import datetime, timezone
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.database.mongodb import get_database
from app.models.quiz import Quiz, QuizStatus
from app.models.user import UserModel
from app.schemas.quiz import (
    AttemptHistoryItem,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizListItem,
    QuizPublic,
    QuizPublicQuestion,
    QuizResult,
    QuizResultAnswer,
    QuizStatusResponse,
    QuizSubmitRequest,
)
from app.services.quiz_service import QuizGenerationError, generate_quiz, grade_attempt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quiz", tags=["quiz"])


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")


@router.post("/generate", response_model=QuizGenerateResponse)
@limiter.limit("10/minute")
async def generate_quiz_endpoint(
    request: Request,
    payload: QuizGenerateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = str(current_user.id)

    document = await db.documents.find_one({"_id": payload.doc_id, "user_id": user_id})
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.get("status") != "ready":
        raise HTTPException(
            status_code=409,
            detail=f"Document is not ready yet (status: {document.get('status')})",
        )

    placeholder = Quiz(
        user_id=user_id,
        doc_id=payload.doc_id,
        title=document.get("filename", "Untitled Quiz"),
        status=QuizStatus.GENERATING,
        difficulty=payload.difficulty,
        question_count=payload.question_count,
        questions=[],
    )
    insert_result = await db.quizzes.insert_one(
        placeholder.model_dump(by_alias=True, exclude={"id"})
    )
    quiz_id = str(insert_result.inserted_id)

    try:
        generated = await generate_quiz(
            db=db,
            user_id=user_id,
            doc_id=payload.doc_id,
            question_count=payload.question_count,
            difficulty=payload.difficulty,
        )
        generated.title = document.get("filename", "Untitled Quiz")
        await db.quizzes.update_one(
            {"_id": ObjectId(quiz_id)},
            {
                "$set": {
                    "status": QuizStatus.READY.value,
                    "title": generated.title,
                    "questions": [q.model_dump() for q in generated.questions],
                    "question_count": len(generated.questions),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        return QuizGenerateResponse(quiz_id=quiz_id, status=QuizStatus.READY)

    except QuizGenerationError as e:
        await db.quizzes.update_one(
            {"_id": ObjectId(quiz_id)},
            {
                "$set": {
                    "status": QuizStatus.FAILED.value,
                    "error_message": str(e),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        return QuizGenerateResponse(quiz_id=quiz_id, status=QuizStatus.FAILED)


@router.get("/history", response_model=list[AttemptHistoryItem])
@limiter.limit("60/minute")
async def get_attempt_history(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
    limit: int = 20,
):
    user_id = str(current_user.id)
    cursor = db.attempts.find({"user_id": user_id}).sort("completed_at", -1).limit(limit)
    attempts = await cursor.to_list(length=limit)

    if not attempts:
        return []

    quiz_ids = list({a["quiz_id"] for a in attempts})
    quizzes = await db.quizzes.find(
        {"_id": {"$in": [ObjectId(qid) for qid in quiz_ids]}}
    ).to_list(length=len(quiz_ids))
    title_by_id = {str(q["_id"]): q.get("title", "Untitled Quiz") for q in quizzes}

    return [
        AttemptHistoryItem(
            attempt_id=str(a["_id"]),
            quiz_id=a["quiz_id"],
            quiz_title=title_by_id.get(a["quiz_id"], "Untitled Quiz"),
            score_percent=a["score_percent"],
            completed_at=a["completed_at"],
        )
        for a in attempts
    ]


@router.get("/", response_model=list[QuizListItem])
@limiter.limit("60/minute")
async def list_quizzes(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = str(current_user.id)
    cursor = db.quizzes.find({"user_id": user_id}).sort("created_at", -1)
    quizzes = await cursor.to_list(length=200)

    items: list[QuizListItem] = []
    for q in quizzes:
        quiz_id = str(q["_id"])
        best_attempt = await db.attempts.find_one(
            {"quiz_id": quiz_id, "user_id": user_id},
            sort=[("score_percent", -1)],
        )
        items.append(
            QuizListItem(
                id=quiz_id,
                doc_id=q["doc_id"],
                title=q.get("title", "Untitled Quiz"),
                status=q["status"],
                difficulty=q["difficulty"],
                question_count=q["question_count"],
                created_at=q["created_at"],
                best_score_percent=best_attempt["score_percent"] if best_attempt else None,
            )
        )
    return items


@router.get("/{quiz_id}/status", response_model=QuizStatusResponse)
@limiter.limit("60/minute")
async def get_quiz_status(
    request: Request,
    quiz_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = str(current_user.id)
    quiz = await db.quizzes.find_one({"_id": _oid(quiz_id), "user_id": user_id})
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return QuizStatusResponse(
        quiz_id=quiz_id,
        status=quiz["status"],
        question_count=quiz["question_count"],
        error_message=quiz.get("error_message"),
    )


@router.get("/{quiz_id}", response_model=QuizPublic)
@limiter.limit("60/minute")
async def get_quiz(
    request: Request,
    quiz_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = str(current_user.id)
    quiz = await db.quizzes.find_one({"_id": _oid(quiz_id), "user_id": user_id})
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz["status"] != QuizStatus.READY.value:
        raise HTTPException(status_code=409, detail=f"Quiz is not ready (status: {quiz['status']})")

    return QuizPublic(
        id=str(quiz["_id"]),
        title=quiz["title"],
        difficulty=quiz["difficulty"],
        question_count=quiz["question_count"],
        questions=[
            QuizPublicQuestion(id=q["id"], question_text=q["question_text"], options=q["options"])
            for q in quiz["questions"]
        ],
        created_at=quiz["created_at"],
    )


@router.post("/{quiz_id}/submit", response_model=QuizResult)
@limiter.limit("60/minute")
async def submit_quiz(
    request: Request,
    quiz_id: str,
    payload: QuizSubmitRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = str(current_user.id)
    quiz = await db.quizzes.find_one({"_id": _oid(quiz_id), "user_id": user_id})
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz["status"] != QuizStatus.READY.value:
        raise HTTPException(status_code=409, detail="Quiz is not ready")

    answers_as_dicts = [
        {"question_id": a.question_id, "selected_index": a.selected_index}
        for a in payload.answers
    ]
    score, graded_answers = grade_attempt(quiz, answers_as_dicts)
    total = quiz["question_count"]
    score_percent = round((score / total) * 100, 1) if total > 0 else 0.0

    attempt_doc = {
        "user_id": user_id,
        "quiz_id": quiz_id,
        "doc_id": quiz["doc_id"],
        "answers": [
            {
                "question_id": g["question_id"],
                "selected_index": g["selected_index"],
                "is_correct": g["is_correct"],
            }
            for g in graded_answers
        ],
        "score": score,
        "total_questions": total,
        "score_percent": score_percent,
        "time_taken_seconds": payload.time_taken_seconds,
        "completed_at": datetime.now(timezone.utc),
    }
    insert_result = await db.attempts.insert_one(attempt_doc)

    return QuizResult(
        attempt_id=str(insert_result.inserted_id),
        quiz_id=quiz_id,
        score=score,
        total_questions=total,
        score_percent=score_percent,
        time_taken_seconds=payload.time_taken_seconds,
        answers=[QuizResultAnswer(**g) for g in graded_answers],
        completed_at=attempt_doc["completed_at"],
    )