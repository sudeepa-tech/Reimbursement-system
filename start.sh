#!/bin/bash
# ReimbursePro - one-command local startup (requires Node.js 18+ and Tesseract OCR installed)
set -e

echo "Installing backend dependencies..."
cd backend
npm install
if [ ! -f db/db.json ]; then
  echo "Seeding database with 50 sample users & claims..."
  npm run seed
fi
echo "Starting backend on http://localhost:5000 ..."
npm run dev &
BACKEND_PID=$!
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install
echo "Starting frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "ReimbursePro is running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers."
trap "kill $BACKEND_PID $FRONTEND_PID" INT TERM
wait
