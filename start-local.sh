#!/bin/bash

# Start all services for local development

echo "🚀 Starting ACP Editor - Local Development Mode"
echo "================================================"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Store PIDs for cleanup
PIDS=()

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start services in background
echo ""
echo "📡 Starting local WebSocket broker..."
cd packages/tools
npm install --silent
npm run broker &
PIDS+=($!)
cd ../..

sleep 2

echo "🤖 Starting agent bridge..."
cd packages/agent-bridge
npm install --silent
npm start &
PIDS+=($!)
cd ../..

sleep 2

echo "🌐 Starting client server..."
cd packages/client
npm install --silent
npm run dev &
PIDS+=($!)
cd ../..

sleep 2

echo ""
echo "✅ All services started!"
echo ""
echo "🔗 Open your browser to: http://localhost:3000/?thread=test123"
echo "💡 Open the same URL in another tab to test collaboration"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for any service to exit
wait
