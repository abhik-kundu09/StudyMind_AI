"""
Embedding model — HuggingFace sentence-transformers via langchain-community.

Groq does not provide an embeddings API, so we use a local model:
  all-MiniLM-L6-v2 — fast, lightweight, 384-dim, excellent for semantic search.
  Downloads once (~90MB), runs entirely locally, zero API cost.

Lazy-loaded on first use to keep startup RAM under Render's 512MB free tier limit.

Exposes two methods used by vector_store.py:
  - embed_query(text)    : single string → List[float]
  - embed_texts(texts)   : List[str]    → List[List[float]]
"""

from langchain_huggingface import HuggingFaceEmbeddings

_embeddings_model: HuggingFaceEmbeddings | None = None


def get_embeddings() -> HuggingFaceEmbeddings:
    """Return the LangChain embeddings object — loads model on first call only."""
    global _embeddings_model
    if _embeddings_model is None:
        _embeddings_model = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _embeddings_model


def embed_query(text: str) -> list[float]:
    """Embed a single query string (used at retrieval time)."""
    return get_embeddings().embed_query(text)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of document chunks (used at index-build time)."""
    return get_embeddings().embed_documents(texts)