from typing import AsyncGenerator, Optional
from datetime import datetime, timezone
from bson import ObjectId
import json

from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser

from app.database.mongodb import get_database
from app.ai.gemini_client import flash_llm
from app.ai.vector_store import faiss_manager
from app.ai.prompts.chat_prompt import RAG_PROMPT, GENERAL_PROMPT


def _build_history(messages: list[dict]) -> list:
    history = []
    for msg in messages:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        else:
            history.append(AIMessage(content=msg["content"]))
    return history


def _extract_sources(docs: list) -> list[dict]:
    sources = []
    seen = set()
    for doc in docs:
        meta = doc.metadata or {}
        page = meta.get("page")
        doc_name = meta.get("filename", "Document")
        preview = doc.page_content[:200].strip().replace("\n", " ")
        key = (page, preview[:60])
        if key not in seen:
            seen.add(key)
            sources.append({"page": page, "text": preview, "doc_name": doc_name})
    return sources[:4]


def _retrieve_docs(user_id: str, question: str, document_id: Optional[str], k: int = 6) -> list:
    """
    Use FAISSManager.similarity_search() directly (no get_retriever).
    Then filter by document_id in metadata if provided.

    IMPORTANT: the user's FAISS index contains chunks from ALL of their
    uploaded documents mixed together. If we only fetch k=6 nearest
    neighbors and the selected document's chunks aren't in that top-6,
    filtering would return empty — and falling back to "all docs" would
    silently leak content from a DIFFERENT document into the answer.
    So instead: fetch a much larger candidate pool when a specific
    document is requested, and NEVER fall back to unfiltered results.
    """
    if document_id:
        # Pull a wide net of candidates so the target doc's chunks are
        # very likely included, then filter strictly to that doc only.
        wide_k = max(k * 10, 40)
        candidates = faiss_manager.similarity_search(user_id=user_id, query=question, k=wide_k)
        filtered = [
            d for d in candidates
            if str(d.metadata.get("doc_id", "")) == str(document_id)
        ]
        # Return top-k of the filtered set (already sorted by similarity)
        return filtered[:k]

    # No document selected — general k-nearest across everything
    return faiss_manager.similarity_search(user_id=user_id, query=question, k=k)


# ── Session CRUD ──────────────────────────────────────────────────────────────

async def get_session(session_id: str, user_id: str) -> Optional[dict]:
    db = get_database()
    return await db.chat_sessions.find_one({
        "_id": ObjectId(session_id),
        "user_id": user_id,
    })


async def create_session(user_id: str, document_id: Optional[str], document_name: Optional[str]) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    session = {
        "user_id": user_id,
        "document_id": document_id,
        "document_name": document_name,
        "title": "New Chat",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.chat_sessions.insert_one(session)
    session["_id"] = result.inserted_id
    return session


async def list_sessions(user_id: str) -> list[dict]:
    db = get_database()
    cursor = db.chat_sessions.find(
        {"user_id": user_id},
        sort=[("updated_at", -1)],
        limit=50,
    )
    return await cursor.to_list(length=50)


async def delete_session(session_id: str, user_id: str) -> bool:
    db = get_database()
    r1 = await db.chat_sessions.delete_one({"_id": ObjectId(session_id), "user_id": user_id})
    await db.chat_messages.delete_many({"session_id": session_id})
    return r1.deleted_count > 0


async def get_messages(session_id: str, user_id: str, limit: int = 50) -> list[dict]:
    db = get_database()
    cursor = db.chat_messages.find(
        {"session_id": session_id, "user_id": user_id},
        sort=[("created_at", 1)],
        limit=limit,
    )
    return await cursor.to_list(length=limit)


async def save_message(
    session_id: str,
    user_id: str,
    role: str,
    content: str,
    sources: list = None,
) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    msg = {
        "session_id": session_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "sources": sources or [],
        "created_at": now,
    }
    result = await db.chat_messages.insert_one(msg)
    msg["_id"] = result.inserted_id

    update_fields: dict = {"updated_at": now}
    if role == "user":
        session = await db.chat_sessions.find_one({"_id": ObjectId(session_id)})
        if session and session.get("title") == "New Chat":
            update_fields["title"] = content[:60].strip()
    await db.chat_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": update_fields},
    )
    return msg


# ── Core streaming RAG ────────────────────────────────────────────────────────

async def stream_rag_response(
    user_id: str,
    session_id: str,
    question: str,
    document_id: Optional[str],
) -> AsyncGenerator[str, None]:

    db = get_database()

    # 1. Conversation history (last 6 messages = 3 turns)
    recent = await db.chat_messages.find(
        {"session_id": session_id, "user_id": user_id},
        sort=[("created_at", -1)],
        limit=6,
    ).to_list(length=6)
    recent.reverse()
    history = _build_history(recent)

    # 2. RAG retrieval — synchronous FAISS call (CPU-bound, fast enough)
    sources: list[dict] = []
    context = ""

    if document_id:
        try:
            docs = _retrieve_docs(
                user_id=user_id,
                question=question,
                document_id=document_id,
                k=6,
            )
            if docs:
                sources = _extract_sources(docs)
                context = "\n\n---\n\n".join(
                    f"[Page {d.metadata.get('page', '?')}]\n{d.page_content}"
                    for d in docs
                )
        except Exception as e:
            # Log but don't crash — degrade to general chat
            print(f"[RAG] retrieval error for user={user_id} doc={document_id}: {e}")

    # 3. Pick chain based on whether we got context
    if context:
        chain = RAG_PROMPT | flash_llm | StrOutputParser()
        chain_input = {"context": context, "history": history, "question": question}
    else:
        chain = GENERAL_PROMPT | flash_llm | StrOutputParser()
        chain_input = {"history": history, "question": question}

    # 4. Stream tokens
    full_response = ""
    async for chunk in chain.astream(chain_input):
        if chunk:
            full_response += chunk
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

    # 5. Emit sources
    if sources:
        yield f"data: {json.dumps({'type': 'sources', 'content': sources})}\n\n"

    # 6. Done
    yield f"data: {json.dumps({'type': 'done'})}\n\n"

    # 7. Persist
    await save_message(
        session_id=session_id,
        user_id=user_id,
        role="assistant",
        content=full_response,
        sources=sources,
    )