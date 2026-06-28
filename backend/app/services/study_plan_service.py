"""
Study Plan generation service.

Pipeline:
  1. Determine granularity (HOURLY / DAILY / WEEKLY) from hours_until_exam.
  2. Multi-doc FAISS retrieval: loop over each doc_id, use the new filter/fetch_k kwargs
     (added to FAISSManager.similarity_search() in Stage 6) to pull doc-specific chunks,
     concatenate up to MAX_CONTEXT_CHARS total across all documents.
  3. Select the correct ChatPromptTemplate (hourly/daily/weekly) and run the LCEL chain
     with get_pro_llm() (temp=0.3 — same model used for quiz generation).
  4. Parse the strict-JSON response into ScheduleItem objects. Any parse failure marks the
     plan FAILED — we never silently return a garbage plan.
  5. Compute completion counters, persist to MongoDB.

Runs synchronously inside the request (single LLM call, no Celery). Same design decision
as quiz_service.py — the GENERATING status placeholder means this can be moved to a
BackgroundTask later without an API contract change.

NOTE: similarity_search() is synchronous (plain method, not async) — never await it.
"""

import json
import logging
import math
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.gemini_client import get_pro_llm
from app.ai.prompts.study_plan_prompt import DAILY_PROMPT, HOURLY_PROMPT, WEEKLY_PROMPT
from app.ai.vector_store import faiss_manager
from app.models.study_plan import (
    ItemStatus,
    PlanGranularity,
    PlanStatus,
    ScheduleItem,
    StudyPlan,
    StudyTask,
    utcnow,
)

logger = logging.getLogger(__name__)

# Token budget for context — same cap as quiz_service.py
MAX_CONTEXT_CHARS = 12_000

# Per-doc chunk pool — using filter/fetch_k kwargs (Stage 6 addition to vector_store.py)
# fetch_k is intentionally large so FAISS pulls candidates across the whole document before
# filtering, not just the top-k by cosine distance to the query.
FETCH_K_PER_DOC = 60
K_PER_DOC = 20


class StudyPlanGenerationError(Exception):
    """Raised when generation or parsing fails — never silently swallowed."""


# ── Context building ──────────────────────────────────────────────────────────

def _build_multi_doc_context(user_id: str, doc_ids: list[str]) -> str:
    """
    Retrieve chunks from FAISS for each doc_id using the filter/fetch_k kwargs.
    Interleaves chunks across documents (round-robin) so no single doc dominates the
    context window, then concatenates up to MAX_CONTEXT_CHARS.

    Returns empty string if the user has no FAISS index yet (graceful degradation —
    the LLM will still generate a generic plan from the doc titles / exam info).
    """
    # Per-doc retrieval — broad, document-covering query (same principle as quiz_service.py)
    query = "key concepts, important definitions, main topics, and core principles"

    per_doc_chunks: list[list] = []
    for doc_id in doc_ids:
        chunks = faiss_manager.similarity_search(
            user_id=user_id,
            query=query,
            k=K_PER_DOC,
            filter={"doc_id": doc_id},
            fetch_k=FETCH_K_PER_DOC,
        )
        per_doc_chunks.append(chunks)

    if not any(per_doc_chunks):
        logger.warning(
            "No FAISS chunks found for user_id=%s, doc_ids=%s. "
            "Generating plan from exam metadata only.",
            user_id, doc_ids,
        )
        return ""

    # Round-robin interleave so each doc contributes proportionally
    interleaved: list = []
    max_len = max(len(d) for d in per_doc_chunks)
    for i in range(max_len):
        for doc_chunks in per_doc_chunks:
            if i < len(doc_chunks):
                interleaved.append(doc_chunks[i])

    # Build text block up to budget
    parts: list[str] = []
    total_len = 0
    for chunk in interleaved:
        doc_id = chunk.metadata.get("doc_id", "unknown")
        chunk_idx = str(chunk.metadata.get("chunk_index", ""))
        text = (chunk.page_content or "").strip()
        if not text:
            continue
        block = f"[doc={doc_id} chunk={chunk_idx}]\n{text}\n"
        if total_len + len(block) > MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        total_len += len(block)

    return "\n".join(parts)


# ── LLM response parsing ──────────────────────────────────────────────────────

def _parse_llm_response(raw: str) -> dict:
    """
    Strip accidental markdown fences and parse strict JSON.
    Raises StudyPlanGenerationError on any parse failure.
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise StudyPlanGenerationError(
            f"Failed to parse LLM response as JSON: {e}. Raw (first 500): {raw[:500]}"
        ) from e

    if not isinstance(parsed, dict):
        raise StudyPlanGenerationError(
            f"Expected JSON object, got: {type(parsed).__name__}"
        )
    if "items" not in parsed or not isinstance(parsed["items"], list) or len(parsed["items"]) == 0:
        raise StudyPlanGenerationError(
            "LLM response missing 'items' array or items is empty."
        )
    return parsed


def _items_from_parsed(parsed: dict) -> list[ScheduleItem]:
    """
    Convert the LLM's raw JSON items into validated ScheduleItem objects.
    Skips malformed items with a warning rather than crashing the whole plan.
    """
    items: list[ScheduleItem] = []
    for i, raw_item in enumerate(parsed["items"]):
        try:
            tasks = [
                StudyTask(text=t) if isinstance(t, str) else StudyTask(**t)
                for t in raw_item.get("tasks", [])
            ]
            items.append(
                ScheduleItem(
                    index=raw_item.get("index", i),
                    label=raw_item["label"],
                    topic=raw_item["topic"],
                    tasks=tasks,
                    duration_minutes=int(raw_item.get("duration_minutes", 60)),
                    status=ItemStatus.PENDING,
                )
            )
        except Exception as exc:
            logger.warning("Skipping malformed study plan item at index %d: %s", i, exc)
            continue

    if not items:
        raise StudyPlanGenerationError(
            "LLM returned items array but none survived validation."
        )
    return items


# ── Granularity helpers ───────────────────────────────────────────────────────

def _compute_granularity(hours_until_exam: float) -> PlanGranularity:
    if hours_until_exam < 24:
        return PlanGranularity.HOURLY
    days = hours_until_exam / 24
    if days <= 45:
        return PlanGranularity.DAILY
    return PlanGranularity.WEEKLY


def _format_exam_date(dt: datetime) -> str:
    """Human-readable exam date for prompt injection."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%A, %d %b %Y at %I:%M %p UTC")


def _start_time_label(now: datetime) -> str:
    """'9:00 PM' style label for the hourly plan start."""
    # Round up to the next half-hour for a clean schedule
    minute = now.minute
    if minute < 30:
        start = now.replace(minute=30, second=0, microsecond=0)
    else:
        start = now.replace(minute=0, second=0, microsecond=0)
        start = start.replace(hour=start.hour + 1)
    return start.strftime("%I:%M %p")


# ── Chain runner ──────────────────────────────────────────────────────────────

async def _run_chain(granularity: PlanGranularity, invoke_kwargs: dict) -> dict:
    """Select prompt, build LCEL chain, invoke, parse."""
    prompt_map = {
        PlanGranularity.HOURLY:  HOURLY_PROMPT,
        PlanGranularity.DAILY:   DAILY_PROMPT,
        PlanGranularity.WEEKLY:  WEEKLY_PROMPT,
    }
    prompt = prompt_map[granularity]
    llm = get_pro_llm()
    chain = prompt | llm

    response = await chain.ainvoke(invoke_kwargs)
    raw_text = response.content if hasattr(response, "content") else str(response)
    return _parse_llm_response(raw_text)


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_study_plan(
    db: AsyncIOMotorDatabase,
    user_id: str,
    doc_ids: list[str],
    doc_titles: list[str],
    exam_name: str,
    exam_date: datetime,
    goal: str,
    daily_hours: float,
) -> StudyPlan:
    """
    Generates and persists a study plan. Returns the saved StudyPlan (READY or FAILED).
    The caller (api layer) is responsible for inserting the GENERATING placeholder first
    and updating it — mirrors the quiz generation pattern.
    """
    now = datetime.now(timezone.utc)

    # Ensure exam_date is timezone-aware
    if exam_date.tzinfo is None:
        exam_date = exam_date.replace(tzinfo=timezone.utc)

    hours_until_exam = (exam_date - now).total_seconds() / 3600
    days_until_exam = int(math.ceil(hours_until_exam / 24))
    weeks_until_exam = max(1, int(math.ceil(days_until_exam / 7)))
    granularity = _compute_granularity(hours_until_exam)

    logger.info(
        "Generating %s study plan for user=%s, docs=%s, exam=%s (%.1f h away)",
        granularity.value, user_id, doc_ids, exam_name, hours_until_exam,
    )

    # Multi-doc FAISS retrieval
    context = _build_multi_doc_context(user_id, doc_ids)

    # Build prompt kwargs based on granularity
    if granularity == PlanGranularity.HOURLY:
        available_hours = min(daily_hours, max(1.0, hours_until_exam - 0.5))
        invoke_kwargs = {
            "exam_name": exam_name,
            "exam_datetime": _format_exam_date(exam_date),
            "available_hours": round(available_hours, 1),
            "start_time": _start_time_label(now),
            "goal": goal,
            "context": context or f"Exam: {exam_name}. No document context available.",
        }
    elif granularity == PlanGranularity.DAILY:
        invoke_kwargs = {
            "exam_name": exam_name,
            "exam_date": _format_exam_date(exam_date),
            "days_until_exam": days_until_exam,
            "daily_hours": daily_hours,
            "goal": goal,
            "context": context or f"Exam: {exam_name}. No document context available.",
        }
    else:  # WEEKLY
        invoke_kwargs = {
            "exam_name": exam_name,
            "exam_date": _format_exam_date(exam_date),
            "weeks_until_exam": weeks_until_exam,
            "daily_hours": daily_hours,
            "goal": goal,
            "context": context or f"Exam: {exam_name}. No document context available.",
        }

    parsed = await _run_chain(granularity, invoke_kwargs)
    items = _items_from_parsed(parsed)

    total_tasks = sum(len(item.tasks) for item in items)

    return StudyPlan(
        user_id=user_id,
        doc_ids=doc_ids,
        doc_titles=doc_titles,
        exam_name=exam_name,
        exam_date=exam_date,
        goal=goal,
        daily_hours=daily_hours,
        granularity=granularity,
        days_until_exam=days_until_exam,
        items=items,
        total_tasks=total_tasks,
        completed_tasks=0,
        status=PlanStatus.READY,
        updated_at=utcnow(),
    )


async def get_plan_by_id(
    db: AsyncIOMotorDatabase, plan_id: str, user_id: str
) -> Optional[dict]:
    """Fetch a plan by ObjectId string, scoped to user."""
    try:
        oid = ObjectId(plan_id)
    except Exception:
        return None
    return await db.study_plans.find_one({"_id": oid, "user_id": user_id})


async def list_plans(
    db: AsyncIOMotorDatabase, user_id: str, limit: int = 20
) -> list[dict]:
    """Return summary list of user's plans, newest first, without the items array."""
    cursor = db.study_plans.find(
        {"user_id": user_id},
        # Exclude items array for list view — it can be large
        {"items": 0},
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def update_item_status(
    db: AsyncIOMotorDatabase,
    plan_id: str,
    user_id: str,
    item_index: int,
    new_status: ItemStatus,
) -> bool:
    """
    Update the status of a single ScheduleItem. Returns True if the update matched.
    Also recomputes completed_tasks counter on the plan.
    """
    try:
        oid = ObjectId(plan_id)
    except Exception:
        return False

    result = await db.study_plans.update_one(
        {"_id": oid, "user_id": user_id},
        {
            "$set": {
                f"items.{item_index}.status": new_status.value,
                "updated_at": utcnow().isoformat(),
            }
        },
    )
    if result.matched_count == 0:
        return False

    # Recompute completed_tasks from the authoritative items array
    await _sync_completion_counters(db, oid, user_id)
    return True


async def toggle_task_done(
    db: AsyncIOMotorDatabase,
    plan_id: str,
    user_id: str,
    item_index: int,
    task_index: int,
    done: bool,
) -> bool:
    """Toggle a single task's done state. Returns True if matched."""
    try:
        oid = ObjectId(plan_id)
    except Exception:
        return False

    result = await db.study_plans.update_one(
        {"_id": oid, "user_id": user_id},
        {
            "$set": {
                f"items.{item_index}.tasks.{task_index}.done": done,
                "updated_at": utcnow().isoformat(),
            }
        },
    )
    if result.matched_count == 0:
        return False

    await _sync_completion_counters(db, oid, user_id)
    return True


async def _sync_completion_counters(
    db: AsyncIOMotorDatabase, oid: ObjectId, user_id: str
) -> None:
    """
    Re-read the plan and recount completed tasks. Stored denormalised on the plan
    document for fast dashboard reads without having to aggregate the items array.
    """
    plan = await db.study_plans.find_one(
        {"_id": oid, "user_id": user_id},
        {"items": 1},
    )
    if not plan:
        return
    total = 0
    completed = 0
    for item in plan.get("items", []):
        for task in item.get("tasks", []):
            total += 1
            if task.get("done"):
                completed += 1
    await db.study_plans.update_one(
        {"_id": oid},
        {"$set": {"total_tasks": total, "completed_tasks": completed}},
    )