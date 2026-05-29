#!/bin/bash

echo "Starting Event Sync Service..."

cd backend
source venv/bin/activate
uvicorn main:app --port 8000 &
BACKEND_PID=$!
echo "Backend running on http://localhost:8000"

cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend running on http://localhost:5173"

echo ""
echo "App ready at http://localhost:5173"
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait