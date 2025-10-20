# 🎥 VMS - Video Management System

**Hệ thống Quản lý Camera Nguyễn Luân**  
**An ninh & Giao thông - Security & Traffic Monitoring**

[![Status](https://img.shields.io/badge/status-Phase%201%20MVP%2098%25-green)](#)
[![Environment](https://img.shields.io/badge/environment-test%2Fdev-blue)](#)
[![Cameras](https://img.shields.io/badge/cameras-2%20online%20(target%205)-brightgreen)](#)

---

## 📋 **Tổng quan**

Hệ thống Video Management System (VMS) cho giám sát an ninh và giao thông.

**Current Status:**
- **Environment:** Test/Development
- **Cameras:** 2 online (target: 5 cameras)
- **Recording:** 24/7 @ 1080p
- **Retention:** 2 ngày
- **Phase 1 MVP:** 98% complete
- **Next:** CPU + Storage optimization

---

## 🚀 **Quick Start**

### **1. Xem trạng thái hiện tại:**
```bash
# Check services
pm2 list

# Check recordings
ls -lh data/recordings/
```

### **2. Đọc tài liệu chính:**
📄 **[docs/README.md](./docs/README.md)** - Main documentation hub

### **3. Xem tiến độ và kế hoạch:**
- 📊 [PROGRESS.md](./PROGRESS.md) - Current progress
- 📄 [docs/reports/PROGRESS_ANALYSIS.md](./docs/reports/PROGRESS_ANALYSIS.md) - Detailed analysis
- 📄 [docs/plan/OPTIMIZATION_IMPLEMENTATION_PLAN.md](./docs/plan/OPTIMIZATION_IMPLEMENTATION_PLAN.md) - Next steps

### **4. Quick operations:**
```bash
# Start recording
pm2 start ecosystem.config.js

# Stop recording
pm2 stop all

# View logs
pm2 logs

# Monitor
pm2 monit
```

---

## 💻 **System Specs**

### **Hardware:**
```yaml
CPU: Intel i5-14500 (14 cores, 20 threads)
  - Intel QuickSync Gen 12.5 ✅
RAM: 16GB DDR4
GPU: NVIDIA RTX 3050 6GB
Storage: 476.9GB SSD (367GB available)
Network: 1Gbps Ethernet
```

### **Current Performance:**
```yaml
Cameras: 2 online
CPU Usage: 126% per camera (3 FFmpeg processes)
Storage: 48.48 GB/day per camera
Retention: 2 ngày
Recording: 24/7 @ 1080p H.264
```

### **After Optimization (Target):**
```yaml
CPU Usage: 15% per camera (1 FFmpeg process + QSV)
Storage: 21.6 GB/day per camera
Improvement: 88% CPU reduction, 55% storage reduction
```

---

## 🏗️ **Architecture**

```yaml
Recording Engine: C++ with FFmpeg + Intel QuickSync
API Backend: Node.js (Express)
Frontend: React + TypeScript + Vite
Database: PostgreSQL 15
Cache: Redis 7
Streaming: MediaMTX (RTSP/HLS/WebRTC)
Process Manager: PM2
```

---

## 📊 **Current Status**

### **✅ Completed (Phase 1 MVP - 98%):**

**Recording Engine (C++):**
- ✅ RTSP capture from IP cameras
- ✅ 24/7 recording @ 1080p
- ✅ MP4 segmentation (3-minute segments)
- ✅ Auto-reconnect on failure
- ✅ Multi-camera support (2 cameras online)
- ✅ Storage management (2-day retention)

**Live Streaming:**
- ✅ MediaMTX RTSP/HLS/WebRTC server
- ✅ Low latency streaming (~350ms)
- ✅ Dual-quality transcoding (720p + 1440p)
- ✅ NVIDIA NVENC hardware encoding

**API Backend (Node.js):**
- ✅ RESTful API with Express
- ✅ JWT authentication
- ✅ Camera CRUD operations
- ✅ Recording query and search
- ✅ Stream management
- ✅ Health monitoring

**Frontend (React):**
- ✅ Login/authentication
- ✅ Dashboard with camera grid
- ✅ Live view with HLS player
- ✅ Camera status monitoring
- ⏳ Recording playback (95% - in progress)

**Infrastructure:**
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ PM2 process management
- ✅ Environment configuration
- ✅ Logging and monitoring

---

### **🔄 In Progress:**

**Frontend:**
- ⏳ Recording playback page (95%)
- ⏳ Timeline scrubber
- ⏳ Video clip download

**Optimization:**
- 📋 Single-process architecture
- 📋 Intel QSV hardware acceleration
- 📋 H.264 CRF 23 encoding
- 📋 CPU reduction: 126% → 15% per camera
- 📋 Storage reduction: 48.48 GB → 21.6 GB/day

---

### **📋 Next Steps:**

**Immediate (This Week):**
1. Complete recording playback page
2. Implement Phase 1 optimization (6 hours)
3. 24-hour stability test
4. Performance benchmarking

**Next Week:**
1. Scale to 5 cameras
2. Load testing
3. Demo preparation
4. Documentation update

---

## 📖 **Documentation**

### **Main Documentation:**
📂 **[docs/](./docs/)** - Complete documentation

**Key Documents:**
- 📄 [docs/README.md](./docs/README.md) - Documentation hub
- 📊 [PROGRESS.md](./PROGRESS.md) - Current progress
- 📄 [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- 📄 [docs/PM2_OPERATIONS.md](./docs/PM2_OPERATIONS.md) - PM2 operations

**Reports & Analysis:**
- 📄 [docs/reports/PROGRESS_ANALYSIS.md](./docs/reports/PROGRESS_ANALYSIS.md) - Detailed progress
- 📄 [docs/reports/STORAGE_OPTIMIZATION_ANALYSIS.md](./docs/reports/STORAGE_OPTIMIZATION_ANALYSIS.md) - Storage analysis

**Plans:**
- 📄 [docs/plan/OPTIMIZATION_IMPLEMENTATION_PLAN.md](./docs/plan/OPTIMIZATION_IMPLEMENTATION_PLAN.md) - Optimization plan
- 📄 [docs/plan/Phase1_MVP.md](./docs/plan/Phase1_MVP.md) - Phase 1 plan

**Technical Analysis:**
- 📄 [docs/analysis/16_Optimized_Architecture_v2.md](./docs/analysis/16_Optimized_Architecture_v2.md) - New architecture
- 📄 [docs/analysis/15_Single_Stream_Architecture.md](./docs/analysis/15_Single_Stream_Architecture.md) - Current architecture

---

## 🎯 **Features**

### **Recording:**
- ✅ 24/7 continuous recording
- ✅ 1080p @ 30fps H.264
- ✅ 3-minute MP4 segments
- ✅ 2-day retention (auto-cleanup)
- ✅ Multi-camera support
- ✅ Auto-reconnect on failure

### **Live Streaming:**
- ✅ RTSP/HLS/WebRTC protocols
- ✅ Dual-quality (720p + 1440p)
- ✅ Low latency (~350ms)
- ✅ Hardware acceleration (NVENC)
- ✅ Multi-viewer support

### **Web Interface:**
- ✅ User authentication (JWT)
- ✅ Dashboard with camera grid
- ✅ Live view with HLS player
- ✅ Camera status monitoring
- ⏳ Recording playback (in progress)

### **Management:**
- ✅ Camera CRUD operations
- ✅ Recording search and query
- ✅ Health monitoring
- ✅ Storage management
- ✅ Process management (PM2)

---

## 🔧 **Development**

### **Project Structure:**
```
vms/
├── services/
│   ├── recorder/          # C++ recording engine
│   ├── api/               # Node.js API backend
│   ├── frontend/          # React frontend
│   └── streaming/         # MediaMTX config
├── data/
│   └── recordings/        # Video storage
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── ecosystem.config.js    # PM2 config
```

### **Tech Stack:**
```yaml
Backend:
  - C++ (Recording Engine)
  - Node.js 20 LTS (API)
  - Express.js
  - PostgreSQL 15
  - Redis 7

Frontend:
  - React 18
  - TypeScript
  - Vite
  - Material-UI
  - Video.js

Infrastructure:
  - FFmpeg 6.1.1+ (NVENC + QSV)
  - MediaMTX (streaming)
  - PM2 (process manager)
  - Ubuntu Server 22.04 LTS
```

---

## 📞 **Support**

### **Documentation:**
- Main docs: [docs/README.md](./docs/README.md)
- Operations: [docs/PM2_OPERATIONS.md](./docs/PM2_OPERATIONS.md)
- Quick start: [QUICKSTART.md](./QUICKSTART.md)

### **Troubleshooting:**
```bash
# Check service status
pm2 list

# View logs
pm2 logs

# Restart services
pm2 restart all

# Monitor resources
pm2 monit
```

---

## 📝 **License**

Proprietary - Nguyễn Luân Security & Traffic Monitoring System

---

**Status:** 🟢 Phase 1 MVP 98% Complete - Ready for Optimization  
**Last Updated:** October 20, 2025  
**Next Milestone:** CPU + Storage Optimization (6 hours)
