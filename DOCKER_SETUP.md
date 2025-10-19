# 🚀 Docker Setup Guide

**Quick setup guide for VMS Docker environment**

---

## 📋 Prerequisites

```bash
# 1. Check system requirements
lscpu | grep "Model name"  # Intel CPU with QuickSync
free -h                     # 8GB+ RAM recommended
df -h                       # 100GB+ free space

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Verify installation
docker --version            # Docker 24.0+
docker compose version      # Docker Compose 2.20+
```

---

## 🔧 Initial Setup

```bash
# 1. Navigate to project
cd /home/camera/app/vms

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your values
nano .env

# 4. Create data directories
mkdir -p data/recordings
touch data/recordings/.gitkeep

# 5. Verify Intel QuickSync
sudo apt install -y vainfo intel-gpu-tools
vainfo

# Expected output should show:
# - VAProfileH264Main
# - VAProfileHEVC
# - VAEntrypointVLD (decode)
# - VAEntrypointEncSlice (encode)
```

---

## 🐳 Docker Commands

### **Start Services:**

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d postgres redis

# Start with logs
docker compose up
```

### **View Logs:**

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f recorder

# Last 100 lines
docker compose logs --tail=100
```

### **Stop Services:**

```bash
# Stop all
docker compose down

# Stop and remove volumes
docker compose down -v

# Stop specific service
docker compose stop api
```

### **Restart Services:**

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart recorder
```

### **Check Status:**

```bash
# View running containers
docker compose ps

# View resource usage
docker stats

# Health checks
docker compose ps --format json | jq '.[] | {name: .Name, health: .Health}'
```

---

## 🔍 Debugging

### **Access Container Shell:**

```bash
# API container
docker compose exec api sh

# Recorder container
docker compose exec recorder bash

# Database
docker compose exec postgres psql -U vms_user -d vms
```

### **Check QuickSync in Container:**

```bash
# Verify QSV device
docker compose exec recorder ls -la /dev/dri/

# Run vainfo inside container
docker compose exec recorder vainfo

# Check FFmpeg QSV support
docker compose exec recorder ffmpeg -encoders | grep qsv
```

### **Database Access:**

```bash
# psql shell
docker compose exec postgres psql -U vms_user -d vms

# List tables
docker compose exec postgres psql -U vms_user -d vms -c "\dt"

# Check cameras
docker compose exec postgres psql -U vms_user -d vms -c "SELECT * FROM cameras;"
```

---

## 🧪 Testing with Simulated Cameras

```bash
# Start with test profile (includes RTSP simulator)
docker compose --profile testing up -d

# RTSP simulator will be available at:
# rtsp://localhost:8554/stream1
# rtsp://localhost:8554/stream2
# etc.

# Add test videos to testing/videos/ directory
# MediaMTX will stream them automatically
```

---

## 📊 Service Endpoints

```yaml
API Server:
  URL: http://localhost:3000
  Health: http://localhost:3000/health
  Swagger: http://localhost:3000/api/docs

Frontend:
  URL: http://localhost:8080
  
Database:
  Host: localhost:5432
  Database: vms
  User: vms_user
  Password: (from .env)

Redis:
  Host: localhost:6379

RTSP Simulator (testing profile):
  RTSP: rtsp://localhost:8554
  HLS: http://localhost:8888
  WebRTC: http://localhost:8889
```

---

## 🔧 Troubleshooting

### **Issue: QuickSync not working**

```bash
# 1. Check /dev/dri exists
ls -la /dev/dri/

# 2. Check permissions
sudo chmod -R 777 /dev/dri/

# 3. Verify user in 'render' group
sudo usermod -aG render $USER

# 4. Restart container
docker compose restart recorder
```

### **Issue: Database connection failed**

```bash
# 1. Check postgres is running
docker compose ps postgres

# 2. Check logs
docker compose logs postgres

# 3. Test connection
docker compose exec postgres pg_isready -U vms_user

# 4. Reset database
docker compose down -v
docker compose up -d postgres
```

### **Issue: Port already in use**

```bash
# 1. Find process using port
sudo lsof -i :3000

# 2. Kill process or change port in .env
# 3. Restart services
docker compose down
docker compose up -d
```

### **Issue: Out of disk space**

```bash
# 1. Check docker disk usage
docker system df

# 2. Clean unused images
docker image prune -a

# 3. Clean volumes (careful!)
docker volume prune

# 4. Check recordings directory
du -sh data/recordings/
```

---

## 🔄 Development Workflow

### **Hot Reload (Development):**

```bash
# API changes auto-reload
# Frontend changes auto-reload at http://localhost:3001

# For recorder (C++), rebuild:
docker compose build recorder
docker compose up -d recorder
```

### **Rebuild Services:**

```bash
# Rebuild all
docker compose build

# Rebuild specific service
docker compose build api
docker compose build --no-cache recorder

# Rebuild and restart
docker compose up -d --build
```

### **Update Dependencies:**

```bash
# API
docker compose exec api npm install <package>
docker compose restart api

# Frontend
docker compose exec frontend npm install <package>
docker compose restart frontend
```

---

## 📦 Production Deployment

```bash
# 1. Update .env for production
NODE_ENV=production
BUILD_TARGET=production

# 2. Build production images
docker compose build --no-cache

# 3. Start production stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Enable auto-restart
docker compose up -d --restart unless-stopped
```

---

## 🔒 Security Checklist

- [ ] Change default passwords in `.env`
- [ ] Generate strong `JWT_SECRET`
- [ ] Update database password
- [ ] Configure firewall rules
- [ ] Enable HTTPS (reverse proxy)
- [ ] Restrict network access
- [ ] Regular backups
- [ ] Monitor logs

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [FFmpeg QSV Documentation](https://trac.ffmpeg.org/wiki/Hardware/QuickSync)
- Project Documentation: `docs/`

---

## 🆘 Getting Help

```bash
# View service health
docker compose ps

# View resource usage
docker stats

# Export logs for debugging
docker compose logs > vms-logs.txt

# Check configuration
docker compose config
```

---

**Last Updated**: October 19, 2025
