from datetime import datetime, timezone, timedelta
from typing import Optional
from bson import ObjectId
import json
import re

from app.database.mongodb import get_database
from app.ai.gemini_client import get_pro_llm
from app.ai.vector_store import faiss_manager
from langchain_core.prompts import ChatPromptTemplate


# ---------------------------------------------------------------------------
# SM-2 Algorithm
# ---------------------------------------------------------------------------

def sm2_update(easiness: float, interval: int, repetitions: int, quality: int):
    """
    Apply SM-2 update given a quality rating 0–5.
    Returns (new_easiness, new_interval, new_repetitions, next_review_datetime).

    quality:
      0 — complete blackout
      1 — incorrect, remembered on seeing answer
      2 — incorrect, easy to recall
      3 — correct, significant difficulty
      4 — correct, minor hesitation
      5 — perfect recall
    """
    if quality < 3:
        # Failed recall — reset streak
        repetitions = 0
        interval = 1
    else:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * easiness)
        repetitions += 1

    # Update easiness factor (EF)
    new_ef = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ef = max(1.3, new_ef)  # EF floor is 1.3

    next_review = datetime.now(timezone.utc) + timedelta(days=interval)

    return new_ef, interval, repetitions, next_review


# ---------------------------------------------------------------------------
# LLM Generation
# ---------------------------------------------------------------------------

FLASHCARD_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a flashcard generator for students. Given study material, extract the most important concepts and create flashcard pairs.

Output ONLY a JSON array. No markdown fences, no preamble, no explanation.

Format:
[
  {{"front": "Question or term", "back": "Answer or definition"}},
  ...
]

Rules:
- Create 8–12 cards per chunk of content
- Front: concise question or key term (max 15 words)
- Back: clear, complete answer (max 60 words)
- Cover definitions, processes, key facts, and relationships
- Do not create trivial or overly obvious cards""",
    ),
    (
        "human",
        "Study material:\n\n{content}\n\nDocument: {doc_name}",
    ),
])


async def generate_flashcards(user_id: str, doc_id: str) -> list[dict]:
    """
    Generate flashcards for a document using LLM + FAISS chunks.
    Returns list of inserted card dicts.
    """
    db = get_database()

    # Verify document ownership
    doc = await db["documents"].find_one({"_id": doc_id, "user_id": user_id})
    if not doc:
        raise ValueError("Document not found or access denied")

    doc_name = doc.get("filename", "Unknown Document")

    # Check if cards already exist for this doc
    existing = await db["flashcards"].count_documents({"user_id": user_id, "doc_id": doc_id})
    if existing > 0:
        # Return existing cards instead of regenerating
        cursor = db["flashcards"].find({"user_id": user_id, "doc_id": doc_id})
        cards = []
        async for card in cursor:
            card["_id"] = str(card["_id"])
            cards.append(card)
        return cards

    # Retrieve document chunks from FAISS using the module-level singleton
    chunks = faiss_manager.similarity_search(
        user_id,
        "key concepts definitions important terms",
        k=8,
        filter={"doc_id": doc_id},
        fetch_k=60,
    )

    if not chunks:
        raise ValueError("No content found for this document. Ensure it has been processed.")

    # Batch chunks into groups of 3 to stay within token limits
    batch_size = 3
    all_cards = []
    llm = get_pro_llm()
    chain = FLASHCARD_PROMPT | llm

    for i in range(0, min(len(chunks), 9), batch_size):
        batch = chunks[i : i + batch_size]
        content = "\n\n---\n\n".join(c.page_content for c in batch)

        try:
            response = await chain.ainvoke({"content": content, "doc_name": doc_name})
            raw = response.content.strip()

            # Strip any accidental markdown fences
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

            parsed = json.loads(raw)
            if isinstance(parsed, list):
                all_cards.extend(parsed)
        except Exception:
            continue  # skip failed batch, don't abort entire generation

    if not all_cards:
        raise ValueError("LLM failed to generate flashcards. Try again.")

    # Build Mongo documents
    now = datetime.now(timezone.utc)
    docs_to_insert = []
    for card in all_cards:
        front = str(card.get("front", "")).strip()
        back = str(card.get("back", "")).strip()
        if not front or not back:
            continue
        docs_to_insert.append({
            "user_id": user_id,
            "doc_id": doc_id,
            "doc_name": doc_name,
            "front": front,
            "back": back,
            "easiness": 2.5,
            "interval": 0,
            "repetitions": 0,
            "next_review": now,
            "created_at": now,
            "last_reviewed": None,
        })

    if not docs_to_insert:
        raise ValueError("No valid flashcards could be extracted.")

    result = await db["flashcards"].insert_many(docs_to_insert)

    # Return inserted cards with string _id
    inserted = []
    for oid, doc_data in zip(result.inserted_ids, docs_to_insert):
        doc_data["_id"] = str(oid)
        inserted.append(doc_data)

    return inserted


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

async def get_user_decks(user_id: str) -> list[dict]:
    """Return summary of all decks (one per document) for a user."""
    db = get_database()
    now = datetime.now(timezone.utc)

    pipeline = [
        {"$match": {"user_id": user_id}},
        {
            "$group": {
                "_id": "$doc_id",
                "doc_name": {"$first": "$doc_name"},
                "total": {"$sum": 1},
                "due": {
                    "$sum": {
                        "$cond": [{"$lte": ["$next_review", now]}, 1, 0]
                    }
                },
            }
        },
        {"$sort": {"due": -1, "doc_name": 1}},
    ]

    decks = []
    async for d in db["flashcards"].aggregate(pipeline):
        decks.append({
            "doc_id": d["_id"],
            "doc_name": d["doc_name"],
            "total": d["total"],
            "due": d["due"],
        })
    return decks


async def get_due_cards(user_id: str, doc_id: Optional[str] = None) -> list[dict]:
    """Return cards due for review, optionally filtered by doc."""
    db = get_database()
    now = datetime.now(timezone.utc)

    query: dict = {"user_id": user_id, "next_review": {"$lte": now}}
    if doc_id:
        query["doc_id"] = doc_id

    cards = []
    async for card in db["flashcards"].find(query).sort("next_review", 1).limit(50):
        card["_id"] = str(card["_id"])
        cards.append(card)
    return cards


async def submit_review(user_id: str, card_id: str, quality: int) -> dict:
    """
    Apply SM-2 update for a reviewed card.
    quality must be 0–5.
    Returns the updated card.
    """
    if quality < 0 or quality > 5:
        raise ValueError("Quality must be 0–5")

    db = get_database()
    card = await db["flashcards"].find_one({"_id": ObjectId(card_id), "user_id": user_id})
    if not card:
        raise ValueError("Card not found")

    new_ef, new_interval, new_reps, next_review = sm2_update(
        card["easiness"], card["interval"], card["repetitions"], quality
    )

    now = datetime.now(timezone.utc)
    await db["flashcards"].update_one(
        {"_id": ObjectId(card_id)},
        {
            "$set": {
                "easiness": new_ef,
                "interval": new_interval,
                "repetitions": new_reps,
                "next_review": next_review,
                "last_reviewed": now,
            }
        },
    )

    card["_id"] = str(card["_id"])
    card["easiness"] = new_ef
    card["interval"] = new_interval
    card["repetitions"] = new_reps
    card["next_review"] = next_review
    card["last_reviewed"] = now
    return card


async def delete_deck(user_id: str, doc_id: str) -> int:
    """Delete all flashcards for a document. Returns deleted count."""
    db = get_database()
    result = await db["flashcards"].delete_many({"user_id": user_id, "doc_id": doc_id})
    return result.deleted_count


async def get_flashcard_session_count(user_id: str, since: datetime) -> int:
    """Count distinct review sessions (days with at least one review) since a given datetime."""
    db = get_database()
    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "last_reviewed": {"$gte": since, "$ne": None},
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$last_reviewed",
                    }
                }
            }
        },
        {"$count": "session_days"},
    ]
    result = []
    async for doc in db["flashcards"].aggregate(pipeline):
        result.append(doc)
    return result[0]["session_days"] if result else 0


async def get_daily_flashcard_counts(user_id: str, days: int = 7) -> dict[str, int]:
    """Return {date_str: review_count} for the past N days."""
    db = get_database()
    since = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "last_reviewed": {"$gte": since, "$ne": None},
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$last_reviewed",
                    }
                },
                "count": {"$sum": 1},
            }
        },
    ]
    counts = {}
    async for doc in db["flashcards"].aggregate(pipeline):
        counts[doc["_id"]] = doc["count"]
    return counts