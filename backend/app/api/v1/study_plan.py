"""
Study Plan API endpoints with rate limiting.
Generate: 10/minute. All read/update endpoints: 60/minute.
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.database.mongodb import get_database
from app.models.study_plan import PlanStatus, utcnow
from app.models.user import UserModel
from app.schemas.study_plan import (
    GenerateResponse,
    ItemStatusUpdateRequest,
    StatusResponse,
    StudyPlanGenerateRequest,
    StudyPlanPublic,
    StudyPlanSummary,
    TaskToggleRequest,
)
from app.services.study_plan_service import (
    StudyPlanGenerationError,
    generate_study_plan,
    get_plan_by_id,
    list_plans,
    toggle_task_done,
    update_item_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/study_plan", tags=["study_plan"])


def _serialize_plan(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for field in ("created_at", "updated_at", "exam_date"):
        if isinstance(doc.get(field), datetime):
            doc[field] = doc[field].isoformat()
    return doc


async def _fetch_plan_or_404(db, plan_id: str, user_id: str) -> dict:
    plan = await get_plan_by_id(db, plan_id, user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found.")
    return plan


@router.post("/generate", response_model=GenerateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def generate_plan_endpoint(
    request: Request,
    payload: StudyPlanGenerateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = str(current_user.id)

    doc_cursor = db.documents.find(
        {"_id": {"$in": payload.doc_ids}, "user_id": user_id, "status": "ready"},
        {"_id": 1, "filename": 1},
    )
    docs = await doc_cursor.to_list(length=len(payload.doc_ids))

    found_ids = {str(d["_id"]) for d in docs}
    missing = [did for did in payload.doc_ids if did not in found_ids]
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Documents not found or not ready: {missing}.",
        )

    doc_titles = [d.get("filename", "Untitled") for d in docs]

    placeholder = {
        "_id": ObjectId(),
        "user_id": user_id,
        "doc_ids": payload.doc_ids,
        "doc_titles": doc_titles,
        "exam_name": payload.exam_name,
        "exam_date": payload.exam_date,
        "goal": payload.goal,
        "daily_hours": payload.daily_hours,
        "granularity": "daily",
        "days_until_exam": 0,
        "items": [],
        "total_tasks": 0,
        "completed_tasks": 0,
        "status": PlanStatus.GENERATING.value,
        "error_message": None,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await db.study_plans.insert_one(placeholder)
    plan_id = str(placeholder["_id"])

    try:
        plan = await generate_study_plan(
            db=db,
            user_id=user_id,
            doc_ids=payload.doc_ids,
            doc_titles=doc_titles,
            exam_name=payload.exam_name,
            exam_date=payload.exam_date,
            goal=payload.goal,
            daily_hours=payload.daily_hours,
        )
        items_dicts = [item.model_dump() for item in plan.items]
        await db.study_plans.update_one(
            {"_id": ObjectId(plan_id)},
            {
                "$set": {
                    "granularity": plan.granularity.value,
                    "days_until_exam": plan.days_until_exam,
                    "items": items_dicts,
                    "total_tasks": plan.total_tasks,
                    "completed_tasks": 0,
                    "status": PlanStatus.READY.value,
                    "updated_at": utcnow(),
                }
            },
        )
        return GenerateResponse(plan_id=plan_id, status=PlanStatus.READY)

    except StudyPlanGenerationError as exc:
        logger.error("Study plan generation failed for user=%s: %s", user_id, exc)
        await db.study_plans.update_one(
            {"_id": ObjectId(plan_id)},
            {"$set": {"status": PlanStatus.FAILED.value, "error_message": str(exc)[:1000], "updated_at": utcnow()}},
        )
        raise HTTPException(status_code=500, detail=f"Study plan generation failed: {str(exc)[:300]}")

    except Exception as exc:
        logger.exception("Unexpected error during study plan generation: %s", exc)
        await db.study_plans.update_one(
            {"_id": ObjectId(plan_id)},
            {"$set": {"status": PlanStatus.FAILED.value, "error_message": "Unexpected server error.", "updated_at": utcnow()}},
        )
        raise HTTPException(status_code=500, detail="Unexpected server error.")


@router.get("/", response_model=list[StudyPlanSummary])
@limiter.limit("60/minute")
async def list_plans_endpoint(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    plans = await list_plans(db, str(current_user.id))
    return [_serialize_plan(p) for p in plans]


@router.get("/{plan_id}/status", response_model=StatusResponse)
@limiter.limit("60/minute")
async def get_plan_status(
    request: Request,
    plan_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    plan = await _fetch_plan_or_404(db, plan_id, str(current_user.id))
    return StatusResponse(plan_id=plan_id, status=plan["status"], error_message=plan.get("error_message"))


@router.get("/{plan_id}", response_model=StudyPlanPublic)
@limiter.limit("60/minute")
async def get_plan(
    request: Request,
    plan_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    plan = await _fetch_plan_or_404(db, plan_id, str(current_user.id))
    if plan["status"] == PlanStatus.GENERATING.value:
        raise HTTPException(status_code=status.HTTP_202_ACCEPTED, detail="Plan is still being generated.")
    return _serialize_plan(plan)


@router.patch("/{plan_id}/item/{item_index}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def update_item_status_endpoint(
    request: Request,
    plan_id: str,
    item_index: int,
    body: ItemStatusUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    updated = await update_item_status(db, plan_id, str(current_user.id), item_index, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Plan or item not found.")


@router.patch("/{plan_id}/item/{item_index}/task/{task_index}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def toggle_task_endpoint(
    request: Request,
    plan_id: str,
    item_index: int,
    task_index: int,
    body: TaskToggleRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    updated = await toggle_task_done(db, plan_id, str(current_user.id), item_index, task_index, body.done)
    if not updated:
        raise HTTPException(status_code=404, detail="Plan, item, or task not found.")