# RepoSense

RepoSense is a repository discovery and developer-collaboration platform. It combines semantic search, local LLM summarization, an AI code agent, GitHub-connected profiles, and LiveKit meetings.

## Key features

- **Discover** — Natural-language search and a trending feed over GitHub repositories (ChromaDB + Sentence-Transformers).
- **GitHub Summarizer** — Architectural summaries of a GitHub repo via the GitHub API (no clone required), using a local Ollama model.
- **AI Code Agent** — Explain, modify, and audit repository code with the local LLM.
- **Meetings** — Authenticated meeting creation, invitations, and LiveKit Cloud video (media does not go through Cloudflare tunnels).
- **Profile** — Clerk identity, GitHub OAuth connection, and account sign-out on the Profile page.

## Repository structure

```text
/
├── backend/                 FastAPI API, services, tests, SQLite + Chroma storage
│   ├── src/                 Application code (api, services, integrations, config)
│   ├── tests/               pytest suite
│   ├── scripts/             Optional local diagnostics (not required at runtime)
│   ├── .env.example         Backend config template (copy to .env)
│   └── requirements.txt
├── frontend/                React (Vite) UI
│   ├── src/                 Pages, components, hooks, services
│   ├── .env.example         Frontend config template (copy to .env)
│   └── package.json
├── docs/                    Research, invention disclosure, and project reports
├── test/                    Evaluation notes used for reports
├── start.bat                Windows launcher: local servers + Cloudflare Quick Tunnels
├── CLOUDFLARE_TUNNEL.md     Public-dev tunnel workflow and troubleshooting
└── README.md                This file
```

## Prerequisites

- **Python 3.10+** (backend uses `str | None` type syntax)
- **Node.js 20+** and npm (Vite 8)
- **Ollama** for summarizer and AI agent features
- Optional: **Clerk** account (auth), **GitHub OAuth app**, **LiveKit Cloud** project, **SMTP** for invitation emails, **cloudflared** or `npx` for public tunnels

## First-time setup

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` with your values. Do not commit it.

### Frontend

```powershell
cd frontend
npm install
copy .env.example .env
```

Edit `frontend/.env` with your values. Set `VITE_API_BASE_URL` to the backend origin. Restart `npm run dev` after any Vite env change (`VITE_*` values are baked in at process start). Production builds require a rebuild after changing `VITE_API_BASE_URL`.

## Environment configuration

Use the templates. Never put real secrets in git or in this README.

**Frontend (`frontend/.env`)**

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Public backend URL (baked at Vite start / build). Local example: `http://localhost:8000`. Required for production builds. |
| `VITE_FRONTEND_BASE_URL` | Optional public frontend origin for shareable meet links |
| `VITE_LIVEKIT_URL` | Optional LiveKit WebSocket URL (join API also returns `livekit_url`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_...` / `pk_live_...`) |

**Backend (`backend/.env`)**

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite URL (default local file under `backend/`) |
| `FRONTEND_BASE_URL` | Public frontend origin (invitation links) |
| `API_BASE_URL` | Public API origin |
| `CORS_ORIGINS` | Comma-separated allowed origins (`*` is rejected) |
| `ENVIRONMENT` | `development` (default) or `production` (requires public URL env vars) |
| `CLERK_JWKS_URL` / `CLERK_ISSUER` / `CLERK_AUDIENCE` | Clerk JWT verification |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` | LiveKit Cloud |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_OAUTH_REDIRECT_URI` | GitHub OAuth |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Encrypts stored GitHub tokens |
| `GITHUB_TOKEN` | Optional app-level GitHub token (rate limits / private collab listing) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Optional invitation email |
| `OLLAMA_URL` / `OLLAMA_MODEL` | Optional; defaults documented below |

A leftover public/tunnel backend URL in `VITE_API_BASE_URL` will break **local** Meetings and Profile. For local-only work, use `http://localhost:8000`.

Cloudflare Quick Tunnel hostnames change whenever the tunnel is recreated. Put the live backend URL in `frontend/.env` as `VITE_API_BASE_URL` and restart Vite. Never put those hostnames in source.

## Run locally (Windows PowerShell)

Two terminals. Do **not** use a Vite proxy; the frontend calls `VITE_API_BASE_URL` through the centralized API client.

**Terminal 1 — backend**

```powershell
cd backend
python -m src.main
```

This starts Uvicorn on `0.0.0.0:8000` with reload (`src.main`).

**Terminal 2 — frontend**

```powershell
cd frontend
npm run dev
```

Vite listens on `http://localhost:5173` (`--host 0.0.0.0`).

### Local URLs

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Health check | http://localhost:8000/ (`GET /`) |
| OpenAPI docs | http://localhost:8000/docs |

## `start.bat` (local servers + Cloudflare tunnels)

From the **repository root**:

```powershell
.\start.bat
```

`start.bat` starts:

1. Backend — `python -m src.main` (port 8000)
2. Frontend — `npm run dev` (port 5173)
3. A Cloudflare Quick Tunnel to the frontend (`127.0.0.1:5173`)
4. A Cloudflare Quick Tunnel to the backend (`127.0.0.1:8000`)

Quick Tunnel URLs are **temporary**. After you copy them:

1. Set `VITE_API_BASE_URL` in `frontend/.env` to the backend tunnel URL, then restart the Frontend window (`npm run dev`). Production deploys need a rebuild.
2. Set `FRONTEND_BASE_URL`, `API_BASE_URL`, `CORS_ORIGINS`, and `GITHUB_OAUTH_REDIRECT_URI` in `backend/.env` (see `backend/.env.example`), then restart the backend.
3. Update the GitHub OAuth callback and Clerk allowed origins to match the new URLs.
4. Do **not** tunnel LiveKit. Browsers connect to LiveKit Cloud directly. Backend CORS and OAuth URLs must independently match the active frontend and backend origins.

Requires `frontend/node_modules` (`npm install` once). Uses `cloudflared` if installed, otherwise `npx --yes cloudflared`.

Full tunnel checklist: [CLOUDFLARE_TUNNEL.md](./CLOUDFLARE_TUNNEL.md).

## Ollama (summarizer and AI agent)

Default model in `backend/src/services/summarizer_service.py`: **`qwen2.5-coder:3b`** (overridable with `OLLAMA_MODEL`). The agent prefers `OLLAMA_MODEL` if set; otherwise it picks an installed coder/llama/qwen-style model.

```powershell
ollama pull qwen2.5-coder:3b
ollama serve
```

Ollama default URL: `http://127.0.0.1:11434` (`OLLAMA_URL`).

## Tests and production build

**Frontend** (from `frontend/`):

```powershell
cd frontend
npm test
npm run build
```

**Backend** (from `backend/`, with your venv activated):

```powershell
cd backend
python -m pytest
```

Backend tests expect `pytest` and `pytest-asyncio` in the environment (they are not listed in `requirements.txt`; install them if `python -m pytest` fails to start).

## External services and limitations

- **Clerk** is required for signed-in routes (Profile, Meetings, Summarizer, AI Agent, repository details).
- **GitHub OAuth** is required for per-user GitHub connection (collaborators, private listing). Callback must match `GITHUB_OAUTH_REDIRECT_URI` exactly.
- **LiveKit Cloud** is required for real meeting media. STUN/TURN is provided by LiveKit; do not put LiveKit through Cloudflare.
- **SMTP** is optional; without it, meeting invites cannot be emailed.
- Semantic search needs an indexed Chroma store under `backend/storage/` (populated by the discovery/crawler path).
- There is **no Vite dev-server proxy**. CORS must allow the frontend origin.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Meetings/Profile “Unable to reach …” a dead public URL | Stale `VITE_API_BASE_URL`. Point it at the current backend and restart Vite (or rebuild). |
| Frontend loads, API calls fail | Backend not running; CORS origin missing `http://localhost:5173`; wrong `VITE_API_BASE_URL`. |
| Clerk sign-in loops or 401s | Publishable key, JWKS/issuer, and allowed origins must match the URL you actually open. |
| GitHub connect fails after tunnel restart | Update GitHub OAuth callback to the new backend tunnel + `/api/github/oauth/callback`. |
| Summarizer/agent empty or timeout | `ollama serve` running; `ollama pull qwen2.5-coder:3b`; wait for first-load model. |
| Port 8000 or 5173 in use | Stop the other process, or change the port and update env URLs to match. |
| `start.bat` fails on npm | Run `cd frontend; npm install` once. |
| Vite env change has no effect | Stop and restart `npm run dev`. |

## Research and legal records

Project reports, invention disclosure, and research paper sources live in [`docs/`](./docs/). Evaluation notes are in [`test/`](./test/).

---
RepoSense — semantic discovery and developer collaboration.
