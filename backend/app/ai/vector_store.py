"""
FAISSManager — per-user FAISS index lifecycle.

Design:
  - Each user gets their own FAISS index stored at:
      data/faiss_indexes/{user_id}/index.faiss
      data/faiss_indexes/{user_id}/index.pkl
  - Up to MAX_CACHED_INDEXES indexes are kept in RAM (LRU eviction).
  - Indexes are loaded from disk on first access and saved after mutation.
  - Returns None gracefully when a user has no index yet (before first PDF upload).

Thread safety:
  - Safe for single-worker uvicorn (dev). In production with multiple
    Celery workers, index writes should go through a task queue to avoid
    concurrent write corruption. Noted as future hardening (Stage 11).
"""

import os
from collections import OrderedDict
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from app.ai.embeddings import embeddings_model

# ── Config ────────────────────────────────────────────────────────────────────
MAX_CACHED_INDEXES = 10
INDEX_BASE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "faiss_indexes"


class FAISSManager:
    def __init__(self) -> None:
        # OrderedDict used as an LRU cache: most-recently-used at end
        self._cache: OrderedDict[str, FAISS] = OrderedDict()
        INDEX_BASE_DIR.mkdir(parents=True, exist_ok=True)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _index_path(self, user_id: str) -> Path:
        return INDEX_BASE_DIR / user_id

    def _has_saved_index(self, user_id: str) -> bool:
        p = self._index_path(user_id)
        return (p / "index.faiss").exists() and (p / "index.pkl").exists()

    def _load_from_disk(self, user_id: str) -> FAISS:
        return FAISS.load_local(
            str(self._index_path(user_id)),
            embeddings_model,
            allow_dangerous_deserialization=True,  # our own files, safe
        )

    def _save_to_disk(self, user_id: str, index: FAISS) -> None:
        path = self._index_path(user_id)
        path.mkdir(parents=True, exist_ok=True)
        index.save_local(str(path))

    def _put_cache(self, user_id: str, index: FAISS) -> None:
        """Insert/refresh in LRU cache, evicting oldest if over limit."""
        if user_id in self._cache:
            self._cache.move_to_end(user_id)
        else:
            if len(self._cache) >= MAX_CACHED_INDEXES:
                self._cache.popitem(last=False)  # evict LRU
            self._cache[user_id] = index
            self._cache.move_to_end(user_id)

    # ── Public API ────────────────────────────────────────────────────────────

    def get_index(self, user_id: str) -> FAISS | None:
        """
        Return the FAISS index for this user, or None if they have no index yet.
        Checks cache first, then disk.
        """
        if user_id in self._cache:
            self._cache.move_to_end(user_id)
            return self._cache[user_id]

        if self._has_saved_index(user_id):
            index = self._load_from_disk(user_id)
            self._put_cache(user_id, index)
            return index

        return None  # user has not uploaded any PDFs yet

    def add_documents(self, user_id: str, documents: list[Document]) -> None:
        """
        Add chunked LangChain Documents to the user's index.
        Creates the index if it doesn't exist yet.
        Called by pdf_tasks.py (Stage 4) after chunking a PDF.
        """
        existing = self.get_index(user_id)

        if existing is None:
            # First document for this user — create index from scratch
            index = FAISS.from_documents(documents, embeddings_model)
        else:
            existing.add_documents(documents)
            index = existing

        self._save_to_disk(user_id, index)
        self._put_cache(user_id, index)
    

    def similarity_search(
        self,
        user_id: str,
        query: str,
        k: int = 5,
        filter: dict | None = None,
        fetch_k: int | None = None,
    ) -> list[Document]:
        """
        Return top-k relevant chunks for a query.
        Returns empty list if user has no index (graceful degradation to
        general chat mode instead of crashing).

        filter: optional metadata filter dict (e.g. {"doc_id": "..."}), passed
            straight through to LangChain's FAISS.similarity_search(). Applied
            AFTER fetching fetch_k candidates, BEFORE truncating to k.

        fetch_k: optional override for how many candidates to pull before
            filtering/truncating (LangChain default: 20). When filter is set
            and you want document-wide coverage (e.g. quiz generation) rather
            than narrow query relevance, pass a much larger fetch_k.
        """
        index = self.get_index(user_id)
        if index is None:
            return []

        search_kwargs: dict = {"k": k}
        if filter is not None:
            search_kwargs["filter"] = filter
        if fetch_k is not None:
            search_kwargs["fetch_k"] = fetch_k

        return index.similarity_search(query, **search_kwargs)

    def delete_index(self, user_id: str) -> None:
        """Remove a user's index from cache and disk (e.g. account deletion)."""
        self._cache.pop(user_id, None)
        path = self._index_path(user_id)
        if path.exists():
            import shutil
            shutil.rmtree(path)


# ── Module-level singleton ────────────────────────────────────────────────────
faiss_manager = FAISSManager()