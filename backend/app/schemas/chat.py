from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    document_id: Optional[str] = None
    document_name: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    user_id: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    title: str
    created_at: datetime
    updated_at: datetime


class SendMessageRequest(BaseModel):
    content: str
    document_id: Optional[str] = None  # can override per message


class SourceCitation(BaseModel):
    page: Optional[int] = None
    text: str
    doc_name: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    sources: list[SourceCitation] = []
    created_at: datetime


class UpdateSessionTitleRequest(BaseModel):
    title: str