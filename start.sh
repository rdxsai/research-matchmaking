#!/bin/bash

# Build frontend if not already built
if [ ! -d "app/static" ]; then
    echo "Building React frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    mkdir -p app/static
    cp -r frontend/build/* app/static/
fi

# Start FastAPI server
echo "Starting FastAPI server..."
cd app
python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
