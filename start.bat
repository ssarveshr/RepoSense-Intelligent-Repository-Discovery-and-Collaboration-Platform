@echo off
echo ==========================================
echo Starting RepoSense Platform
echo ==========================================

echo Starting Ollama...
@REM start "RepoSense Ollama" cmd /c "ollama run llama3.2:3b"

echo Starting Backend Server...
start "RepoSense Backend" cmd /c "cd backend && py -m src.main"

echo Starting Frontend Server...
start "RepoSense Frontend" cmd /c "cd frontend && npm install && npm run dev"

echo.
echo Servers are starting in separate windows.
echo - Backend API will be available at http://localhost:8000
echo - Frontend App will be available at http://localhost:5173
echo.
pause
