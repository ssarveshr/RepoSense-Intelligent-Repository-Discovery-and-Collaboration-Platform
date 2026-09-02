@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
cd /d "%ROOT%" || (
  echo [ERROR] Could not change to RepoSense root: %ROOT%
  exit /b 1
)

echo ==========================================
echo Starting RepoSense Platform (Dev + Tunnel)
echo ==========================================
echo.

if not exist "backend\src\main.py" (
  echo [ERROR] backend\src\main.py not found. Run this script from the RepoSense repo root.
  exit /b 1
)

if not exist "frontend\package.json" (
  echo [ERROR] frontend\package.json not found.
  exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python was not found on PATH. Install Python 3 and try again.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found on PATH. Install Node.js and try again.
  exit /b 1
)

if not exist "frontend\node_modules\" (
  echo [ERROR] Frontend dependencies are missing.
  echo         Run once: cd frontend ^&^& npm install
  exit /b 1
)

set "CLOUDFLARED_CMD="
where cloudflared >nul 2>&1
if not errorlevel 1 (
  set "CLOUDFLARED_CMD=cloudflared"
) else (
  where npx >nul 2>&1
  if not errorlevel 1 (
    echo [INFO] cloudflared not found globally; using npx --yes cloudflared
    set "CLOUDFLARED_CMD=npx --yes cloudflared"
  ) else (
    echo [ERROR] cloudflared is not installed and npx is unavailable.
    echo         Install with: winget install Cloudflare.cloudflared
    echo         Or install Node.js so npx can run cloudflared on demand.
    exit /b 1
  )
)

echo Starting Backend Server...
start "RepoSense Backend" cmd /k "cd /d ""%ROOT%backend"" && echo RepoSense Backend - http://localhost:8000 && python -m src.main"

echo Starting Frontend Server...
start "RepoSense Frontend" cmd /k "cd /d ""%ROOT%frontend"" && echo RepoSense Frontend - http://localhost:5173 && npm run dev"

echo Waiting a few seconds for local servers to bind...
timeout /t 3 /nobreak >nul

echo Starting Frontend Quick Tunnel (public UI entry point)...
start "RepoSense Tunnel (Frontend)" cmd /k "echo RepoSense Frontend Quick Tunnel - copy the https://*.trycloudflare.com URL from below && %CLOUDFLARED_CMD% tunnel --url http://127.0.0.1:5173"

echo Starting Backend Quick Tunnel (public API for browser/OAuth)...
start "RepoSense Tunnel (Backend)" cmd /k "echo RepoSense Backend Quick Tunnel - copy the https://*.trycloudflare.com URL from below && %CLOUDFLARED_CMD% tunnel --url http://127.0.0.1:8000"

echo.
echo ==========================================
echo RepoSense dev launcher finished
echo ==========================================
echo Local:
echo   Backend  - http://localhost:8000
echo   Frontend - http://localhost:5173
echo.
echo Cloudflare Quick Tunnels (temporary URLs):
echo   1. Copy FRONTEND URL from "RepoSense Tunnel (Frontend)"
echo   2. Copy BACKEND URL from "RepoSense Tunnel (Backend)"
echo   3. Update frontend/.env:
echo        VITE_API_BASE_URL=^<BACKEND_QUICK_TUNNEL_URL^>
echo   4. Update backend/.env:
echo        FRONTEND_BASE_URL=^<FRONTEND_QUICK_TUNNEL_URL^>
echo        API_BASE_URL=^<BACKEND_QUICK_TUNNEL_URL^>
echo        CORS_ORIGINS=http://localhost:5173,^<FRONTEND_QUICK_TUNNEL_URL^>
echo        GITHUB_OAUTH_REDIRECT_URI=^<BACKEND_QUICK_TUNNEL_URL^>/api/github/oauth/callback
echo   5. Restart Backend and Frontend windows after .env changes
echo   6. Update GitHub OAuth callback and Clerk allowed origin manually
echo.
echo Architecture: Browser -^> Frontend tunnel -^> Vite :5173
echo                Browser API calls -^> Backend tunnel -^> FastAPI :8000
echo                LiveKit media stays direct to LiveKit Cloud (not tunneled)
echo.
echo See CLOUDFLARE_TUNNEL.md for full workflow and troubleshooting.
echo.

endlocal
