# VMS Quick Start Guide

**Version:** 5.0  
**Date:** October 20, 2025  
**Target:** System administrators and developers

---

## 🚀 **Quick Start (5 minutes)**

### **1. Check System Status:**

```bash
# Check all services
pm2 list

# Expected output:
# vms-recorder    │ online
# vms-mediamtx    │ online
# vms-api         │ stopped (optional)
```

### **2. Check Cameras:**

```bash
# List running FFmpeg processes
ps aux | grep ffmpeg | grep -v grep

# Check CPU usage
ps aux | grep ffmpeg | grep -v grep | awk '{total+=$3} END {printf "Total CPU: %.1f%%\n", total}'

# Expected: ~54% for 3 cameras (~18% per camera)
```

### **3. Check GPU:**

```bash
# NVIDIA GPU status
nvidia-smi

# Expected output:
# GPU: 7-10%
# NVENC: 45-55%
# NVDEC: 3-5%
# Memory: ~860 MB
# Temp: ~52°C
```

### **4. View Recordings:**

```bash
# List all recordings
ls -lh /home/camera/app/vms/data/recordings/

# View specific camera
ls -lh /home/camera/app/vms/data/recordings/"Duc Tai Dendo 1"/

# Expected: MP4 files with timestamps
# Format: Camera_Name_YYYYMMDD_HHMMSS.mp4
```

### **5. View Live Streams:**

```bash
# Check MediaMTX streams
curl http://localhost:9997/v3/paths/list

# Or use VLC/FFplay to view:
# rtsp://localhost:8554/live/[camera-id]/high
```

---

## 📋 **Common Operations**

### **Service Management:**

```bash
# Start all services
pm2 start ecosystem.config.js

# Start individual service
pm2 start vms-recorder
pm2 start vms-mediamtx

# Restart service
pm2 restart vms-recorder

# Stop service
pm2 stop vms-recorder

# Stop all
pm2 stop all

# Delete service (remove from PM2)
pm2 delete vms-recorder
```

### **View Logs:**

```bash
# View all logs
pm2 logs

# View specific service
pm2 logs vms-recorder

# View last 50 lines
pm2 logs vms-recorder --lines 50

# View errors only
pm2 logs vms-recorder --err

# No streaming (just print and exit)
pm2 logs vms-recorder --nostream
```

### **Monitor Resources:**

```bash
# PM2 monitoring dashboard
pm2 monit

# CPU usage per camera
ps aux | grep ffmpeg | grep -v grep | awk '{printf "PID %s: %.1f%% CPU\n", $2, $3}'

# GPU usage
watch -n 1 nvidia-smi

# Disk usage
df -h /home/camera/app/vms/data/recordings/
```

---

## 🎥 **Camera Management**

### **Add New Camera:**

```bash
# Connect to database
psql -h localhost -U vms_user -d vms

# Insert camera
INSERT INTO cameras (name, location, rtsp_url, status)
VALUES (
  'Camera Name',
  'Location',
  'rtsp://username:password@camera-ip:port/path',
  'online'
);

# Exit
\q

# Restart recorder to load new camera
pm2 restart vms-recorder
```

### **List Cameras:**

```bash
# Using psql
psql -h localhost -U vms_user -d vms -c "SELECT id, name, status FROM cameras;"

# Or using Node.js script
cd /home/camera/app/vms/services/api
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  database: 'vms',
  user: 'vms_user',
  password: 'l3Gd63G2iBlqtiWI'
});
pool.query('SELECT name, status FROM cameras ORDER BY name')
  .then(res => {
    res.rows.forEach(row => console.log(row.status === 'online' ? '✅' : '❌', row.name));
    pool.end();
  });
"
```

### **Disable Camera:**

```bash
# Update status to offline
psql -h localhost -U vms_user -d vms -c "UPDATE cameras SET status = 'offline' WHERE name = 'Camera Name';"

# Restart recorder
pm2 restart vms-recorder
```

---

## 🔧 **Troubleshooting**

### **Problem: Service won't start**

```bash
# Check logs for errors
pm2 logs vms-recorder --err --lines 50

# Common issues:
# 1. Database connection failed
psql -h localhost -U vms_user -d vms

# 2. Port already in use
sudo lsof -i :8554  # MediaMTX RTSP port

# 3. Permission issues
ls -la /home/camera/app/vms/data/recordings/
```

### **Problem: High CPU usage**

```bash
# Check per-camera CPU
ps aux | grep ffmpeg | grep -v grep | awk '{printf "PID %s: %.1f%% CPU\n", $2, $3}'

# Expected: ~18% per camera
# If higher:
# 1. Check if camera is yuvj420p (needs CUDA)
# 2. Check if NVDEC is working
# 3. Check FFmpeg command in logs

# View FFmpeg command
ps aux | grep ffmpeg | grep -v grep | head -1
```

### **Problem: Camera not recording**

```bash
# Check if camera is in database
psql -h localhost -U vms_user -d vms -c "SELECT name, status FROM cameras WHERE name = 'Camera Name';"

# Check if FFmpeg process is running
ps aux | grep "Camera Name" | grep -v grep

# Check camera RTSP stream
ffprobe -v error rtsp://username:password@camera-ip:port/path

# Check logs
pm2 logs vms-recorder | grep "Camera Name"
```

### **Problem: GPU not working**

```bash
# Check NVIDIA driver
nvidia-smi

# Check FFmpeg CUDA support
ffmpeg -hwaccels

# Expected output should include:
# - cuda
# - nvdec

# Check FFmpeg encoders
ffmpeg -encoders | grep nvenc

# Expected output should include:
# - h264_nvenc
# - hevc_nvenc
```

### **Problem: Disk full**

```bash
# Check disk usage
df -h /home/camera/app/vms/data/recordings/

# Check recordings size
du -sh /home/camera/app/vms/data/recordings/*

# Manual cleanup (delete old recordings)
find /home/camera/app/vms/data/recordings/ -name "*.mp4" -mtime +7 -delete

# Note: Automatic cleanup not implemented yet
```

---

## 📊 **Performance Monitoring**

### **CPU Monitoring:**

```bash
# Real-time CPU monitoring (30 seconds, 6 samples)
for i in {1..6}; do 
  ps aux | grep ffmpeg | grep -v grep | awk '{total+=$3} END {printf "Sample '$i': %.1f%%\n", total}'; 
  sleep 5; 
done

# Expected: ~54% ± 1% for 3 cameras
```

### **GPU Monitoring:**

```bash
# Real-time GPU monitoring (30 seconds, 6 samples)
for i in {1..6}; do 
  nvidia-smi --query-gpu=utilization.gpu,utilization.encoder,utilization.decoder,memory.used --format=csv,noheader,nounits | 
  awk -F', ' '{printf "Sample '$i': GPU=%s%%, NVENC=%s%%, NVDEC=%s%%, Mem=%sMB\n", $1, $2, $3, $4}'; 
  sleep 5; 
done

# Expected:
# GPU: 7-10%
# NVENC: 45-55%
# NVDEC: 3-5%
# Memory: ~860 MB
```

### **Recording Quality Check:**

```bash
# Check recent recording
LATEST=$(find /home/camera/app/vms/data/recordings/ -name "*.mp4" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")
echo "Latest recording: $LATEST"

# Check file info
ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,width,height,r_frame_rate "$LATEST"

# Expected:
# Codec: hevc (H.265)
# Resolution: 1920x1080
# Bitrate: ~2 Mbps
# Duration: ~180 seconds (3 minutes)
```

---

## 🔄 **Rebuild & Redeploy**

### **Rebuild Recorder:**

```bash
# Navigate to build directory
cd /home/camera/app/vms/services/recorder/build

# Clean build
rm -f vms-recorder

# Rebuild
cmake ..
make

# Check binary
ls -lh vms-recorder

# Expected: ~150-160 KB
```

### **Deploy New Version:**

```bash
# Stop service
pm2 stop vms-recorder

# Rebuild (see above)

# Start service
pm2 start vms-recorder

# Check logs
pm2 logs vms-recorder --lines 30

# Verify cameras are running
ps aux | grep ffmpeg | grep -v grep | wc -l

# Expected: 3 (number of online cameras)
```

---

## 📚 **Next Steps**

### **Learn More:**
- **System Architecture:** [SYSTEM_ARCHITECTURE_FINAL.md](./SYSTEM_ARCHITECTURE_FINAL.md)
- **Optimization Results:** [optimization/PHASE5_FINAL_RESULTS.md](./optimization/PHASE5_FINAL_RESULTS.md)
- **PM2 Operations:** [operations/PM2_OPERATIONS.md](./operations/PM2_OPERATIONS.md)

### **Advanced Topics:**
- **GPU Analysis:** [optimization/GPU_UTILIZATION_ANALYSIS.md](./optimization/GPU_UTILIZATION_ANALYSIS.md)
- **Hybrid GPU Design:** [design/HYBRID_ENCODER_DESIGN.md](./design/HYBRID_ENCODER_DESIGN.md)
- **Phase 4 CUDA:** [optimization/PHASE4_ADAPTIVE_QUALITY_RESULTS.md](./optimization/PHASE4_ADAPTIVE_QUALITY_RESULTS.md)

---

**Last Updated:** October 20, 2025  
**Version:** 5.0 (Phase 5 Production)

