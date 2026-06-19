# School ERP System - Deployment Guide

## Prerequisites
- Docker & Docker Compose (for containerized deployment)
- Python 3.11+ (for local backend)
- Node.js 18+ (for local frontend)
- PostgreSQL 15+ (for database)
- Flutter SDK (for mobile app)

## Quick Start (Docker)

```bash
# Clone and navigate
cd school-management-system

# Build and run all services
docker-compose up --build -d

# Access
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Admin Login: username=superadmin, password=admin123
```

## Manual Setup

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb school_erp

# Run schema
psql -d school_erp -f database/init.sql
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your config
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Flutter App Setup
```bash
cd mobile_app
flutter pub get
flutter run
```

## Production Deployment (AWS EC2 / VPS)

### Using Docker (Recommended)
```bash
# Clone on server
git clone <repo-url>
cd school-management-system

# Update .env with production values
# Set strong SECRET_KEY, proper DB credentials

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Setup SSL with certbot
docker run --rm -p 80:80 -p 443:443 \
  -v nginx/ssl:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d your-domain.com
```

### Manual Server Deployment

```bash
# Install dependencies
sudo apt update
sudo apt install python3-pip postgresql nginx nodejs npm

# Setup Backend (using systemd)
sudo cp deployment/school-erp-backend.service /etc/systemd/system/
sudo systemctl enable school-erp-backend
sudo systemctl start school-erp-backend

# Setup Frontend (build static)
cd frontend
npm run build
sudo cp -r build/* /var/www/html/

# Configure Nginx
sudo cp nginx/nginx.conf /etc/nginx/sites-available/school-erp
sudo ln -s /etc/nginx/sites-available/school-erp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://postgres:postgres@localhost:5432/school_erp |
| SECRET_KEY | JWT signing key | (change in production) |
| SMTP_* | Email configuration | - |
| RAZORPAY_* | Payment gateway keys | - |
| TWILIO_* | SMS configuration | - |
| REDIS_URL | Redis connection for caching | redis://localhost:6379 |

## Database Migrations (Alembic)

```bash
cd backend
alembic init migrations
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

## Monitoring & Backup

### Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database Backup
```bash
docker exec school_erp_db pg_dump -U postgres school_erp > backup_$(date +%Y%m%d).sql
```

### Automated Backup (Cron)
```
0 2 * * * docker exec school_erp_db pg_dump -U postgres school_erp > /backups/school_erp_$(date +\%Y\%m\%d).sql
```

## Scaling

- **Horizontal Scaling**: Add more backend instances behind Nginx load balancer
- **Database**: Use PostgreSQL replication for read replicas
- **Caching**: Redis for session management and API caching
- **File Storage**: Use S3-compatible storage for uploaded files

## Security Checklist

- [ ] Change default SECRET_KEY
- [ ] Change default admin password
- [ ] Enable HTTPS with SSL certificate
- [ ] Set strong database passwords
- [ ] Configure CORS for your domain only
- [ ] Enable rate limiting
- [ ] Set up WAF (Web Application Firewall)
- [ ] Regular security updates
- [ ] Database backup automation
- [ ] Monitoring and alerting setup
