# backend/app/models/document.py
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class DocumentModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    filename: str
    original_filename: str
    file_size: int  # bytes
    page_count: int = 0
    chunk_count: int = 0
    status: str = "pending"  # pending | processing | ready | failed
    error_message: Optional[str] = None
    faiss_index_path: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True