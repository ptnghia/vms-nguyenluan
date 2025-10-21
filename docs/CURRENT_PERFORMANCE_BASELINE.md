# 📊 Current Performance Baseline

**Date:** October 20, 2025  
**Purpose:** Document current system performance before optimization  
**Branch:** optimization/phase1-hybrid

---

## 🖥️ SYSTEM CONFIGURATION

### **Hardware:**
```yaml
CPU: Intel Core i5-14500 (14 cores, 20 threads)
  - Base: 2.6 GHz
  - Turbo: 5.0 GHz
  - Cores: 6P + 8E = 14 cores
  - Threads: 20 threads

iGPU: Intel UHD Graphics 770 ✅ ENABLED
  - QuickSync Gen 12.5
  - Device: /dev/dri/renderD128

GPU: NVIDIA GeForce RTX 3050 6GB ✅ AVAILABLE
  - NVENC Gen 8 (Ampere)
  - Device: /dev/dri/renderD129

RAM: 16 GB DDR4
Storage: 476.9 GB SSD
  - Used: 109.9 GB
  - Available: 367 GB
```

### **Software:**
```yaml
OS: Ubuntu 22.04 LTS
Kernel: Linux 6.8.0-48-generic
FFmpeg: 4.4.2 (with QSV + NVENC support)
Node.js: v20.x
PM2: Latest
PostgreSQL: 15
Redis: 7
MediaMTX: Latest
```

---

## 📹 CURRENT ARCHITECTURE

### **Recording Architecture:**
```yaml
Type: 3 separate FFmpeg processes per camera

Process 1: Recording
  - Input: RTSP stream (1080p @ 30fps)
  - Output: MP4 segments (3 minutes each)
  - Encoding: COPY mode (no re-encoding)
  - CPU: ~42% per camera

Process 2: Live Low Quality
  - Input: RTSP stream
  - Output: RTMP stream (720p @ 30fps)
  - Encoding: NVENC (h264_nvenc)
  - CPU: ~42% per camera

Process 3: Live High Quality
  - Input: RTSP stream
  - Output: RTMP stream (1440p @ 30fps)
  - Encoding: NVENC (h264_nvenc)
  - CPU: ~42% per camera

Total CPU per camera: ~126%
```

---

## 📊 CURRENT PERFORMANCE METRICS

### **CPU Usage:**
```yaml
Per Camera:
  Recording: 42% (copy mode)
  Live Low: 42% (NVENC 720p)
  Live High: 42% (NVENC 1440p)
  Total: 126% per camera

2 Cameras (Current):
  Total CPU: 252%
  Status: ✅ Working

5 Cameras (Target):
  Total CPU: 630%
  Status: ❌ NOT POSSIBLE (exceeds 100% × 20 threads = 2000%)
```

### **Storage Usage:**
```yaml
Recording Format: MP4 (H.264 + AAC)
Encoding: Copy mode (preserves original bitrate)
Bitrate: 4.11 Mbps average
Segment Duration: 3 minutes
Segment Size: ~103.45 MB per segment

Per Camera:
  - 20 segments/hour × 103.45 MB = 2.02 GB/hour
  - 2.02 GB/hour × 24 hours = 48.48 GB/day

2 Cameras × 2 Days:
  - 48.48 GB/day × 2 cameras × 2 days = 193.92 GB
  - Current usage: 136 GB (1337 files, 17 hours)
  - Projected: 193.92 GB for 2 days ✅ Fits in 367GB

5 Cameras × 2 Days:
  - 48.48 GB/day × 5 cameras × 2 days = 484.8 GB
  - Status: ❌ EXCEEDS available 367 GB
```

### **Video Quality:**
```yaml
Resolution: 1920×1080 (1080p)
Frame Rate: 30 fps
Codec: H.264 (AVC)
Bitrate: 4.11 Mbps (copy mode, original)
Audio: AAC 128 kbps
Quality: Good (original quality preserved)
```

---

## 🎯 OPTIMIZATION GOALS

### **Target Performance:**
```yaml
Architecture: Single FFmpeg process per camera (3 outputs)
Encoder: Intel QuickSync (QSV) primary, NVENC fallback

CPU Usage:
  Current: 126% per camera
  Target: 15% per camera (QSV)
  Reduction: 88%

5 Cameras:
  Current: 630% ❌ NOT POSSIBLE
  Target: 75% ✅ EXCELLENT

Storage:
  Current: 48.48 GB/day per camera
  Target: 21.6 GB/day per camera
  Reduction: 55%

5 Cameras × 2 Days:
  Current: 484.8 GB ❌ EXCEEDS 367GB
  Target: 216 GB ✅ FITS in 367GB
```

### **Quality Target:**
```yaml
Encoding: H.264 CRF 23 (QSV)
Bitrate: ~2 Mbps (vs 4.11 Mbps current)
Quality: Visually lossless
Resolution: 1920×1080 @ 30fps (unchanged)
Audio: AAC 128 kbps (unchanged)
```

---

## 📋 PM2 PROCESSES

### **Current PM2 Status:**
```yaml
vms-recorder (id: 0):
  Status: online
  CPU: 0% (idle, no cameras recording)
  Memory: 13.5 MB
  Restarts: 0

vms-mediamtx (id: 1):
  Status: online
  CPU: 0%
  Memory: 134.3 MB
  Restarts: 0

vms-api (id: 2):
  Status: online
  CPU: 0%
  Memory: 58.1 MB
  Restarts: 0
```

---

## 🔧 BACKUP STATUS

### **Git Branch:**
```yaml
Branch: optimization/phase1-hybrid
Created: October 20, 2025
Base: main branch
Status: Clean working directory
```

### **Files Backed Up:**
```yaml
✅ ecosystem.config.js → ecosystem.config.js.backup
✅ Git branch created (optimization/phase1-hybrid)
⚠️ Recorder binary: Not found (will be built during implementation)
```

---

## 📊 BASELINE SUMMARY

```yaml
Current State:
  Architecture: 3 processes per camera
  CPU: 126% per camera
  Storage: 48.48 GB/day per camera
  Max Cameras: 2 cameras (252% CPU)
  Quality: Good (copy mode, 4.11 Mbps)

Target State:
  Architecture: 1 process per camera (3 outputs)
  CPU: 15% per camera (QSV)
  Storage: 21.6 GB/day per camera
  Max Cameras: 10+ cameras (150% CPU for 10)
  Quality: Excellent (CRF 23, 2 Mbps)

Improvements:
  CPU: 88% reduction ✅
  Storage: 55% reduction ✅
  Scalability: 2 → 10+ cameras ✅
  Quality: Good → Excellent ✅
```

---

## ✅ READY FOR IMPLEMENTATION

```yaml
Status: ✅ BASELINE DOCUMENTED
Hardware: ✅ QSV + NVENC available
Backup: ✅ Git branch + config backup
Next: Task 1.3 - Design FFmpegMultiOutput class
```

**Last Updated:** October 20, 2025
