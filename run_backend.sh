#!/bin/bash
cd backend
# Check if venv exists in parent
if [ -d "../venv" ]; then
    source ../venv/bin/activate
elif [ -d "../.venv" ]; then
    source ../.venv/bin/activate
else
    echo "No virtual environment found. Please create one."
    exit 1
fi

uvicorn main:app --reload --host 0.0.0.0 --port 8000
