# 🚀 Quick Start Guide

**Get VMS up and running in 5 minutes!**

---

## ⚡ Super Quick Start

```bash
# 1. Check services
pm2 list

# 2. View logs
pm2 logs

# 3. Monitor
pm2 monit

# 4. Check recordings
ls -lh data/recordings/
```

That's it! 🎉

---

## 📋 What's Running?

```yaml
Services:
  ✓ PostgreSQL 15 (database)
  ✓ Redis 7 (cache)
  ✓ API Server (Node.js on port 3000)
  ✓ Recording Engine (C++ - 2 cameras)
  ✓ MediaMTX (streaming server)
  ✓ Frontend (React on port 5173)

Current Status:
  Cameras: 2 online
  Recording: 24/7 @ 1080p
  Retention: 2 ngày
  Storage: 367GB available

Default Login:
  Username: admin
  Password: admin123

Endpoints:
  Frontend: http://localhost:5173
  API: http://localhost:3000
  API Health: http://localhost:3000/api/health
```

---

## 🎥 Managing Cameras

### **View Camera Status:**

```bash
# List all cameras
curl http://localhost:3000/api/cameras | jq

# Check specific camera
pm2 logs "Duc Tai Dendo 1_main"
```

### **Add New Camera:**

```bash
# Via API
curl -X POST http://localhost:3000/api/cameras \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Camera 03",
    "rtsp_url": "rtsp://username:password@192.168.1.100:554/stream",
    "location": "Main Entrance"
  }'
```

### **Start/Stop Recording:**

```bash
# Stop specific camera
pm2 stop "Duc Tai Dendo 1_main"
pm2 stop "Duc Tai Dendo 1_sub"

# Start specific camera
pm2 start "Duc Tai Dendo 1_main"
pm2 start "Duc Tai Dendo 1_sub"

# Restart all
pm2 restart all
```

---

## 📚 Common Commands

### **PM2 Operations:**

```bash
# View all processes
pm2 list

# View logs (all)
pm2 logs

# View logs (specific)
pm2 logs "Duc Tai Dendo 1_main"

# Monitor resources
pm2 monit

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Delete all
pm2 delete all
```

### **Check System Health:**

```bash
# API health
curl http://localhost:3000/api/health

# Database
psql -U camera_user -d vms_db -c "SELECT COUNT(*) FROM cameras;"

# Redis
redis-cli ping

# Storage
df -h data/recordings/
du -sh data/recordings/*
```

### **View Recordings:**

```bash
# List recordings
ls -lh data/recordings/

# Count files
find data/recordings/ -name "*.mp4" | wc -l

# Check storage usage
du -sh data/recordings/*
```

---

## 🔍 Verify Everything Works

### **1. Check Services:**

```bash
pm2 list

# Expected: All processes "online"
```

### **2. Check API Health:**

```bash
curl http://localhost:3000/api/health

# Expected: {"status":"ok"}
```

### **3. Check Frontend:**

Open http://localhost:5173 in your browser

### **4. Check Recordings:**

```bash
ls -lh data/recordings/

# Should see camera folders with MP4 files
```

---

## 🐛 Troubleshooting

### **Services not running?**

```bash
# Check PM2
pm2 list

# Restart all
pm2 restart all

# Check logs
pm2 logs --lines 50
```

### **Can't access frontend?**

```bash
# Check if dev server is running
cd services/frontend
npm run dev

# Should start on http://localhost:5173
```

### **Database connection error?**

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -U camera_user -d vms_db -c "SELECT 1;"
```

### **Recording not working?**

```bash
# Check camera process
pm2 logs "Duc Tai Dendo 1_main"

# Check RTSP connection
ffprobe rtsp://YOUR_CAMERA_URL

# Restart camera
pm2 restart "Duc Tai Dendo 1_main"
```

### **Out of disk space?**

```bash
# Check storage
df -h

# Clean old recordings (manual)
find data/recordings/ -name "*.mp4" -mtime +2 -delete

# Or adjust retention in code
```

---

## 📖 Next Steps

### **1. Read Documentation:**
- 📄 [docs/README.md](./docs/README.md) - Main documentation hub
- 📄 [docs/PM2_OPERATIONS.md](./docs/PM2_OPERATIONS.md) - PM2 operations guide
- 📄 [PROGRESS.md](./PROGRESS.md) - Current progress

### **2. View Progress & Plans:**
- 📄 [docs/reports/PROGRESS_ANALYSIS.md](./docs/reports/PROGRESS_ANALYSIS.md) - Detailed analysis
- 📄 [docs/plan/OPTIMIZATION_IMPLEMENTATION_PLAN.md](./docs/plan/OPTIMIZATION_IMPLEMENTATION_PLAN.md) - Next steps

### **3. Explore Features:**
- Login to web interface
- View live streams
- Check recordings
- Monitor system health

### **4. Optimization (Next Priority):**
- Read optimization plan
- Implement Phase 1 (6 hours)
- Test with 5 cameras
- Performance benchmarking

---

## 🎯 Testing Checklist

- [ ] All PM2 processes "online"
- [ ] Can access frontend at http://localhost:5173
- [ ] Can login with admin/admin123
- [ ] API health check returns OK
- [ ] Cameras are recording
- [ ] Live streams working
- [ ] Recordings visible in data/recordings/

---

## 💡 Tips

- **Use `pm2 monit`** to monitor CPU/RAM in real-time
- **Use `pm2 logs`** to debug issues
- **Check `data/recordings/`** to verify recording is working
- **Read [docs/PM2_OPERATIONS.md](./docs/PM2_OPERATIONS.md)** for advanced PM2 usage

---

## 🆘 Getting Help

```bash
# View system info
pm2 list
df -h
free -h

# Export logs for debugging
pm2 logs > vms-logs.txt

# Check configuration
cat ecosystem.config.js
```

---

## 🎉 You're All Set!

Your VMS is now running. Time to:
- Monitor your cameras
- Check recordings
- Explore the web interface
- Read the optimization plan

**Happy monitoring! 📹**

---

**For detailed documentation, see:**
- [README.md](./README.md) - Project overview
- [docs/README.md](./docs/README.md) - Complete documentation
- [PROGRESS.md](./PROGRESS.md) - Current progress
- [docs/plan/](./docs/plan/) - Implementation plans

**Last Updated**: October 20, 2025
