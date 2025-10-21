# Operations Guide

**Purpose:** Operational procedures and guides for VMS system

---

## 📋 **Available Guides**

### **1. PM2 Operations**
- **File:** [PM2_OPERATIONS.md](./PM2_OPERATIONS.md)
- **Content:**
  - Service management (start, stop, restart)
  - Log viewing and monitoring
  - Process monitoring
  - Troubleshooting

### **2. Intel GPU Enable Guide**
- **File:** [IGPU_ENABLE_GUIDE.md](./IGPU_ENABLE_GUIDE.md)
- **Content:**
  - Enable Intel UHD Graphics 770
  - VAAPI setup
  - Verification steps

### **3. Cleanup Procedures**
- **Files:**
  - [CLEANUP_PLAN.md](./CLEANUP_PLAN.md) - Cleanup plan
  - [CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md) - Cleanup results
- **Content:**
  - Codebase cleanup procedures
  - File deletion plan
  - Verification steps

---

## 🚀 **Quick Operations**

### **Service Management:**
```bash
# Start all services
pm2 start ecosystem.config.js

# Restart recorder
pm2 restart vms-recorder

# View logs
pm2 logs vms-recorder

# Monitor
pm2 monit
```

### **System Monitoring:**
```bash
# Check CPU usage
ps aux | grep ffmpeg | grep -v grep | awk '{total+=$3} END {printf "Total CPU: %.1f%%\n", total}'

# Check GPU usage
nvidia-smi

# Check disk usage
df -h /home/camera/app/vms/data/recordings/
```

### **Camera Management:**
```bash
# List cameras
psql -h localhost -U vms_user -d vms -c "SELECT name, status FROM cameras;"

# Check recordings
ls -lh /home/camera/app/vms/data/recordings/
```

---

## 🔧 **Common Tasks**

### **Add New Camera:**
1. Insert camera into database
2. Restart vms-recorder
3. Verify FFmpeg process started
4. Check recordings directory

### **Remove Camera:**
1. Update camera status to 'offline'
2. Restart vms-recorder
3. Verify FFmpeg process stopped

### **Rebuild Recorder:**
1. Navigate to build directory
2. Run `cmake ..` and `make`
3. Restart service with PM2

---

## 📚 **Related Documentation**

- **Quick Start:** [../QUICK_START.md](../QUICK_START.md)
- **System Architecture:** [../SYSTEM_ARCHITECTURE_FINAL.md](../SYSTEM_ARCHITECTURE_FINAL.md)

---

**Last Updated:** October 20, 2025

