#!/bin/bash

# Stop and remove existing containers if they exist
echo "Stopping old containers..."
docker stop interview-frontend interview-backend interview_db interview-qdrant 2>/dev/null
docker rm interview-frontend interview-backend interview_db interview-qdrant 2>/dev/null

# Create network
docker network create interview_network 2>/dev/null || true

# 1. Start Database
echo "Starting Database..."
docker run -d \
  --name interview_db \
  --network interview_network \
  -p 5433:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=interview_agent \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Wait for DB to be ready (simple sleep for now, could use wait-for-it)
echo "Waiting for DB to initialize..."
sleep 5

# 1.5 Start Qdrant
echo "Starting Qdrant..."
docker run -d \
  --name interview-qdrant \
  --network interview_network \
  -p 6333:6333 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# 2. Start Backend
echo "Building and Starting Backend..."
docker build -t interview-backend ./backend
docker run -d \
  --name interview-backend \
  --network interview_network \
  -p 8000:8000 \
  -v "$(pwd)/backend:/app" \
  -e PYTHONUNBUFFERED=1 \
  -e DATABASE_URL=postgresql://postgres:postgres@interview_db:5432/interview_agent \
  -e QDRANT_URL=http://interview-qdrant:6333 \
  -e GOOGLE_CLIENT_ID=253400426353-2plko4sgdema9r1hj4c29hrmmreqe3qh.apps.googleusercontent.com \
  interview-backend

# 3. Start Frontend
echo "Building and Starting Frontend..."
docker build -t interview-frontend ./frontend
docker run -d \
  --name interview-frontend \
  --network interview_network \
  -p 5173:5173 \
  -v "$(pwd)/frontend:/app" \
  -v /app/node_modules \
  -e CHOKIDAR_USEPOLLING=true \
  interview-frontend

echo "----------------------------------------"
echo "Services started!"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8000"
echo "To stop: docker stop interview-frontend interview-backend interview_db"
