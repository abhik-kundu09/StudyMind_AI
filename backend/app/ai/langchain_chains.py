"""
LangChain 1.x LCEL chains for StudyMind AI.

Pattern: prompt | llm | parser  (all synchronous composition, async at invoke time)

Chains are built fresh per call — they are stateless. Conversation history
is passed in as input, not stored inside the chain object. This makes them
safe to share across concurrent requests with no locking needed.

Stages that fill the stubs:
  - build_rag_chain()        → Stage 5
  - build_quiz_chain()       → Stage 6
  - build_study_plan_chain() → Stage 7
"""

import json
from typing import AsyncIterator

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser

from app.ai.gemini_client import flash_llm, pro_llm
from app.ai.prompts import general_chat_prompt, quiz_prompt, study_plan_prompt


# ── History helpers ───────────────────────────────────────────────────────────

def build_history(messages: list[dict]) -> list[HumanMessage | AIMessage]:
    """
    Convert stored message dicts to LangChain message objects.

    Expected format:
      [{"role": "human"|"ai", "content": "..."}]
    """
    result = []
    for m in messages:
        if m["role"] == "human":
            result.append(HumanMessage(content=m["content"]))
        else:
            result.append(AIMessage(content=m["content"]))
    return result


# ── General chat chain ────────────────────────────────────────────────────────

def build_general_chat_chain():
    """
    LCEL chain: general_chat_prompt | flash_llm | StrOutputParser

    Input keys: {"input": str, "history": list[BaseMessage]}
    Output: str
    """
    return general_chat_prompt | flash_llm | StrOutputParser()


async def stream_general_chat(
    user_input: str,
    history: list[dict],
) -> AsyncIterator[str]:
    """
    Async generator that yields text chunks for SSE streaming.
    history: raw list of {"role", "content"} dicts from MongoDB.
    """
    chain = build_general_chat_chain()
    lc_history = build_history(history)

    async for chunk in chain.astream({
        "input": user_input,
        "history": lc_history,
    }):
        yield chunk


async def invoke_general_chat(
    user_input: str,
    history: list[dict],
) -> str:
    """Non-streaming version — used by test endpoint."""
    chain = build_general_chat_chain()
    lc_history = build_history(history)

    return await chain.ainvoke({
        "input": user_input,
        "history": lc_history,
    })


# ── RAG chat chain (Stage 5) ──────────────────────────────────────────────────

async def stream_rag_chat(
    user_input: str,
    history: list[dict],
    user_id: str,
) -> AsyncIterator[str]:
    """
    RAG chain with document retrieval.
    Implemented in Stage 5 — raises clearly until then.
    """
    raise NotImplementedError("RAG chain is implemented in Stage 5.")


# ── Quiz chain (Stage 6) ──────────────────────────────────────────────────────

async def invoke_quiz_chain(
    topic: str,
    content: str,
    num_questions: int = 5,
    difficulty: str = "medium",
) -> dict:
    """
    Returns parsed quiz JSON dict.
    Implemented in Stage 6 — raises clearly until then.
    """
    raise NotImplementedError("Quiz chain is implemented in Stage 6.")


# ── Study plan chain (Stage 7) ────────────────────────────────────────────────

async def invoke_study_plan_chain(
    exam_name: str,
    exam_date: str,
    subjects: str,
    daily_hours: float,
    knowledge_level: str,
    weak_areas: str,
) -> dict:
    """
    Returns parsed study plan JSON dict.
    Implemented in Stage 7 — raises clearly until then.
    """
    raise NotImplementedError("Study plan chain is implemented in Stage 7.")