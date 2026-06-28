from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.schemas.chat import (
    CreateSessionRequest,
    SessionResponse,
    SendMessageRequest,
    MessageResponse,
    UpdateSessionTitleRequest,
)
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


def _fmt_session(s: dict) -> SessionResponse:
    return SessionResponse(
        id=str(s["_id"]),
        user_id=s["user_id"],
        document_id=s.get("document_id"),
        document_name=s.get("document_name"),
        title=s.get("title", "New Chat"),
        created_at=s["created_at"],
        updated_at=s["updated_at"],
    )


def _fmt_message(m: dict) -> MessageResponse:
    return MessageResponse(
        id=str(m["_id"]),
        session_id=m["session_id"],
        role=m["role"],
        content=m["content"],
        sources=m.get("sources", []),
        created_at=m["created_at"],
    )


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def create_session(
    request: Request,
    body: CreateSessionRequest,
    current_user: dict = Depends(get_current_user),
):
    session = await chat_service.create_session(
        user_id=str(current_user.id),
        document_id=body.document_id,
        document_name=body.document_name,
    )
    return _fmt_session(session)


@router.get("/sessions", response_model=list[SessionResponse])
@limiter.limit("60/minute")
async def list_sessions(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    sessions = await chat_service.list_sessions(user_id=str(current_user.id))
    return [_fmt_session(s) for s in sessions]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def delete_session(
    request: Request,
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    deleted = await chat_service.delete_session(session_id=session_id, user_id=str(current_user.id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")


@router.patch("/sessions/{session_id}/title", response_model=SessionResponse)
@limiter.limit("30/minute")
async def update_title(
    request: Request,
    session_id: str,
    body: UpdateSessionTitleRequest,
    current_user: dict = Depends(get_current_user),
):
    from app.database.mongodb import get_database
    from bson import ObjectId
    from datetime import datetime, timezone

    db = get_database()
    result = await db.chat_sessions.find_one_and_update(
        {"_id": ObjectId(session_id), "user_id": str(current_user.id)},
        {"$set": {"title": body.title, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return _fmt_session(result)


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
@limiter.limit("60/minute")
async def get_messages(
    request: Request,
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user.id)
    session = await chat_service.get_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = await chat_service.get_messages(session_id, user_id)
    return [_fmt_message(m) for m in messages]


@router.post("/sessions/{session_id}/stream")
@limiter.limit("30/minute")
async def stream_chat(
    request: Request,
    session_id: str,
    body: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user.id)

    session = await chat_service.get_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await chat_service.save_message(
        session_id=session_id,
        user_id=user_id,
        role="user",
        content=body.content,
    )

    document_id = body.document_id or session.get("document_id")

    return StreamingResponse(
        chat_service.stream_rag_response(
            user_id=user_id,
            session_id=session_id,
            question=body.content,
            document_id=document_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )