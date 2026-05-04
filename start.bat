@echo off
echo ==========================================
echo Starting RepoSense Platform
echo ==========================================

echo Starting Backend Server...
start "RepoSense Backend" cmd /c "cd backend && pip install -r requirements.txt && python -m src.main"

echo Starting Frontend Server...
start "RepoSense Frontend" cmd /c "cd frontend && npm install && npm run dev"

echo Starting WebRTC Service...
start "RepoSense WebRTC" cmd /c "cd webrtc-call && pip install flask flask-socketio pyngrok && python app.py"

echo.
echo Servers are starting in separate windows.
echo - Backend API will be available at http://localhost:8000
echo - Frontend App will be available at http://localhost:5173
echo - WebRTC Service will be available at http://localhost:5000
echo.
pause
