@echo off
echo Starting Event Sync Service...

start "Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --port 8000"
timeout /t 2 /nobreak > nul
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Backend running on http://localhost:8000
echo Frontend running on http://localhost:5173
echo App ready at http://localhost:5173