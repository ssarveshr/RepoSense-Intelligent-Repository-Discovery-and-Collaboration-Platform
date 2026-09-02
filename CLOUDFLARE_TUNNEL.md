# RepoSense — Cloudflare Quick Tunnel Development

Expose your local RepoSense frontend and backend to the internet using **Cloudflare Quick Tunnels** — free, no account login, no custom domain, no DNS setup.

**Important:** Quick Tunnel URLs are **temporary**. Each time you restart `cloudflared`, you get new `*.trycloudflare.com` URLs. You must update `.env` files (and GitHub OAuth / Clerk when those URLs change).

LiveKit media stays **direct** to LiveKit Cloud — never tunnel WebRTC/WSS through Cloudflare.

---

## Architecture

```
Internet
   |
   +---------------------------+
   |                           |
   v                           v
https://xxxx.trycloudflare.com   https://yyyy.trycloudflare.com
   (frontend Quick Tunnel)         (backend Quick Tunnel)
   |                           |
   v                           v
localhost:5173               localhost:8000
   |                           |
   +-------------+-------------+
                 |
                 v
           LiveKit Cloud  ← browser connects directly (WSS)
                 wss://reposense-meetings-18f7x8bu.livekit.cloud
```

---

## Prerequisites

- RepoSense backend running on port **8000**
- RepoSense frontend (Vite) running on port **5173**
- `cloudflared` installed **or** use `npx cloudflared` (no global install required)

### Install cloudflared (optional)

```powershell
winget install Cloudflare.cloudflared
```

Verify:
```powershell
cloudflared --version
```

If not installed, use `npx --yes cloudflared` in the commands below.

---

## Daily workflow (4 terminals)

### Terminal 1 — Backend

```powershell
cd C:\Users\xxtri\Desktop\RepoSense\backend
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Frontend

```powershell
cd C:\Users\xxtri\Desktop\RepoSense\frontend
npm run dev
```

### Terminal 3 — Frontend Quick Tunnel

```powershell
cloudflared tunnel --url http://localhost:5173
```

Or without global install:
```powershell
npx --yes cloudflared tunnel --url http://localhost:5173
```

Copy the generated URL, e.g.:
```
https://random-words-here.trycloudflare.com
```
This is your **FRONTEND_QUICK_TUNNEL_URL**.

### Terminal 4 — Backend Quick Tunnel

```powershell
cloudflared tunnel --url http://localhost:8000
```

Or:
```powershell
npx --yes cloudflared tunnel --url http://localhost:8000
```

Copy the generated URL — your **BACKEND_QUICK_TUNNEL_URL**.

---

## Update `.env` files (every time Quick Tunnel URLs change)

Restart order matters: start tunnels first, copy URLs, update `.env`, then **restart backend and frontend**.

### `frontend/.env`

```env
VITE_API_BASE_URL=<BACKEND_QUICK_TUNNEL_URL>
VITE_LIVEKIT_URL=wss://reposense-meetings-18f7x8bu.livekit.cloud
```

Example:
```env
VITE_API_BASE_URL=https://yyyy.trycloudflare.com
```

### `backend/.env`

```env
FRONTEND_BASE_URL=<FRONTEND_QUICK_TUNNEL_URL>
API_BASE_URL=<BACKEND_QUICK_TUNNEL_URL>
CORS_ORIGINS=http://localhost:5173,<FRONTEND_QUICK_TUNNEL_URL>
GITHUB_OAUTH_REDIRECT_URI=<BACKEND_QUICK_TUNNEL_URL>/api/github/oauth/callback
LIVEKIT_URL=wss://reposense-meetings-18f7x8bu.livekit.cloud
```

Example:
```env
FRONTEND_BASE_URL=https://xxxx.trycloudflare.com
API_BASE_URL=https://yyyy.trycloudflare.com
CORS_ORIGINS=http://localhost:5173,https://xxxx.trycloudflare.com
GITHUB_OAUTH_REDIRECT_URI=https://yyyy.trycloudflare.com/api/github/oauth/callback
```

Then restart Terminal 1 (backend) and Terminal 2 (frontend).

---

## URL workflow checklist

1. Start backend and frontend locally
2. Start frontend Quick Tunnel → copy **FRONTEND_QUICK_TUNNEL_URL**
3. Start backend Quick Tunnel → copy **BACKEND_QUICK_TUNNEL_URL**
4. Set `VITE_API_BASE_URL` in `frontend/.env`
5. Set `FRONTEND_BASE_URL`, `API_BASE_URL`, `CORS_ORIGINS`, `GITHUB_OAUTH_REDIRECT_URI` in `backend/.env`
6. Restart backend and frontend
7. Update GitHub OAuth callback (manual — see below)
8. Update Clerk allowed origin (manual — see below)
9. Create meeting → send invitation → teammate opens public link

---

## Meeting invitations

Invitation emails use `FRONTEND_BASE_URL`:

```
<FRONTEND_QUICK_TUNNEL_URL>/meet/join/<short_code>
```

Never `localhost` when sharing with teammates.

---

## GitHub OAuth (manual update when backend URL changes)

In GitHub → Settings → Developer settings → OAuth Apps:

**Authorization callback URL:**
```
<BACKEND_QUICK_TUNNEL_URL>/api/github/oauth/callback
```

You must **manually update** this in GitHub Developer Settings whenever the backend Quick Tunnel URL changes. There is no wildcard callback support.

---

## Clerk (manual update when frontend URL changes)

In [Clerk Dashboard](https://dashboard.clerk.com/), add the current frontend Quick Tunnel URL:

```
<FRONTEND_QUICK_TUNNEL_URL>
```

Update allowed origins / redirect URLs whenever the frontend Quick Tunnel URL changes.

---

## Localhost-only development

Skip Terminals 3 and 4. Use defaults:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Leave `VITE_API_BASE_URL` unset or set to `http://localhost:8000`

---

## Verification

| Check | Expected |
|-------|----------|
| `http://localhost:8000/` | JSON `200` |
| `http://localhost:5173` | RepoSense loads |
| `<BACKEND_QUICK_TUNNEL_URL>/` | FastAPI JSON `200` |
| `<BACKEND_QUICK_TUNNEL_URL>/api/meetings` (no auth) | JSON `401` `{"detail":"Authentication required"}` |
| `<FRONTEND_QUICK_TUNNEL_URL>` | RepoSense loads |
| Browser API calls | Go to backend Quick Tunnel URL, not localhost |
| LiveKit WebSocket | `wss://reposense-meetings-18f7x8bu.livekit.cloud` |

CORS preflight example:
```powershell
curl.exe -i -X OPTIONS "<BACKEND_QUICK_TUNNEL_URL>/api/meetings" `
  -H "Origin: <FRONTEND_QUICK_TUNNEL_URL>" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,content-type"
```

Expect `Access-Control-Allow-Origin: <FRONTEND_QUICK_TUNNEL_URL>`.

---

## Limitations

| Topic | Quick Tunnel behavior |
|-------|----------------------|
| Cost | Free |
| Custom domain | Not required |
| URL stability | **Temporary** — changes on restart |
| GitHub OAuth | Must update callback manually when backend URL changes |
| Clerk | Must update allowed origin when frontend URL changes |
| LiveKit | Always direct to LiveKit Cloud |
| Production use | Not recommended — dev/collaboration only |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Vite "Blocked request" / invalid Host | Ensure `vite.config.js` has `allowedHosts: ['.trycloudflare.com']` and restart `npm run dev` |
| CORS error | Add current frontend Quick Tunnel URL to `CORS_ORIGINS` |
| API calls hit localhost on public site | Set `VITE_API_BASE_URL` and restart frontend |
| GitHub OAuth fails | Callback must exactly match current backend Quick Tunnel URL |
| Meeting invite has wrong link | Set `FRONTEND_BASE_URL` and restart backend |

---

## Security

- Never commit real `.env` files or tunnel credentials
- Quick Tunnels expose local dev servers to the internet — use for development only
- Keep `LIVEKIT_API_SECRET`, `GITHUB_CLIENT_SECRET`, SMTP passwords backend-only
