# 🚀 Quick Start Guide

**Get VMS up and running in 5 minutes!**

---

## ⚡ Super Quick Start

```bash
# 1. Setup environment
make setup

# 2. Start services
make start

# 3. Access application
# Frontend: http://localhost:8080
# API: http://localhost:3000
```

That's it! 🎉

---

## 📋 What Just Happened?

```yaml
Services Started:
  ✓ PostgreSQL (database)
  ✓ Redis (cache)
  ✓ API Server (Node.js)
  ✓ Recording Engine (C++)
  ✓ Frontend (React)

Default Login:
  Username: admin
  Password: admin123

Endpoints:
  Frontend: http://localhost:8080
  API: http://localhost:3000
  Swagger: http://localhost:3000/api/docs
```

---

## 🎥 Adding Your First Camera

### **Option 1: Via Web UI**

1. Open http://localhost:8080
2. Login with `admin` / `admin123`
3. Navigate to "Cameras" → "Add Camera"
4. Enter camera details:
   ```yaml
   Name: Camera 01
   RTSP URL: rtsp://username:password@192.168.1.100:554/stream
   Location: Main Entrance
   ```
5. Click "Save" and "Start Recording"

### **Option 2: Via API**

```bash
curl -X POST http://localhost:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Camera 01",
    "rtsp_url": "rtsp://admin:password@192.168.1.100:554/stream",
    "location": "Main Entrance",
    "resolution": "1080p",
    "fps": 25,
    "bitrate": 4000
  }'
```

### **Option 3: Test with Simulator**

```bash
# Start with test cameras
make quick-test

# Simulator provides streams at:
rtsp://localhost:8554/stream1
rtsp://localhost:8554/stream2
rtsp://localhost:8554/stream3
```

---

## 📚 Common Commands

```bash
# View all commands
make help

# Start services
make start

# Stop services
make stop

# View logs
make logs

# Check status
make status

# Restart everything
make restart

# Build from scratch
make build

# Full cleanup and restart
make full-restart
```

---

## 🔍 Verify Everything Works

### **1. Check Services:**

```bash
make status

# Expected output:
# NAME             IMAGE              STATUS         PORTS
# vms-postgres     postgres:15        Up (healthy)   5432
# vms-redis        redis:7            Up (healthy)   6379
# vms-api          vms-api            Up             3000
# vms-recorder     vms-recorder       Up             
# vms-frontend     vms-frontend       Up             8080
```

### **2. Check API Health:**

```bash
curl http://localhost:3000/health

# Expected: {"status":"ok","database":"connected","redis":"connected"}
```

### **3. Check Frontend:**

Open http://localhost:8080 in your browser

### **4. Check QuickSync:**

```bash
make verify-qsv

# Should show Intel VA-API profiles (H.264, HEVC)
```

---

## 🐛 Troubleshooting

### **Services won't start?**

```bash
# Check Docker is running
docker ps

# Check ports are available
sudo lsof -i :3000
sudo lsof -i :8080

# Check logs
make logs

# Try full restart
make full-restart
```

### **Can't access frontend?**

```bash
# Check if container is running
docker compose ps frontend

# Check logs
make logs-api

# Verify port 8080 is accessible
curl http://localhost:8080
```

### **Database connection error?**

```bash
# Check PostgreSQL
docker compose ps postgres

# Reset database
make db-reset

# Check logs
make logs-db
```

### **QuickSync not working?**

```bash
# Verify hardware support
make verify-qsv

# Check /dev/dri permissions
ls -la /dev/dri/

# Give permissions if needed
sudo chmod -R 777 /dev/dri/

# Restart recorder
docker compose restart recorder
```

---

## 📖 Next Steps

1. **Read the docs:**
   - [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Complete Docker guide
   - [docs/FINAL_SOLUTION.md](./docs/FINAL_SOLUTION.md) - Full system overview
   - [docs/SERVER_ASSESSMENT.md](./docs/SERVER_ASSESSMENT.md) - Server specs

2. **Add real cameras:**
   - Configure RTSP URLs
   - Test recording
   - Enable live streaming

3. **Explore features:**
   - Multi-camera grid view
   - Recording playback
   - Event search
   - System monitoring

4. **Customize settings:**
   - Edit `.env` file
   - Adjust transcode quality
   - Configure storage tiers

5. **Development:**
   - See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for dev workflow
   - API documentation at http://localhost:3000/api/docs

---

## 🎯 Testing Checklist

- [ ] All services started successfully
- [ ] Can access frontend at http://localhost:8080
- [ ] Can login with admin/admin123
- [ ] API health check returns OK
- [ ] Can add a camera
- [ ] Recording starts successfully
- [ ] Live stream displays in UI
- [ ] QuickSync verified (optional but recommended)

---

## 💡 Tips

- **Use `make help`** to see all available commands
- **Use `make logs`** to debug issues
- **Use `make status`** to check services
- **Use `make quick-test`** for testing without real cameras
- **Check [DOCKER_SETUP.md](./DOCKER_SETUP.md)** for advanced usage

---

## 🆘 Getting Help

```bash
# View system info
make info

# Show service endpoints
make ports

# Check versions
make version

# View resource usage
make stats
```

---

## 🎉 You're All Set!

Your VMS is now running. Time to:
- Add your cameras
- Start recording
- Explore the UI
- Read the full documentation

**Happy monitoring! 📹**

---

**For detailed documentation, see:**
- [README.md](./README.md) - Project overview
- [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Complete setup guide
- [docs/FINAL_SOLUTION.md](./docs/FINAL_SOLUTION.md) - Full system design
- [docs/reports/](./docs/reports/) - Assessment reports

**Last Updated**: October 19, 2025
