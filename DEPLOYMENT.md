# Research Matchmaking Application - Deployment Guide

## Quick Deployment Steps

### 1. Push to GitHub
```bash
# On your local machine
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 2. SSH into Your Server
```bash
ssh username@your-server-ip
```

### 3. Clone and Deploy
```bash
# On the server
cd /var/www
sudo git clone https://github.com/yourusername/matchmaking.git
cd matchmaking
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

### 4. Configure Production Settings
```bash
# Edit environment variables
sudo nano /var/www/matchmaking/.env

# Update these values:
DATABASE_URL=postgresql://matchmaking_user:YOUR_SECURE_PASSWORD@localhost/matchmaking_db
SECRET_KEY=YOUR_SUPER_SECRET_KEY_HERE
CORS_ORIGINS=https://yourdomain.com

# Update Nginx configuration with your domain
sudo nano /etc/nginx/sites-available/matchmaking
# Change "server_name _;" to "server_name yourdomain.com;"
```

### 5. Setup SSL (Optional but Recommended)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 6. Restart Services
```bash
sudo systemctl restart matchmaking-api nginx
```

## Application Architecture

- **Frontend**: React app served by Nginx at `/`
- **Backend**: FastAPI at `/api/`
- **Database**: PostgreSQL with pgvector extension
- **Background Tasks**: Celery workers with Redis

## Service Management

### Check Status
```bash
sudo systemctl status matchmaking-api
sudo systemctl status matchmaking-worker
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server
```

### View Logs
```bash
sudo journalctl -u matchmaking-api -f
sudo journalctl -u matchmaking-worker -f
sudo tail -f /var/log/nginx/access.log
```

### Restart Services
```bash
sudo systemctl restart matchmaking-api
sudo systemctl restart matchmaking-worker
sudo systemctl restart nginx
```

## Updating the Application

```bash
cd /var/www/matchmaking
sudo git pull origin main
cd frontend && sudo npm run build && cd ..
sudo systemctl restart matchmaking-api matchmaking-worker
```

## Troubleshooting

### Common Issues

1. **Port 8000 already in use**
   ```bash
   sudo lsof -i :8000
   sudo kill -9 <PID>
   ```

2. **Database connection issues**
   ```bash
   sudo -u postgres psql
   \l  # List databases
   \du # List users
   ```

3. **Nginx configuration test**
   ```bash
   sudo nginx -t
   ```

4. **Check if services are running**
   ```bash
   sudo systemctl is-active matchmaking-api
   sudo systemctl is-active nginx
   ```

## Security Checklist

- [ ] Change default database password
- [ ] Set strong SECRET_KEY in .env
- [ ] Configure firewall (UFW)
- [ ] Setup SSL certificates
- [ ] Regular security updates
- [ ] Database backups

## File Locations

- Application: `/var/www/matchmaking/`
- Nginx config: `/etc/nginx/sites-available/matchmaking`
- Service files: `/etc/systemd/system/matchmaking-*.service`
- Logs: `/var/log/nginx/` and `journalctl`
- Environment: `/var/www/matchmaking/.env`
