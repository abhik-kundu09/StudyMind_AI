"""
Quiz generation service.

Pipeline:
  1. Pull a wide candidate pool of chunks for the given doc_id from the user's FAISS index
     (same wide-pool-then-filter pattern as chat_service.py's RAG fix — NOT get_retriever(),
     which doesn't exist on FAISSManager).
  2. Concatenate chunk text (with chunk ids) into a single context block, capped to a token
     budget so we don't blow the Groq context window on a long document.
  3. Run the LCEL quiz chain (QUIZ_PROMPT | llm).
  4. Parse the strict-JSON response into QuizQuestion objects. Any parse failure marks the
     quiz FAILED with the raw error captured in error_message — never silently returns an
     empty/garbage quiz.
  5. Persist the Quiz document to Mongo.

Uses get_pro_llm() (temp=0.3) from gemini_client.py — explicitly the quality-tuned model
designated for quizzes/study plans, not get_llm() (temp=0.7, chat-tuned).

This runs synchronously inside the request for now (no Celery task yet — quiz generation is
a single LLM call, unlike PDF processing which is genuinely heavy). If generation time becomes
a UX problem, this is the natural place to move to a Celery task mirroring pdf_tasks.py.
"""

import json
import logging
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.gemini_client import get_pro_llm  # temp=0.3, quality-tuned — built for quizzes/study plans
from app.ai.prompts.quiz_prompt import QUIZ_PROMPT
from app.ai.vector_store import faiss_manager  # module-level singleton, NOT FAISSManager()
from app.models.quiz import Quiz, QuizDifficulty, QuizQuestion, QuizStatus, utcnow

logger = logging.getLogger(__name__)

# Rough char budget for context passed to the LLM. Groq's llama-3.3-70b-versatile has a large
# context window, but we cap anyway to keep latency/cost predictable and avoid diluting
# relevance with too many chunks.
MAX_CONTEXT_CHARS = 12_000

# Wide candidate pool before trimming to MAX_CONTEXT_CHARS — same "wide pool then filter"
# principle as the chat RAG fix (k*10, min 40), adapted for quiz generation which wants
# *breadth* across the whole document rather than narrow relevance to one query.
#
# TODO once vector_store.py is patched with filter/fetch_k support (see patch notes):
# switch this call to pass filter={"doc_id": doc_id} and a much larger fetch_k directly,
# instead of over-fetching k=40 and filtering in Python below.
CANDIDATE_POOL_K = 40


class QuizGenerationError(Exception):
    """Raised when the LLM response can't be parsed into valid quiz questions."""


def _build_context_block(chunks: list) -> str:
    """
    chunks: list of LangChain Document objects from FAISSManager.similarity_search()
    (NOT dicts — .page_content for text, .metadata for doc_id/chunk_index/etc).
    Concatenates until MAX_CONTEXT_CHARS is hit.
    """
    parts: list[str] = []
    total_len = 0
    for doc in chunks:
        chunk_id = str(doc.metadata.get("chunk_index", ""))
        text = (doc.page_content or "").strip()
        if not text:
            continue
        block = f"[chunk_id={chunk_id}]\n{text}\n"
        if total_len + len(block) > MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        total_len += len(block)
    return "\n".join(parts)


def _parse_llm_response(raw: str) -> list[dict]:
    """
    Strip accidental markdown fences (models sometimes add them despite instructions) and
    parse strict JSON. Raises QuizGenerationError with the raw response attached for
    debugging if parsing fails — we never silently swallow a bad generation.
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        # Strip ```json ... ``` or ``` ... ``` fences
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise QuizGenerationError(
            f"Failed to parse LLM response as JSON: {e}. Raw response: {raw[:500]}"
        ) from e

    if not isinstance(parsed, list) or len(parsed) == 0:
        raise QuizGenerationError(
            f"Expected non-empty JSON array, got: {type(parsed).__name__}"
        )
    return parsed


async def generate_quiz(
    db: AsyncIOMotorDatabase,
    user_id: str,
    doc_id: str,
    question_count: int,
    difficulty: QuizDifficulty,
) -> Quiz:
    """
    Generates a quiz and persists it. Returns the saved Quiz (status READY or FAILED).
    Caller (API layer) is responsible for inserting the initial GENERATING placeholder
    and updating it — see api/v1/quiz.py.
    """
    # Wide pool, filtered by doc_id — mirrors the chat RAG cross-document-leakage fix.
    # A neutral/broad query string is used since we want document-wide coverage for quiz
    # generation, not relevance to a specific user question.
    # NOTE: similarity_search() is synchronous (plain method, not async) — do not await it.
    raw_results = faiss_manager.similarity_search(
        user_id=user_id,
        query="key concepts, definitions, and important facts in this document",
        k=CANDIDATE_POOL_K,
    )
    chunks = [doc for doc in raw_results if doc.metadata.get("doc_id") == doc_id]

    if not chunks:
        raise QuizGenerationError(
            f"No FAISS chunks found for doc_id={doc_id}. Document may not be processed yet, "
            f"or the user has no FAISS index at all."
        )

    context = _build_context_block(chunks)

    llm = get_pro_llm()
    chain = QUIZ_PROMPT | llm

    response = await chain.ainvoke(
        {
            "question_count": question_count,
            "difficulty": difficulty.value,
            "context": context,
        }
    )
    raw_text = response.content if hasattr(response, "content") else str(response)

    parsed_questions = _parse_llm_response(raw_text)

    questions: list[QuizQuestion] = []
    for q in parsed_questions[:question_count]:
        try:
            questions.append(
                QuizQuestion(
                    question_text=q["question_text"],
                    options=q["options"],
                    correct_index=q["correct_index"],
                    explanation=q.get("explanation"),
                    source_chunk_id=q.get("source_chunk_id"),
                    difficulty=difficulty
                    if difficulty != QuizDifficulty.MIXED
                    else QuizDifficulty.MEDIUM,
                )
            )
        except Exception as e:
            logger.warning("Skipping malformed question from LLM output: %s", e)
            continue

    if not questions:
        raise QuizGenerationError(
            "LLM returned a JSON array but no questions survived validation."
        )

    return Quiz(
        user_id=user_id,
        doc_id=doc_id,
        title="",  # filled by caller from document filename
        status=QuizStatus.READY,
        difficulty=difficulty,
        question_count=len(questions),
        questions=questions,
        updated_at=utcnow(),
    )


async def get_quiz_by_id(
    db: AsyncIOMotorDatabase, quiz_id: str, user_id: str
) -> Optional[dict]:
    return await db.quizzes.find_one({"_id": ObjectId(quiz_id), "user_id": user_id})


def grade_attempt(quiz: dict, answers: list[dict]) -> tuple[int, list[dict]]:
    """
    Grades a submission against the stored quiz. Returns (score, graded_answers).
    Pure function — no DB access — so it's trivially testable.
    """
    question_map = {q["id"]: q for q in quiz["questions"]}
    score = 0
    graded: list[dict] = []

    for ans in answers:
        question = question_map.get(ans["question_id"])
        if question is None:
            continue  # ignore answers referencing unknown/stale question ids
        is_correct = ans["selected_index"] == question["correct_index"]
        if is_correct:
            score += 1
        graded.append(
            {
                "question_id": ans["question_id"],
                "question_text": question["question_text"],
                "options": question["options"],
                "correct_index": question["correct_index"],
                "selected_index": ans["selected_index"],
                "is_correct": is_correct,
                "explanation": question.get("explanation"),
            }
        )

    return score, graded