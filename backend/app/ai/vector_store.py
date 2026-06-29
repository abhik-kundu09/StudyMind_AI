"""
FAISSManager — per-user FAISS index lifecycle.

Design:
  - Each user gets their own FAISS index stored at:
      data/faiss_indexes/{user_id}/index.faiss
      data/faiss_indexes/{user_id}/index.pkl
  - Up to MAX_CACHED_INDEXES indexes are kept in RAM (LRU eviction).
  - Indexes are loaded from disk on first access and saved after mutation.
  - Returns None gracefully when a user has no index yet.
"""

from collections import OrderedDict
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from app.ai.embeddings import get_embeddings

MAX_CACHED_INDEXES = 10
INDEX_BASE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "faiss_indexes"


class FAISSManager:
    def __init__(self) -> None:
        self._cache: OrderedDict[str, FAISS] = OrderedDict()
        INDEX_BASE_DIR.mkdir(parents=True, exist_ok=True)

    def _index_path(self, user_id: str) -> Path:
        return INDEX_BASE_DIR / user_id

    def _has_saved_index(self, user_id: str) -> bool:
        p = self._index_path(user_id)
        return (p / "index.faiss").exists() and (p / "index.pkl").exists()

    def _load_from_disk(self, user_id: str) -> FAISS:
        return FAISS.load_local(
            str(self._index_path(user_id)),
            get_embeddings(),
            allow_dangerous_deserialization=True,
        )

    def _save_to_disk(self, user_id: str, index: FAISS) -> None:
        path = self._index_path(user_id)
        path.mkdir(parents=True, exist_ok=True)
        index.save_local(str(path))

    def _put_cache(self, user_id: str, index: FAISS) -> None:
        if user_id in self._cache:
            self._cache.move_to_end(user_id)
        else:
            if len(self._cache) >= MAX_CACHED_INDEXES:
                self._cache.popitem(last=False)
            self._cache[user_id] = index
            self._cache.move_to_end(user_id)

    def get_index(self, user_id: str) -> FAISS | None:
        if user_id in self._cache:
            self._cache.move_to_end(user_id)
            return self._cache[user_id]
        if self._has_saved_index(user_id):
            index = self._load_from_disk(user_id)
            self._put_cache(user_id, index)
            return index
        return None

    def add_documents(self, user_id: str, documents: list[Document]) -> None:
        existing = self.get_index(user_id)
        if existing is None:
            index = FAISS.from_documents(documents, get_embeddings())
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
        self._cache.pop(user_id, None)
        path = self._index_path(user_id)
        if path.exists():
            import shutil
            shutil.rmtree(path)


faiss_manager = FAISSManager()