"""
Quiz generation prompt. LangChain 1.x LCEL — used as a ChatPromptTemplate piped into the
Groq LLM, same pattern as chat_prompt.py's RAG_PROMPT.

The model is forced into strict JSON-only output because we parse its response directly into
QuizQuestion objects. No markdown fences, no preamble — see format instructions below.
"""

from langchain_core.prompts import ChatPromptTemplate

QUIZ_SYSTEM_PROMPT = """You are an expert exam-question writer creating a multiple-choice quiz \
from study material. Generate questions that test genuine understanding of the material, not \
trivial recall of exact wording.

Rules:
- Generate exactly {question_count} questions at {difficulty} difficulty.
- Each question must have exactly 4 options (A-D equivalent), only one correct.
- Distractors (wrong options) must be plausible — not obviously wrong, not jokes.
- Base every question strictly on the provided context. Do not invent facts not present in it.
- Vary question types across the set: definitions, application, comparison, cause/effect — \
avoid generating 10 near-identical "what is X" questions.
- Each question should reference a single, identifiable idea from the context so a learner \
could point to where the answer comes from.

Output format — respond with ONLY a raw JSON array, no markdown code fences, no preamble, \
no trailing commentary. Each element must match this exact shape:

[
  {{
    "question_text": "string",
    "options": ["string", "string", "string", "string"],
    "correct_index": 0,
    "explanation": "one sentence on why this is correct",
    "source_chunk_id": "string or null"
  }}
]

correct_index is the 0-based index into "options" of the correct answer."""

QUIZ_HUMAN_PROMPT = """Study material context (each chunk prefixed with its chunk id):

{context}

Generate the quiz now. Respond with ONLY the JSON array described above."""

QUIZ_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", QUIZ_SYSTEM_PROMPT),
        ("human", QUIZ_HUMAN_PROMPT),
    ]
)