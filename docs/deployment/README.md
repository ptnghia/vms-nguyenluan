# Deployment Guide

**Purpose:** Deployment procedures and guides

---

## 🚀 **Quick Deployment**

### **Prerequisites:**
```bash
# Ubuntu 22.04 LTS
# NVIDIA GPU with NVENC/NVDEC support
# NVIDIA Driver 535+ installed
# FFmpeg 6.1.1+ with CUDA support
# PostgreSQL 14+
# Node.js 18+
# PM2 installed globally
```

### **1. Clone Repository:**
```bash
cd /home/camera/app
git clone <repository-url> vms
cd vms
```

### **2. Setup Database:**
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE vms;
CREATE USER vms_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vms TO vms_user;
\q

# Create tables
psql -h localhost -U vms_user -d vms -f schema.sql
```

### **3. Configure Environment:**
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env
nano .env

# Required variables:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=vms
# DB_USER=vms_user
# DB_PASSWORD=your_password
```

### **4. Build Recorder:**
```bash
cd services/recorder
mkdir build
cd build
cmake ..
make
```

### **5. Start Services:**
```bash
# From project root
pm2 start ecosystem.config.js

# Check status
pm2 list
```

---

## 📋 **System Requirements**

### **Minimum:**
```yaml
CPU: Intel Core i5 (6 cores) or equivalent
GPU: NVIDIA GTX 1650 or better (NVENC support)
RAM: 8 GB
Storage: 256 GB SSD
Network: 100 Mbps
```

### **Recommended (Current Production):**
```yaml
CPU: Intel Core i5-14500 (14 cores, 20 threads)
GPU: NVIDIA RTX 3050 6GB
RAM: 16 GB DDR4
Storage: 512 GB NVMe SSD
Network: 1 Gbps Ethernet
```

### **For 12 Cameras:**
```yaml
CPU: Intel Core i7 or i9 (16+ cores)
GPU: NVIDIA RTX 3060 or better
RAM: 32 GB DDR4
Storage: 1 TB NVMe SSD (or more)
Network: 1 Gbps Ethernet
```

---

## 🔧 **Configuration**

### **PM2 Configuration (ecosystem.config.js):**
```javascript
module.exports = {
  apps: [
    {
      name: 'vms-recorder',
      script: './services/recorder/build/vms-recorder',
      cwd: '/home/camera/app/vms',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'vms-mediamtx',
      script: './services/mediamtx/mediamtx',
      cwd: '/home/camera/app/vms/services/mediamtx',
      instances: 1,
      autorestart: true
    },
    {
      name: 'vms-api',
      script: './services/api/src/index.js',
      cwd: '/home/camera/app/vms/services/api',
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

### **Database Schema:**
```sql
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    rtsp_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cameras_status ON cameras(status);
```

---

## 📊 **Monitoring**

### **Service Health:**
```bash
# PM2 monitoring
pm2 monit

# Check logs
pm2 logs vms-recorder

# System resources
htop
nvidia-smi
```

### **Performance Metrics:**
```bash
# CPU usage
ps aux | grep ffmpeg | grep -v grep | awk '{total+=$3} END {printf "Total CPU: %.1f%%\n", total}'

# GPU usage
nvidia-smi --query-gpu=utilization.gpu,utilization.encoder,utilization.decoder,memory.used --format=csv

# Disk usage
df -h /home/camera/app/vms/data/recordings/
```

---

## 🔄 **Updates & Maintenance**

### **Update Recorder:**
```bash
# Stop service
pm2 stop vms-recorder

# Pull latest code
git pull

# Rebuild
cd services/recorder/build
make

# Restart service
pm2 start vms-recorder
```

### **Database Backup:**
```bash
# Backup database
pg_dump -h localhost -U vms_user vms > vms_backup_$(date +%Y%m%d).sql

# Restore database
psql -h localhost -U vms_user vms < vms_backup_20251020.sql
```

### **Recording Cleanup:**
```bash
# Delete recordings older than 7 days
find /home/camera/app/vms/data/recordings/ -name "*.mp4" -mtime +7 -delete
```

---

## 🐛 **Troubleshooting**

### **Service Won't Start:**
```bash
# Check logs
pm2 logs vms-recorder --err

# Check database connection
psql -h localhost -U vms_user -d vms

# Check permissions
ls -la /home/camera/app/vms/data/recordings/
```

### **High CPU Usage:**
```bash
# Check per-camera CPU
ps aux | grep ffmpeg | grep -v grep

# Expected: ~18% per camera
# If higher, check FFmpeg command and GPU usage
```

### **GPU Not Working:**
```bash
# Check NVIDIA driver
nvidia-smi

# Check FFmpeg CUDA support
ffmpeg -hwaccels

# Should show: cuda, nvdec
```

---

## 📚 **Related Documentation**

- **Quick Start:** [../QUICK_START.md](../QUICK_START.md)
- **Operations:** [../operations/](../operations/)
- **System Architecture:** [../SYSTEM_ARCHITECTURE_FINAL.md](../SYSTEM_ARCHITECTURE_FINAL.md)

---

**Last Updated:** October 20, 2025

