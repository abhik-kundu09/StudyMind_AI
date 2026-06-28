

from langchain_groq import ChatGroq

from app.core.config import settings

# ── Chat model (speed-optimised) ─────────────────────────────────────────────
flash_llm = ChatGroq(
    groq_api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.7
)

# ── Generation model (quality-optimised) ─────────────────────────────────────
pro_llm = ChatGroq(
    groq_api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.3
)

def get_llm():
    """Default LLM used for chat."""
    return flash_llm


def get_pro_llm():
    """Higher-quality LLM used for quizzes/study plans."""
    return pro_llm