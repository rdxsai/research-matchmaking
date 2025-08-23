#!/bin/bash

# Research Matchmaking Application Deployment Script
# Run this script on your server after cloning the repository

set -e  # Exit on any error

echo "🚀 Starting Research Matchmaking Application Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib redis-server git curl nodejs npm

# Install pgvector extension
echo "🗄️ Installing pgvector extension..."
sudo apt install -y postgresql-14-pgvector

# Create application directory structure
echo "📁 Creating application directories..."
sudo mkdir -p /var/www/matchmaking
sudo chown -R $USER:$USER /var/www/matchmaking

# Setup Python virtual environment
echo "🐍 Setting up Python virtual environment..."
cd /var/www/matchmaking
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Setup database
echo "🗃️ Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
CREATE DATABASE matchmaking_db;
CREATE USER matchmaking_user WITH PASSWORD 'secure_password_change_me';
GRANT ALL PRIVILEGES ON DATABASE matchmaking_db TO matchmaking_user;
\c matchmaking_db
CREATE EXTENSION vector;
\q
EOF

# Create environment file
echo "⚙️ Creating environment configuration..."
cp .env.example .env
echo "⚠️  IMPORTANT: Edit /var/www/matchmaking/.env with your production values!"

# Build frontend
echo "🎨 Building React frontend..."
cd frontend
npm install
npm run build
cd ..

# Create systemd service files
echo "🔄 Creating systemd services..."

# FastAPI service
sudo tee /etc/systemd/system/matchmaking-api.service > /dev/null << EOF
[Unit]
Description=Matchmaking FastAPI
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/matchmaking
Environment=PATH=/var/www/matchmaking/venv/bin
ExecStart=/var/www/matchmaking/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Celery worker service
sudo tee /etc/systemd/system/matchmaking-worker.service > /dev/null << EOF
[Unit]
Description=Matchmaking Celery Worker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/matchmaking
Environment=PATH=/var/www/matchmaking/venv/bin
ExecStart=/var/www/matchmaking/venv/bin/celery -A app.celery_app worker --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/matchmaking > /dev/null << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain

    # Frontend (React build)
    location / {
        root /var/www/matchmaking/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/matchmaking/frontend/build/static/;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/matchmaking /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

# Set proper permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data /var/www/matchmaking
sudo chmod +x /var/www/matchmaking/venv/bin/*

# Enable and start services
echo "🎬 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable matchmaking-api matchmaking-worker nginx redis-server postgresql
sudo systemctl start matchmaking-api matchmaking-worker nginx redis-server postgresql

# Run database migrations
echo "🗄️ Running database migrations..."
source venv/bin/activate
python app/migrate_proof_of_work.py

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit /var/www/matchmaking/.env with your production values"
echo "2. Update your domain in /etc/nginx/sites-available/matchmaking"
echo "3. Setup SSL with: sudo certbot --nginx -d yourdomain.com"
echo "4. Restart services: sudo systemctl restart matchmaking-api nginx"
echo ""
echo "🔍 Check status with:"
echo "  sudo systemctl status matchmaking-api"
echo "  sudo systemctl status matchmaking-worker"
echo "  sudo systemctl status nginx"
