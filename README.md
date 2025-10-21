# 🎥 VMS - Video Management System

**Hệ thống Quản lý Camera IP - IP Camera Management System**
**Recording & Live Streaming - Phase 5 Production**

[![Status](https://img.shields.io/badge/status-Phase%205%20Production-brightgreen)](#)
[![Cameras](https://img.shields.io/badge/cameras-3%20online%20(max%2012)-success)](#)
[![CPU](https://img.shields.io/badge/CPU-18.1%25%20per%20camera-blue)](#)
[![Optimization](https://img.shields.io/badge/optimization-81%25%20reduction-orange)](#)

---

## 📋 **Overview**

VMS là hệ thống quản lý camera IP với khả năng recording và live streaming hiệu suất cao.

**Current Status (Phase 5):**
- **Environment:** Production Stable
- **Cameras:** 3 online (capacity: 12 cameras)
- **Recording:** H.265 NVENC @ 1080p, 2 Mbps
- **Live Streaming:** H.264 NVENC @ 1080p, 3 Mbps (RTSP/HLS/WebRTC)
- **Performance:** 18.1% CPU per camera (81% reduction from baseline)
- **Stability:** ±0.3% CPU variance (extremely stable)
- **Hardware:** NVIDIA RTX 3050 + Intel UHD 770 (Hybrid GPU)

---

## 🚀 **Quick Start**

### **1. Check System Status:**
```bash
# Check services
pm2 list

# Check cameras
ps aux | grep ffmpeg | grep -v grep

# Check CPU usage
ps aux | grep ffmpeg | grep -v grep | awk '{total+=$3} END {printf "Total CPU: %.1f%%\n", total}'

# Check GPU usage
nvidia-smi
```

### **2. View Recordings:**
```bash
# List recordings
ls -lh /home/camera/app/vms/data/recordings/

# View specific camera
ls -lh /home/camera/app/vms/data/recordings/"Camera Name"/
```

### **3. Service Operations:**
```bash
# Start all services
pm2 start ecosystem.config.js

# Restart recorder
pm2 restart vms-recorder

# View logs
pm2 logs vms-recorder

# Stop all
```

---

## 💻 **System Specifications**

### **Hardware:**
```yaml
CPU: Intel Core i5-14500
  - Cores: 14 (6P + 8E)
  - Threads: 20
  - iGPU: Intel UHD Graphics 770 ✅

GPU: NVIDIA GeForce RTX 3050 6GB
  - NVENC: 8th Gen (H.264/H.265) ✅
  - NVDEC: 5th Gen ✅
  - CUDA: Ampere Architecture ✅

RAM: 16 GB DDR4
Storage: 512 GB NVMe SSD
Network: 1 Gbps Ethernet
```

### **Current Performance (Phase 5):**
```yaml
Cameras: 3 online (max: 12)
CPU Usage: 18.1% per camera (54% total for 3 cameras)
CPU Utilization: 3.4% of 1600% max
GPU Usage: NVENC 50%, NVDEC 3.5%
Stability: ±0.3% variance (extremely stable)
Recording: H.265 NVENC @ 1080p, 2 Mbps
Live: H.264 NVENC @ 1080p, 3 Mbps
```

### **Optimization Results:**
```yaml
Baseline: 94.1% CPU per camera
Phase 5: 18.1% CPU per camera
Improvement: 81% CPU reduction
Capacity: 2 → 12 cameras (500% increase)
```

---

## 🏗️ **Architecture**

```yaml
Recording Engine: C++ with FFmpeg CLI wrapper
  - Hardware: NVIDIA NVENC/NVDEC + Intel VAAPI
  - Process: Single FFmpeg per camera (dual outputs)
  - Optimization: Phase 5 (Hybrid GPU + NVDEC)

Streaming: MediaMTX (RTSP/HLS/WebRTC)
  - Port 8554: RTSP
  - Port 8888: HLS
  - Port 8889: WebRTC

API Backend: Node.js + Express (basic)
Database: PostgreSQL 14
Frontend: React (in development)
Process Manager: PM2
```

**See:** [docs/SYSTEM_ARCHITECTURE_FINAL.md](./docs/SYSTEM_ARCHITECTURE_FINAL.md) for complete architecture

---

## 📊 **Features**

### **✅ Production Ready:**

**Recording Engine:**
- ✅ RTSP capture from IP cameras
- ✅ 24/7 recording @ 1080p H.265 NVENC
- ✅ MP4 segmentation (3-minute segments)
- ✅ Auto-reconnect on failure
- ✅ Multi-camera support (3 cameras, max 12)
- ✅ NVDEC hardware decode (Phase 5)
- ✅ CUDA acceleration for yuvj420p (Phase 4)
- ✅ Hybrid GPU system (NVIDIA + Intel)

**Live Streaming:**
- ✅ MediaMTX RTSP/HLS/WebRTC server
- ✅ H.264 NVENC @ 1080p, 3 Mbps
- ✅ Low latency streaming
- ✅ Multi-protocol support

**API Backend:**
- ✅ Basic camera CRUD operations
- ⚠️ Authentication not implemented
- ⚠️ Limited endpoints

**Frontend:**
- ⏳ In development
- ⏳ Camera grid view
- ⏳ Live streaming player
- ⏳ Recording playback

**Infrastructure:**
- ✅ PostgreSQL database
- ✅ PM2 process management
- ✅ Environment configuration
- ✅ Logging and monitoring

---

## 📖 **Documentation**

### **Main Documentation:**
📂 **[docs/](./docs/)** - Complete documentation

**Key Documents:**
- 📄 [docs/SYSTEM_ARCHITECTURE_FINAL.md](./docs/SYSTEM_ARCHITECTURE_FINAL.md) - Complete system architecture
- 📄 [docs/QUICK_START.md](./docs/QUICK_START.md) - Quick start guide
- 📄 [docs/operations/PM2_OPERATIONS.md](./docs/operations/PM2_OPERATIONS.md) - PM2 operations

**Optimization Results:**
- 📄 [docs/optimization/PHASE5_FINAL_RESULTS.md](./docs/optimization/PHASE5_FINAL_RESULTS.md) - Phase 5 final results
- 📄 [docs/optimization/GPU_UTILIZATION_ANALYSIS.md](./docs/optimization/GPU_UTILIZATION_ANALYSIS.md) - GPU analysis
- 📄 [docs/optimization/PHASE4_ADAPTIVE_QUALITY_RESULTS.md](./docs/optimization/PHASE4_ADAPTIVE_QUALITY_RESULTS.md) - Phase 4 results
- 📄 [docs/optimization/PHASE3_PRODUCTION_RESULTS.md](./docs/optimization/PHASE3_PRODUCTION_RESULTS.md) - Phase 3 results

**Design Documents:**
- 📄 [docs/design/HYBRID_ENCODER_DESIGN.md](./docs/design/HYBRID_ENCODER_DESIGN.md) - Hybrid GPU design
- 📄 [docs/design/PHASE3_SINGLE_PROCESS_DESIGN.md](./docs/design/PHASE3_SINGLE_PROCESS_DESIGN.md) - Single process design

---

## 🚀 **Roadmap**

### **✅ Phase 1-5: Optimization (COMPLETE)**
- ✅ Phase 1: Resolution optimization (-57% CPU)
- ✅ Phase 3: Single process architecture (-75% CPU)
- ✅ Phase 4: CUDA acceleration for yuvj420p (-70% CPU)
- ✅ Phase 5: NVDEC + Hybrid GPU (-81% CPU)

### **📋 Phase 6: API Backend (NEXT)**
- Complete REST API endpoints
- Authentication & authorization
- User management
- Recording playback API
- System monitoring API

### **📋 Phase 7: Frontend Development**
- Camera grid view
- Live streaming player (HLS/WebRTC)
- Recording playback with timeline
- Camera management UI
- System monitoring dashboard

### **📋 Phase 8: Advanced Features**
- Motion detection
- Event recording
- Cloud backup
- Mobile app
- AI integration (object detection)

**See:** [docs/ROADMAP.md](./docs/ROADMAP.md) for detailed roadmap (TBD)

---

## 🔧 **Development**

### **Project Structure:**
```
vms/
├── services/
│   ├── recorder/              # C++ recording engine
│   │   ├── src/               # Source code
│   │   │   ├── main.cpp
│   │   │   ├── camera_manager.hpp
│   │   │   ├── camera_recorder.hpp
│   │   │   ├── ffmpeg_multi_output.hpp
│   │   │   ├── gpu_selector.hpp (Phase 5)
│   │   │   └── stream_analyzer.hpp (Phase 4)
│   │   └── build/             # Build output
│   ├── api/                   # Node.js API backend
│   ├── frontend/              # React frontend (in dev)
│   └── mediamtx/              # Streaming server
├── data/
│   └── recordings/            # Video storage
├── docs/                      # Documentation
│   ├── SYSTEM_ARCHITECTURE_FINAL.md
│   ├── QUICK_START.md
│   ├── optimization/          # Phase 1-5 results
│   └── operations/            # Operational guides
└── ecosystem.config.js        # PM2 configuration
```

### **Tech Stack:**
```yaml
Recording Engine:
  - Language: C++17
  - FFmpeg: 6.1.1 (CLI wrapper)
  - Hardware: NVIDIA NVENC/NVDEC + Intel VAAPI
  - Build: CMake + GCC 11.4.0

API Backend:
  - Runtime: Node.js 18+
  - Framework: Express.js
  - Database: PostgreSQL 14
  - ORM: pg (native driver)

Frontend (In Development):
  - Framework: React 18
  - Language: TypeScript
  - Build: Vite
  - UI: Material-UI
  - Video: HLS.js / WebRTC

Infrastructure:
  - Streaming: MediaMTX (RTSP/HLS/WebRTC)
  - Process Manager: PM2
  - OS: Ubuntu 22.04 LTS
  - Kernel: Linux 6.8.0-48-generic
```

---

## 🛠️ **Build & Deploy**

### **Build Recorder:**
```bash
cd services/recorder/build
cmake ..
make
```

### **Deploy:**
```bash
# Start all services
pm2 start ecosystem.config.js

# Or start individually
pm2 start vms-recorder
pm2 start vms-mediamtx
pm2 start vms-api
```

### **Monitor:**
```bash
# Check status
pm2 list

# View logs
pm2 logs vms-recorder

# Monitor resources
pm2 monit

# Check GPU
nvidia-smi
```

---

## 📞 **Support & Troubleshooting**

### **Documentation:**
- **Architecture:** [docs/SYSTEM_ARCHITECTURE_FINAL.md](./docs/SYSTEM_ARCHITECTURE_FINAL.md)
- **Quick Start:** [docs/QUICK_START.md](./docs/QUICK_START.md)
- **Operations:** [docs/operations/PM2_OPERATIONS.md](./docs/operations/PM2_OPERATIONS.md)

### **Common Issues:**
```bash
# Service not starting
pm2 logs vms-recorder --err

# High CPU usage
ps aux | grep ffmpeg | grep -v grep

# GPU not working
nvidia-smi
ffmpeg -hwaccels

# Database connection
psql -h localhost -U vms_user -d vms
```

---

## 📝 **License**

Proprietary - VMS Project

---

**Status:** 🟢 Phase 5 Production Stable
**Last Updated:** October 20, 2025
**Next Milestone:** Phase 6 - API Backend Completion
