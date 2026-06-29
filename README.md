<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0A0908,1C1608,2A1E08,3D2A0A,D4A856&height=200&section=header&text=StudyMind%20AI&fontSize=60&fontAlignY=35&fontColor=D4A856&desc=Study%20Smarter%2C%20Not%20Harder&descAlignY=55&descColor=E8B894&descSize=20&fontStyle=italic" />

**An intelligent study companion powered by RAG, LLMs, and spaced repetition.**

Upload your PDFs. Chat with them. Get quizzed. Build a study plan. Review flashcards. All in one place.

<br/>

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.137-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![LangChain](https://img.shields.io/badge/LangChain-1.x_LCEL-1C3C3C?style=flat-square&logo=langchain&logoColor=white)](https://python.langchain.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## What it does

StudyMind AI turns passive study materials into an active learning loop. Upload a PDF once — the rest is AI-driven.

| Feature | Description |
|---|---|
| **PDF → RAG** | PDFs are chunked, embedded via HuggingFace Sentence Transformers, and stored in a per-user FAISS index |
| **AI Chat** | Stream grounded answers from your documents via SSE with full conversation history and source citations |
| **Quiz Generator** | Auto-generate MCQ quizzes from any document; scores and attempts tracked over time |
| **Study Plan** | AI builds HOURLY / DAILY / WEEKLY adaptive schedules anchored to your exam date |
| **Flashcards** | SM-2 spaced repetition decks generated directly from document content |
| **Progress Dashboard** | Recharts activity graphs, quiz leaderboard, streak counter, document hub |
| **Auth** | JWT in-memory access tokens + httpOnly refresh cookies + silent refresh via Axios interceptor |
| **Rate Limiting** | SlowAPI per-endpoint limits on all sensitive routes |

---

## Screenshots

<div align="center">

| Dashboard | AI Chat |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.gif) | ![AI Chat](docs/screenshots/chat.png) |

| Quiz | Study Plan | Flashcards |
|---|---|---|
| ![Quiz](docs/screenshots/quiz.png) | ![Study Plan](docs/screenshots/study_plan.gif) | ![Flashcards](docs/screenshots/flashcards.png) |

</div>

## Tech Stack

### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-0.137-009688?style=flat-square&logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Motor-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-broker-DC382D?style=flat-square&logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-task_queue-37814A?style=flat-square)
![LangChain](https://img.shields.io/badge/LangChain-1.x_LCEL-1C3C3C?style=flat-square&logo=langchain&logoColor=white)
![FAISS](https://img.shields.io/badge/FAISS-vector_search-0064B0?style=flat-square&logo=meta&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-F55036?style=flat-square)
![HuggingFace](https://img.shields.io/badge/HuggingFace-all--MiniLM--L6--v2-FFD21E?style=flat-square&logo=huggingface&logoColor=black)
![PyMuPDF](https://img.shields.io/badge/PyMuPDF-PDF_extraction-3775A9?style=flat-square&logo=python&logoColor=white)
![SlowAPI](https://img.shields.io/badge/SlowAPI-rate_limiting-555555?style=flat-square)
![python-jose](https://img.shields.io/badge/python--jose-JWT-000000?style=flat-square)

### Frontend
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-build-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-state-FF6B35?style=flat-square)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-animations-EF0072?style=flat-square&logo=framer&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-charts-22B5BF?style=flat-square)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=flat-square)
![Lucide](https://img.shields.io/badge/Lucide-icons-F56565?style=flat-square)

---

## Local Development Setup

### Prerequisites
- **Docker Desktop** — runs MongoDB + Redis locally
- **Node.js** 20+
- **Python** 3.14+
- **Groq API key** — free at [console.groq.com](https://console.groq.com)

### 1. Clone

```bash
git clone https://github.com/abhik-kundu09/StudyMind_AI.git
cd StudyMind_AI
```

### 2. Start infrastructure

```bash
docker compose up -d
```

Starts MongoDB on `:27017` and Redis on `:6379`.

### 3. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env and fill in your GROQ_API_KEY and JWT_SECRET_KEY
```

```bash
# Terminal 1 — API server
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Celery worker (required for PDF processing)
# Windows:
python -m celery -A app.tasks.celery_app.celery_app worker --loglevel=info --pool=solo
# macOS / Linux:
celery -A app.tasks.celery_app.celery_app worker --loglevel=info
```

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

---

## Environment Variables

### `backend/.env`

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=studymind
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
GROQ_API_KEY=your-groq-api-key
FRONTEND_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
ENVIRONMENT=development
DEBUG=true
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

## Project Structure

```
StudyMind_AI/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers
│   │   ├── ai/              # LLM, embeddings, FAISS, LangChain chains
│   │   ├── core/            # Config, security, dependencies, limiter
│   │   ├── database/        # MongoDB connection
│   │   ├── models/          # Pydantic models
│   │   ├── schemas/         # Request/response schemas
│   │   ├── services/        # Business logic
│   │   ├── tasks/           # Celery + PDF task
│   │   └── main.py
│   ├── data/faiss_indexes/  # Per-user vector indexes (gitignored)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios helpers
│   │   ├── components/      # UI + feature components
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Route pages
│   │   ├── store/           # Zustand stores
│   │   ├── App.jsx
│   │   └── index.css        # Tailwind v4 @theme tokens
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── API.md
│   ├── DATABASE_SCHEMA.md
│   └── LOCAL_SETUP.md
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Key Design Decisions

**RAG Architecture** — Per-user FAISS indexes for document isolation. Embedding model (`all-MiniLM-L6-v2`) runs locally — zero API cost, 384-dim vectors, cosine similarity.

**SM-2 Spaced Repetition** — Full SuperMemo-2 algorithm in `flashcard_service.py`. Cards surface at optimal intervals based on recall quality (0–5 scale).

**Adaptive Study Plans** — Granularity auto-selected by exam proximity: hourly for < 24h, daily for 1–45 days, weekly beyond 45 days. Three separate LangChain prompt templates.

**Auth Pattern** — Access tokens in Zustand (in-memory), refresh tokens in httpOnly cookies. Silent refresh on 401 via Axios interceptor. Rotating JTI prevents reuse.

**Async PDF Pipeline** — Upload returns immediately with `pending` status. Celery handles extraction, chunking, embedding, and FAISS indexing in background.

---

## API Reference

Interactive Swagger UI: [`http://localhost:8000/docs`](http://localhost:8000/docs)

Full endpoint reference: [docs/API.md](docs/API.md)

Database schema: [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

---

## Author

**Abhik Kundu** 

[![GitHub](https://img.shields.io/badge/-abhik--kundu09-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/abhik-kundu09)
[![LinkedIn](https://img.shields.io/badge/-abhik--kundu-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/abhik--kundu)
[![Portfolio](https://img.shields.io/badge/-Portfolio-D4A856?style=flat-square)](https://abhik-kundu.netlify.app)
[![Email](https://img.shields.io/badge/-itsabhik003@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:itsabhik003@gmail.com)

---

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)