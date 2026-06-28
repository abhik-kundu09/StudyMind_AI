# backend/app/api/v1/documents.py
from typing import Annotated
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.dependencies import get_current_user
from app.database.mongodb import get_database
from app.models.user import UserModel
from app.schemas.document import DocumentListResponse, DocumentResponse, DocumentStatusResponse
from app.tasks.pdf_tasks import process_pdf

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_TYPES = {"application/pdf"}


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: Annotated[UserModel, Depends(get_current_user)] = None,
):
    # Validate
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 20 MB limit.")

    db =  get_database()
    doc_id = str(ObjectId())

    doc = {
        "_id": doc_id,
        "user_id": str(current_user.id),
        "filename": file.filename,
        "original_filename": file.filename,
        "file_size": len(file_bytes),
        "page_count": 0,
        "chunk_count": 0,
        "status": "pending",
        "error_message": None,
        "faiss_index_path": None,
        "uploaded_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        "processed_at": None,
    }

    await db["documents"].insert_one(doc)

    # Dispatch Celery task (non-blocking)
    process_pdf.delay(
        doc_id=doc_id,
        user_id=str(current_user.id),
        filename=file.filename,
        file_bytes_hex=file_bytes.hex(),
    )

    return DocumentResponse(
        id=doc_id,
        filename=doc["filename"],
        original_filename=doc["original_filename"],
        file_size=doc["file_size"],
        page_count=0,
        chunk_count=0,
        status="pending",
        uploaded_at=doc["uploaded_at"],
    )


@router.get("/{doc_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    doc_id: str,
    current_user: Annotated[UserModel, Depends(get_current_user)] = None,
):
    db = get_database()
    doc = await db["documents"].find_one(
        {"_id": doc_id, "user_id": str(current_user.id)}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return DocumentStatusResponse(
        id=doc["_id"],
        status=doc["status"],
        page_count=doc["page_count"],
        chunk_count=doc["chunk_count"],
        error_message=doc.get("error_message"),
        processed_at=doc.get("processed_at"),
    )


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    current_user: Annotated[UserModel, Depends(get_current_user)] = None,
):
    db = get_database()
    cursor = db["documents"].find({"user_id": str(current_user.id)}).sort("uploaded_at", -1)
    docs = await cursor.to_list(length=100)

    return DocumentListResponse(
        documents=[
            DocumentResponse(
                id=d["_id"],
                filename=d["filename"],
                original_filename=d["original_filename"],
                file_size=d["file_size"],
                page_count=d["page_count"],
                chunk_count=d["chunk_count"],
                status=d["status"],
                error_message=d.get("error_message"),
                uploaded_at=d["uploaded_at"],
                processed_at=d.get("processed_at"),
            )
            for d in docs
        ],
        total=len(docs),
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    current_user: Annotated[UserModel, Depends(get_current_user)] = None,
):
    db =  get_database()
    result = await db["documents"].delete_one(
        {"_id": doc_id, "user_id": str(current_user.id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found.")
    # Optionally: evict FAISS index for this user here