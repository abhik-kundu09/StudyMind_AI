# StudyMind AI — API Reference

Base URL: `http://localhost:8000/api/v1`


Interactive docs: `http://localhost:8000/docs` (Swagger UI)

---

## Authentication

All protected routes require a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire in 15 minutes. Use the `/auth/refresh` endpoint with the httpOnly `refresh_token` cookie to obtain a new access token silently.

---

## Rate Limits

| Tier | Limit | Applied To |
|---|---|---|
| Strict | 5 / minute | Register, Login |
| Standard | 20 / minute | Refresh, Me, Logout |
| Generation | 10 / minute | All AI generation endpoints |
| Read | 60 / minute | All read/list/fetch endpoints |
| Write | 30 / minute | Stream chat, create/delete, title update, flashcard review |

Rate limit violations return `HTTP 429 Too Many Requests`.

---

## Endpoints

---

### Auth — `/auth`

#### `POST /auth/register`
Register a new user account.

**Rate limit:** 5/min  
**Auth required:** No

**Request body:**
```json
{
  "name": "string (max 100 chars)",
  "email": "string (valid email)",
  "password": "string (min 8, max 128 chars)"
}
```

**Response `201`:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
```

**Errors:**
- `400` — Email already registered
- `422` — Validation error (name/password length, invalid email)
- `429` — Rate limit exceeded

---

#### `POST /auth/login`
Authenticate and receive tokens.

**Rate limit:** 5/min  
**Auth required:** No

**Request body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response `200`:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
```
Sets httpOnly `refresh_token` cookie on response.

**Errors:**
- `401` — Invalid credentials
- `429` — Rate limit exceeded

---

#### `POST /auth/refresh`
Obtain a new access token using the refresh cookie.

**Rate limit:** 20/min  
**Auth required:** No (uses httpOnly cookie)

**Response `200`:**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

**Errors:**
- `401` — Refresh token missing, expired, or invalid

---

#### `GET /auth/me`
Get current authenticated user info.

**Rate limit:** 20/min  
**Auth required:** Yes

**Response `200`:**
```json
{
  "id": "string",
  "name": "string",
  "email": "string"
}
```

---

#### `POST /auth/logout`
Invalidate session and clear refresh cookie.

**Rate limit:** 20/min  
**Auth required:** Yes

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

---

### Documents — `/documents`

#### `POST /documents/upload`
Upload a PDF and trigger async processing (chunking + embedding + FAISS indexing).

**Auth required:** Yes  
**Content-Type:** `multipart/form-data`

**Form fields:**
- `file` — PDF file (binary)
- `title` — string (document display name)

**Response `202`:**
```json
{
  "id": "string (plain string _id)",
  "title": "string",
  "status": "PROCESSING",
  "created_at": "ISO datetime string"
}
```

**Notes:**
- `_id` in the `documents` collection is a **plain string** (UUID), not a Mongo ObjectId.
- Processing status cycles: `PROCESSING` → `READY` | `FAILED`

**Errors:**
- `400` — File is not a PDF
- `413` — File too large

---

#### `GET /documents`
List all documents for the authenticated user.

**Auth required:** Yes

**Response `200`:**
```json
[
  {
    "id": "string",
    "title": "string",
    "status": "READY | PROCESSING | FAILED",
    "page_count": "integer",
    "created_at": "ISO datetime string"
  }
]
```

---

#### `DELETE /documents/{document_id}`
Delete a document and its associated FAISS vectors.

**Auth required:** Yes

**Response `200`:**
```json
{ "message": "Document deleted" }
```

**Errors:**
- `404` — Document not found or not owned by user

---

### Chat — `/chat`

#### `POST /chat/stream`
Start a new RAG-grounded chat message with SSE streaming response.

**Rate limit:** 30/min  
**Auth required:** Yes  
**Content-Type:** `application/json`

**Request body:**
```json
{
  "conversation_id": "string | null (null = new conversation)",
  "message": "string",
  "doc_ids": ["string", "..."] 
}
```

**Response:** `text/event-stream` (SSE)

Each SSE event is a JSON chunk:
```json
{ "token": "string" }
```

Final event:
```json
{ "done": true, "sources": [{ "content": "string", "doc_title": "string", "page": "integer" }] }
```

---

#### `GET /chat/conversations`
List all conversation sessions for the user.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
[
  {
    "id": "string",
    "title": "string",
    "doc_ids": ["string"],
    "created_at": "ISO datetime string",
    "updated_at": "ISO datetime string"
  }
]
```

---

#### `GET /chat/conversations/{conversation_id}`
Fetch full message history for a conversation.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
{
  "id": "string",
  "title": "string",
  "messages": [
    {
      "role": "user | assistant",
      "content": "string",
      "sources": [],
      "created_at": "ISO datetime string"
    }
  ]
}
```

---

#### `PATCH /chat/conversations/{conversation_id}/title`
Update the display title of a conversation.

**Rate limit:** 30/min  
**Auth required:** Yes

**Request body:**
```json
{ "title": "string" }
```

**Response `200`:**
```json
{ "message": "Title updated" }
```

---

#### `DELETE /chat/conversations/{conversation_id}`
Delete a conversation and all its messages.

**Rate limit:** 30/min  
**Auth required:** Yes

**Response `200`:**
```json
{ "message": "Conversation deleted" }
```

---

### Quiz — `/quiz`

#### `POST /quiz/generate`
Generate an MCQ quiz from a document using the LLM.

**Rate limit:** 10/min  
**Auth required:** Yes

**Request body:**
```json
{
  "doc_id": "string",
  "topic": "string (optional focus area)",
  "question_count": "integer (3–20, default 10)"
}
```

**Response `201`:**
```json
{
  "quiz_id": "string (ObjectId)",
  "title": "string",
  "status": "READY",
  "question_count": "integer",
  "created_at": "ISO datetime string"
}
```

---

#### `GET /quiz`
List all quizzes for the authenticated user.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
[
  {
    "quiz_id": "string",
    "title": "string",
    "doc_id": "string",
    "question_count": "integer",
    "created_at": "ISO datetime string"
  }
]
```

---

#### `GET /quiz/{quiz_id}`
Fetch a quiz with all questions for taking.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
{
  "quiz_id": "string",
  "title": "string",
  "questions": [
    {
      "question_id": "string",
      "text": "string",
      "options": ["A", "B", "C", "D"],
      "correct_index": "integer"
    }
  ]
}
```

---

#### `POST /quiz/{quiz_id}/submit`
Submit quiz answers and record an attempt.

**Rate limit:** 60/min  
**Auth required:** Yes

**Request body:**
```json
{
  "answers": [
    { "question_id": "string", "selected_index": "integer" }
  ]
}
```

**Response `200`:**
```json
{
  "attempt_id": "string (ObjectId)",
  "score": "integer",
  "total": "integer",
  "percentage": "float",
  "results": [
    {
      "question_id": "string",
      "correct": "boolean",
      "correct_index": "integer",
      "selected_index": "integer"
    }
  ]
}
```

---

#### `GET /quiz/attempts`
List all quiz attempts for the user.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
[
  {
    "attempt_id": "string",
    "quiz_id": "string",
    "quiz_title": "string",
    "score": "integer",
    "total": "integer",
    "percentage": "float",
    "submitted_at": "ISO datetime string"
  }
]
```

---

### Study Plan — `/study-plan`

#### `POST /study-plan/generate`
Generate an adaptive study schedule from a document.

**Rate limit:** 10/min  
**Auth required:** Yes

**Request body:**
```json
{
  "doc_ids": ["string"],
  "exam_date": "ISO date string (YYYY-MM-DD)",
  "daily_hours": "float (e.g. 2.5)",
  "focus_areas": "string (optional)"
}
```

**Response `201`:**
```json
{
  "plan_id": "string (ObjectId)",
  "title": "string",
  "granularity": "HOURLY | DAILY | WEEKLY",
  "status": "READY",
  "created_at": "ISO datetime string"
}
```

**Notes:**
- Granularity is auto-selected: `< 24h` → HOURLY, `1–45 days` → DAILY, `> 45 days` → WEEKLY

---

#### `GET /study-plan`
List all study plans for the user.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
[
  {
    "plan_id": "string",
    "title": "string",
    "exam_date": "ISO date string",
    "granularity": "HOURLY | DAILY | WEEKLY",
    "progress_percent": "float",
    "created_at": "ISO datetime string"
  }
]
```

---

#### `GET /study-plan/{plan_id}`
Fetch full study plan with all schedule blocks.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
{
  "plan_id": "string",
  "title": "string",
  "exam_date": "ISO date string",
  "granularity": "HOURLY | DAILY | WEEKLY",
  "blocks": [
    {
      "block_id": "string",
      "label": "string",
      "topic": "string",
      "duration_minutes": "integer",
      "completed": "boolean"
    }
  ]
}
```

---

#### `PATCH /study-plan/{plan_id}/blocks/{block_id}`
Mark a schedule block as complete or incomplete.

**Rate limit:** 60/min  
**Auth required:** Yes

**Request body:**
```json
{ "completed": "boolean" }
```

**Response `200`:**
```json
{ "message": "Block updated" }
```

---

#### `DELETE /study-plan/{plan_id}`
Delete a study plan.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
{ "message": "Study plan deleted" }
```

---

### Flashcards — `/flashcards`

#### `POST /flashcards/generate`
Generate a flashcard deck from a document using the LLM.

**Rate limit:** 10/min  
**Auth required:** Yes

**Request body:**
```json
{
  "doc_id": "string",
  "topic": "string (optional)",
  "card_count": "integer (default 15)"
}
```

**Response `201`:**
```json
{
  "deck_id": "string (ObjectId)",
  "title": "string",
  "card_count": "integer",
  "doc_id": "string",
  "created_at": "ISO datetime string"
}
```

---

#### `GET /flashcards`
List all flashcard decks for the user.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
[
  {
    "deck_id": "string",
    "title": "string",
    "doc_id": "string",
    "card_count": "integer",
    "due_count": "integer",
    "created_at": "ISO datetime string"
  }
]
```

---

#### `GET /flashcards/{deck_id}`
Fetch a deck with all cards and SM-2 state.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
{
  "deck_id": "string",
  "title": "string",
  "cards": [
    {
      "card_id": "string",
      "front": "string",
      "back": "string",
      "due_date": "ISO datetime string",
      "interval": "integer (days)",
      "ease_factor": "float",
      "repetitions": "integer"
    }
  ]
}
```

---

#### `POST /flashcards/{deck_id}/review`
Submit a review quality rating for a card (SM-2 algorithm update).

**Rate limit:** 60/min  
**Auth required:** Yes

**Request body:**
```json
{
  "card_id": "string",
  "quality": "integer (0–5)"
}
```

SM-2 quality scale: `0` = complete blackout, `3` = correct with difficulty, `5` = perfect recall.

**Response `200`:**
```json
{
  "card_id": "string",
  "next_due": "ISO datetime string",
  "new_interval": "integer",
  "new_ease_factor": "float"
}
```

---

#### `DELETE /flashcards/{deck_id}`
Delete a flashcard deck and all its cards.

**Rate limit:** 30/min  
**Auth required:** Yes

**Response `200`:**
```json
{ "message": "Deck deleted" }
```

---

### Progress — `/progress`

#### `GET /progress/summary`
Get aggregated learning progress stats for the user dashboard.

**Rate limit:** 60/min  
**Auth required:** Yes

**Response `200`:**
```json
{
  "streak": "integer (consecutive study days)",
  "total_quizzes": "integer",
  "study_days": "integer",
  "flashcard_sessions": "integer",
  "avg_quiz_score": "float",
  "weekly_activity": [
    {
      "date": "YYYY-MM-DD",
      "quizzes": "integer",
      "study_days": "integer",
      "flashcards": "integer"
    }
  ]
}
```

---

## Error Response Format

All errors follow this shape:

```json
{
  "detail": "string (human-readable error message)"
}
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| `400` | Bad request / business logic error |
| `401` | Unauthenticated or token expired |
| `403` | Forbidden (resource belongs to another user) |
| `404` | Resource not found |
| `422` | Validation error (Pydantic) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |