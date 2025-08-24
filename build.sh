#!/bin/bash

# Render Build Script for Research Matchmaking Application
echo "Starting Render build process..."

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Build React frontend
echo "Building React frontend..."
cd frontend
npm install
npm run build
cd ..

# Copy frontend build to app/static for FastAPI to serve
echo "Setting up static files..."
mkdir -p app/static
cp -r frontend/build/* app/static/

echo "Build process completed successfully!"
