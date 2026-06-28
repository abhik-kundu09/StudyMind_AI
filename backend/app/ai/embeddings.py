"""
Embedding model — HuggingFace sentence-transformers via langchain-community.

Groq does not provide an embeddings API, so we use a local model:
  all-MiniLM-L6-v2 — fast, lightweight, 384-dim, excellent for semantic search.
  Downloads once (~90MB), runs entirely locally, zero API cost.

Exposes two methods used by vector_store.py:
  - embed_query(text)    : single string → List[float]
  - embed_texts(texts)   : List[str]    → List[List[float]]
"""

from langchain_huggingface import HuggingFaceEmbeddings

# Downloads model on first run, cached at ~/.cache/huggingface/
embeddings_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},  # cosine similarity ready
)


def embed_query(text: str) -> list[float]:
    """Embed a single query string (used at retrieval time)."""
    return embeddings_model.embed_query(text)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of document chunks (used at index-build time)."""
    return embeddings_model.embed_documents(texts)

def get_embeddings():
    """Return the LangChain embeddings object."""
    return embeddings_model