<div align="center">

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0A0908,1C1608,2A1E08,3D2A0A,D4A856&height=200&section=header&text=StudyMind%20AI&fontSize=60&fontAlignY=35&fontColor=D4A856&desc=Study%20Smarter%2C%20Not%20Harder&descAlignY=55&descColor=E8B894&descSize=20&fontStyle=italic" />

</div>

**An intelligent study companion powered by RAG, LLMs, and spaced repetition.**

Upload your PDFs. Chat with them. Get quizzed. Build a study plan. Review flashcards. All in one place.

<br/>

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.137-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## What it does

StudyMind AI turns passive study materials into an active learning loop. Upload a PDF once — the rest is AI-driven.

| | Feature | Description |
|---|---|---|
| **PDF → RAG** | Upload & index | Content is chunked, embedded via HuggingFace Sentence Transformers, and stored in a per-user FAISS index |
| **Chat** | AI Q&A | Stream grounded answers from your documents via SSE with full conversation history |
| **Quiz** | Auto-MCQ | Generate multiple-choice quizzes from any document; scores tracked over time |
| **Study Plan** | Adaptive scheduling | AI builds hourly / daily / weekly plans anchored to your exam date |
| **Flashcards** | Spaced repetition | SM-2 algorithm decks generated directly from document content |
| **Dashboard** | Progress tracking | Recharts activity graphs, quiz leaderboard, streak counter, document hub |
| **Auth** | Secure sessions | JWT in-memory access tokens + httpOnly refresh cookies + silent refresh |
| **Rate limiting** | Abuse protection | SlowAPI per-endpoint limits on all sensitive routes |

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

---

## Tech stack

### Backend

![FastAPI](https://img.shields.io/badge/FastAPI-0.137-009688?style=flat-square&logo=fastapi&logoColor=white)
![Uvicorn](https://img.shields.io/badge/Uvicorn-async-4B0082?style=flat-square&logo=gunicorn&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Motor-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-broker-DC382D?style=flat-square&logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-task_queue-37814A?style=flat-square&logo=celery&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1.x_LCEL-1C3C3C?style=flat-square&logo=langchain&logoColor=white)
![FAISS](https://img.shields.io/badge/FAISS-vector_search-0064B0?style=flat-square&logo=meta&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3-F55036?style=flat-square&logo=groq&logoColor=white)
![HuggingFace](https://img.shields.io/badge/HuggingFace-embeddings-FFD21E?style=flat-square&logo=huggingface&logoColor=black)
![PyMuPDF](https://img.shields.io/badge/PyMuPDF-PDF_extraction-3775A9?style=flat-square&logo=python&logoColor=white)
![SlowAPI](https://img.shields.io/badge/SlowAPI-rate_limiting-555555?style=flat-square&logo=fastapi&logoColor=white)
![python-jose](https://img.shields.io/badge/python--jose-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![bcrypt](https://img.shields.io/badge/bcrypt-passwords-4A154B?style=flat-square&logo=gnuprivacyguard&logoColor=white)

### Frontend

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-build-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-state-FF6B35?style=flat-square&logo=zustand&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-animations-EF0072?style=flat-square&logo=framer&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-charts-22B5BF?style=flat-square&logo=recharts&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=flat-square&logo=axios&logoColor=white)
![Sonner](https://img.shields.io/badge/Sonner-toasts-000000?style=flat-square&logo=vercel&logoColor=white)
![react-hook-form](https://img.shields.io/badge/react--hook--form-forms-EC5990?style=flat-square&logo=reacthookform&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-validation-3E67B1?style=flat-square&logo=zod&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide-icons-F56565?style=flat-square&logo=lucide&logoColor=white)

---

## Local development

### Prerequisites

- Docker Desktop — runs MongoDB + Redis
- Node.js 20+
- Python 3.14+

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

### 3. Backend

```bash
cd backend
python -m venv venv

source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

Create `backend/.env` — see [Environment variables](#environment-variables) below.

```bash
# Terminal 1 — API server
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Celery worker (Windows: --pool=solo)
python -m celery -A app.tasks.celery_app.celery_app worker --loglevel=info --pool=solo
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Environment variables

### `backend/.env`

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=studymind-ai

# Redis
REDIS_URL=redis://localhost:6379

# JWT
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Groq
GROQ_API_KEY=your-groq-api-key

# CORS
FRONTEND_ORIGIN=http://localhost:5173

# Set true in production (requires HTTPS)
COOKIE_SECURE=false
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Project structure

```
studymind-ai/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers — auth, chat, quiz, flashcards, study plan
│   │   ├── ai/              # LLM clients, embeddings, FAISS, LangChain chains
│   │   ├── core/            # Config, security, dependencies, rate limiter
│   │   ├── database/        # MongoDB connection + index setup
│   │   ├── models/          # Pydantic data models
│   │   ├── schemas/         # Request / response schemas
│   │   ├── services/        # Business logic layer
│   │   ├── tasks/           # Celery app + PDF processing task
│   │   └── main.py          # FastAPI entrypoint
│   ├── data/
│   │   └── faiss_indexes/   # Per-user FAISS index files (gitignored)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios helpers per feature
│   │   ├── components/      # Shared UI + feature components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Route-level page components
│   │   ├── store/           # Zustand stores
│   │   ├── utils/           # cn() and other utilities
│   │   ├── App.jsx          # Router + AnimatePresence
│   │   ├── main.jsx
│   │   └── index.css        # Tailwind v4 @theme tokens
│   ├── package.json
│   └── .env
├── docs/
│   ├── API.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT.md
│   └── screenshots/
├── docker-compose.yml
└── README.md
```

---

## Deployment

| Layer | Platform | Plan |
|---|---|---|
| Database | MongoDB Atlas | Free 512 MB shared cluster |
| Cache / Queue | Redis Cloud | Free 30 MB instance |
| Backend | Render | Free tier — builds from Dockerfile |
| Frontend | Vercel | Free — no cold starts |

Full guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## API reference

Interactive Swagger UI (local): [`http://localhost:8000/docs`](http://localhost:8000/docs)

Full endpoint reference: [docs/API.md](docs/API.md)

Database schema: [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

---

## Author

**Abhik Kundu** — B.Tech CS (AI/ML), KIIT University

[![GitHub](https://img.shields.io/badge/-GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/abhik-kundu09)
[![LinkedIn](https://img.shields.io/badge/-LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/abhik--kundu)
[![Email](https://img.shields.io/badge/-Email-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:itsabhik003@gmail.com)

---

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)