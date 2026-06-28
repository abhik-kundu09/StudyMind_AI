# StudyMind AI — Deployment Guide

Target stack: **MongoDB Atlas** + **Redis Cloud** + **Render** (backend) + **Vercel** (frontend)
Total cost: **$0** (all free tiers)

---

## Overview

| Step | Service | What you're doing |
|---|---|---|
| 1 | MongoDB Atlas | Create free cluster, get connection string |
| 2 | Redis Cloud | Create free instance, get Redis URL |
| 3 | GitHub | Push project to a repo |
| 4 | Render | Deploy FastAPI backend from Dockerfile |
| 5 | Vercel | Deploy React frontend |
| 6 | Test | E2E production smoke test |

---

## Step 1 — MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account.
2. Create a new **free shared cluster** (M0 tier, 512MB, pick any region).
3. Under **Database Access** → Add a database user with username + password. Save these.
4. Under **Network Access** → Add IP Address → choose **Allow access from anywhere** (`0.0.0.0/0`). This is required for Render's dynamic IPs.
5. Under **Databases** → Connect → **Connect your application** → Driver: Python, Version: 3.12+ → Copy the connection string.

Connection string format:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
```

Replace `<username>` and `<password>` with your database user credentials (not your Atlas login).
Append the database name: `...mongodb.net/studymind?retryWrites=true&w=majority`

---

## Step 2 — Redis Cloud

1. Go to [redis.io/try-free](https://redis.io/try-free) and create a free account.
2. Create a **free database** (30MB, Essentials plan).
3. Once created, click on the database → find **Public endpoint** and **Password**.

Redis URL format:
```
redis://:<password>@<host>:<port>
```

---

## Step 3 — Push to GitHub

Ensure your `.gitignore` excludes sensitive files:

```gitignore
# backend
backend/.env
backend/data/faiss_indexes/
backend/venv/
__pycache__/
*.pyc
*.pyo

# frontend
frontend/.env
frontend/node_modules/
frontend/dist/

# general
.DS_Store
*.log
```

```bash
git init
git add .
git commit -m "feat: StudyMind AI complete build"
git remote add origin https://github.com/abhik-kundu09/studymind-ai.git
git push -u origin main
```

---

## Step 4 — Deploy Backend on Render

### 4a. Create Dockerfile (if not already present)

Place this at `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System deps for PyMuPDF + FAISS
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

> Note: Use Python 3.11 in Docker for maximum compatibility with faiss-cpu and sentence-transformers, even though your local dev uses 3.14.

### 4b. Create Render Web Service

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub account → select the `studymind-ai` repository
3. Configure:
   - **Name:** `studymind-ai-backend`
   - **Root directory:** `backend`
   - **Environment:** Docker
   - **Dockerfile path:** `./Dockerfile`
   - **Instance type:** Free

### 4c. Set environment variables on Render

In the Render dashboard → Environment → Add the following:

```
MONGODB_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/studymind?retryWrites=true&w=majority
DATABASE_NAME=studymind
REDIS_URL=redis://:<password>@<host>:<port>
SECRET_KEY=<generate a random 64-char string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
GROQ_API_KEY=<your groq api key>
FRONTEND_ORIGIN=https://studymind-ai.vercel.app
COOKIE_SECURE=true
```

> For `SECRET_KEY`, generate one with: `python -c "import secrets; print(secrets.token_hex(32))"`

4. Click **Deploy**. First build takes ~5–8 minutes (installing faiss-cpu + sentence-transformers).

Your backend URL will be: `https://studymind-ai-backend.onrender.com`

### 4d. Celery worker on Render (optional for portfolio)

Quiz and study plan generation is synchronous in the current build — Celery is only used for PDF processing. For a portfolio demo you can skip deploying the Celery worker. PDF uploads will remain in `PROCESSING` status on production until a worker is added.

To add it later: create a second Render service (Background Worker type) with start command:
```
celery -A app.tasks.celery_app.celery_app worker --loglevel=info --concurrency=1
```

---

## Step 5 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub → select `studymind-ai`
2. Configure:
   - **Root directory:** `frontend`
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Add environment variable:
   ```
   VITE_API_URL=https://studymind-ai-backend.onrender.com/api/v1
   ```
4. Click **Deploy**.

Your frontend URL will be: `https://studymind-ai.vercel.app`

### 5a. Update Render CORS origin

Once you have the Vercel URL, go back to Render → Environment → update:
```
FRONTEND_ORIGIN=https://studymind-ai.vercel.app
```

Trigger a redeploy on Render.

---

## Step 6 — E2E Production Smoke Test

Run through this checklist after both services are live:

- [ ] Register a new account
- [ ] Log in — verify access token received, refresh cookie set
- [ ] Upload a PDF — verify status transitions to `READY` (requires Celery worker) or stays `PROCESSING` (without worker)
- [ ] Open Chat — send a message — verify SSE streaming works
- [ ] Generate a Quiz — verify questions appear
- [ ] Take the Quiz — submit answers — verify score recorded
- [ ] Generate a Study Plan — verify blocks appear
- [ ] Mark a study block complete
- [ ] Generate a Flashcard deck
- [ ] Review 3–4 cards with quality ratings
- [ ] Check Dashboard — verify Recharts activity graph populates
- [ ] Log out — verify refresh cookie is cleared
- [ ] Attempt to access `/dashboard` after logout — verify redirect to `/login`

---

## Common Issues

| Issue | Fix |
|---|---|
| Backend cold start (30–50s) | Expected on Render free tier. Warn users or add an uptime ping service. |
| CORS error on frontend | Confirm `FRONTEND_ORIGIN` on Render exactly matches your Vercel URL (no trailing slash) |
| MongoDB connection timeout | Check Atlas Network Access — `0.0.0.0/0` must be whitelisted |
| FAISS index missing on Render | Render free tier has ephemeral storage — FAISS indexes reset on redeploy. For persistence, migrate to Atlas Vector Search or mount a Render Disk (paid). |
| `COOKIE_SECURE=true` but cookies not set | Verify both frontend and backend are on HTTPS (they will be on Vercel + Render) |
| sentence-transformers slow first load | Model downloads on first request. Bake it into the Docker image with a warm-up script if needed. |

---

## FAISS Persistence Note

Render's free tier uses **ephemeral storage** — files written to disk (your FAISS indexes at `data/faiss_indexes/`) are lost on every redeploy or restart. This means users would need to re-upload PDFs after each restart.

Options:
1. **Acceptable for portfolio** — just note it in the README
2. **Render Disk** ($1/month) — mount a persistent disk at `data/`
3. **Future migration** — replace FAISS with MongoDB Atlas Vector Search (no disk required)

---

## Updating the Deployment

After making local changes:

```bash
git add .
git commit -m "fix: description of change"
git push origin main
```

Render and Vercel auto-deploy on push to `main`.