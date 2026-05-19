#!/bin/bash
# Tamarine Dev Server — starts both frontend and backend
set -e

echo "Starting Tamarine development servers..."
echo ""

# Start backend
cd "$(dirname "$0")/../server"
npx tsx src/index.ts &
SERVER_PID=$!
echo "Backend: http://localhost:3001 (PID: $SERVER_PID)"

# Start frontend
cd "$(dirname "$0")/../client"
npx vite --host &
CLIENT_PID=$!
echo "Frontend: http://localhost:5173 (PID: $CLIENT_PID)"

echo ""
echo "Press Ctrl+C to stop both servers"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SERVER_PID 2>/dev/null
  kill $CLIENT_PID 2>/dev/null
  exit 0
}

trap cleanup INT TERM
wait
