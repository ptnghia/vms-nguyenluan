# VMS System Architecture - Phase 5 Final

**Version:** 5.0  
**Date:** October 20, 2025  
**Status:** ✅ Production Stable

---

## 📋 **EXECUTIVE SUMMARY**

VMS (Video Management System) là hệ thống quản lý camera IP với khả năng:
- **Recording:** H.265 NVENC @ 1080p, 2 Mbps
- **Live Streaming:** H.264 NVENC @ 1080p, 3 Mbps (RTSP/HLS/WebRTC)
- **Performance:** 18.1% CPU per camera (81% reduction from baseline)
- **Capacity:** 12 cameras max (6 NVIDIA + 6 Intel hybrid)
- **Stability:** ±0.3% CPU variance (extremely stable)

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **High-Level Overview:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         VMS System                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Cameras    │───▶│   Recorder   │───▶│   Storage    │    │
│  │  (RTSP/IP)   │    │   (C++)      │    │   (Local)    │    │
│  └──────────────┘    └──────┬───────┘    └──────────────┘    │
│                              │                                  │
│                              ▼                                  │
│                      ┌──────────────┐                          │
│                      │   MediaMTX   │                          │
│                      │   (RTSP/HLS) │                          │
│                      └──────┬───────┘                          │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Frontend   │◀───│   API        │◀───│  Database    │    │
│  │   (React)    │    │   (Node.js)  │    │  (PostgreSQL)│    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **CORE COMPONENTS**

### **1. VMS Recorder (C++)**

**Purpose:** Recording và live streaming engine

**Technology:**
- Language: C++17
- Process Manager: PM2
- FFmpeg: 6.1.1 (CLI wrapper)
- Hardware Acceleration: NVIDIA NVENC, NVDEC, Intel VAAPI

**Architecture (Phase 5):**
```
CameraManager
  └─▶ CameraRecorder (per camera)
       └─▶ FFmpegMultiOutput (single process)
            ├─▶ Output 1: Recording (H.265 NVENC, MP4 segments)
            └─▶ Output 2: Live High (H.264 NVENC, RTSP to MediaMTX)
```

**Key Features:**
- Single process per camera (Phase 3)
- Dual outputs: Recording + Live streaming
- Hybrid GPU system (Phase 5): NVIDIA (cameras 1-6) + Intel VAAPI (cameras 7+)
- NVDEC hardware decode (Phase 5)
- CUDA acceleration for yuvj420p cameras (Phase 4)
- Auto-reconnect on failure
- 3-minute MP4 segments with timestamp

**Performance:**
- CPU: 18.1% per camera (with NVDEC)
- NVENC: ~8.3% per camera (50% for 6 cameras)
- NVDEC: ~0.6% per camera (3.5% for 6 cameras)
- Memory: ~140 MB per camera

---

### **2. MediaMTX (Streaming Gateway)**

**Purpose:** RTSP/HLS/WebRTC streaming server

**Technology:**
- Version: Latest
- Protocol: RTSP (primary), HLS, WebRTC
- Port: 8554 (RTSP), 8888 (HLS), 8889 (WebRTC)

**Features:**
- Multi-protocol support
- Low latency streaming
- Authentication support
- Health check API (port 9997)

**Integration:**
- Receives RTSP streams from VMS Recorder
- Publishes to multiple protocols
- Frontend connects via HLS/WebRTC

---

### **3. API Backend (Node.js)**

**Purpose:** REST API for camera management

**Technology:**
- Runtime: Node.js
- Framework: Express.js
- Database: PostgreSQL (pg library)
- Process Manager: PM2

**Endpoints (Current):**
```
GET  /api/cameras          # List all cameras
GET  /api/cameras/:id      # Get camera details
POST /api/cameras          # Add new camera
PUT  /api/cameras/:id      # Update camera
DELETE /api/cameras/:id    # Delete camera
```

**Status:** ⚠️ Basic implementation, needs expansion

---

### **4. Database (PostgreSQL)**

**Purpose:** Store camera metadata and system config

**Schema:**
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
```

**Connection:**
- Host: localhost
- Port: 5432
- Database: vms
- User: vms_user

---

### **5. Frontend (React)**

**Purpose:** Web UI for camera viewing and management

**Technology:**
- Framework: React
- UI Library: Material-UI
- Video Player: TBD (HLS.js / WebRTC)

**Status:** ⚠️ In development

---

## 💻 **HARDWARE SPECIFICATIONS**

### **Current Production Server:**

```yaml
CPU: Intel Core i5-14500
  - Cores: 14 (6P + 8E)
  - Threads: 20
  - Max CPU: 1600% (in top)
  - iGPU: Intel UHD Graphics 770

GPU: NVIDIA GeForce RTX 3050 6GB
  - Architecture: Ampere (GA107)
  - CUDA Cores: 2560
  - NVENC: 8th Gen (H.264/H.265)
  - NVDEC: 5th Gen
  - Memory: 6 GB GDDR6

RAM: 16 GB DDR4

Storage: 512 GB NVMe SSD
  - Recording path: /home/camera/app/vms/data/recordings/
  - Retention: TBD (currently manual cleanup)

Network: 1 Gbps Ethernet
```

---

## 🎨 **VIDEO ENCODING PIPELINE**

### **Phase 5 Pipeline (Current):**

```
Camera (RTSP)
    │
    ▼
NVDEC Decode (GPU) ──────────────┐
    │                             │
    ▼                             │
CUDA Processing (if yuvj420p)    │ Single FFmpeg Process
    │                             │
    ├─────────────────────────────┤
    │                             │
    ▼                             ▼
NVENC Encode (Recording)    NVENC Encode (Live)
H.265 @ 2 Mbps              H.264 @ 3 Mbps
    │                             │
    ▼                             ▼
MP4 Segments                MediaMTX (RTSP)
(3 min each)                     │
    │                             ▼
    ▼                        HLS/WebRTC
Local Storage                    │
                                 ▼
                            Frontend
```

**Key Optimizations:**
1. **NVDEC Decode:** Hardware decode on GPU (Phase 5)
2. **CUDA Processing:** For yuvj420p color space conversion (Phase 4)
3. **NVENC Encode:** Dual outputs in single process (Phase 3)
4. **Hybrid GPU:** NVIDIA (1-6) + Intel VAAPI (7+) (Phase 5)

---

## 📊 **PERFORMANCE METRICS**

### **Current Production (3 Cameras):**

```yaml
CPU Usage:
  Total: 54.3% ± 0.3%
  Per camera: 18.1% ± 0.1%
  Utilization: 3.4% of 1600% max
  Headroom: 96.6%

GPU Usage (NVIDIA RTX 3050):
  GPU Core: 7.3%
  NVENC: 50.0% (6 streams: 3 recording + 3 live)
  NVDEC: 3.5% (3 decode streams)
  Memory: 860 MB / 6144 MB (14%)
  Temperature: 52°C
  Power: 25.2 W

Stability:
  CPU Variance: ±0.3% (over 60 seconds)
  Status: EXTREMELY STABLE
```

### **Capacity Analysis:**

| Scenario | Cameras | CPU | NVENC | NVDEC | Notes |
|----------|---------|-----|-------|-------|-------|
| **Current** | 3 | 54% | 50% | 3.5% | Production |
| **NVIDIA Only** | 6 | ~108% | ~100% | ~7% | NVENC at limit |
| **Hybrid** | 12 | ~288% | ~100% | ~7% | 6 NVIDIA + 6 VAAPI |

**Bottleneck:** NVENC encoder (12 streams max = 6 cameras × 2 outputs)

**Solution:** Hybrid GPU system (Phase 5)

---

## 🔧 **SOFTWARE STACK**

```yaml
Operating System:
  OS: Ubuntu 22.04 LTS
  Kernel: Linux 6.8.0-48-generic

Core Services:
  VMS Recorder: C++17, FFmpeg 6.1.1
  MediaMTX: Latest
  API: Node.js, Express.js
  Database: PostgreSQL 14

Process Management:
  PM2: v5.x
  Services: vms-recorder, vms-mediamtx, vms-api

Build Tools:
  CMake: 3.22+
  GCC: 11.4.0
  Make: 4.3

Libraries:
  FFmpeg: 6.1.1 (with CUDA support)
  PostgreSQL: libpq
  Node.js: v18+
```

---

## 📁 **DIRECTORY STRUCTURE**

```
/home/camera/app/vms/
├── services/
│   ├── recorder/              # C++ recording engine
│   │   ├── src/               # Source code
│   │   │   ├── main.cpp
│   │   │   ├── camera_manager.hpp
│   │   │   ├── camera_recorder.hpp
│   │   │   ├── ffmpeg_multi_output.hpp
│   │   │   ├── gpu_selector.hpp (Phase 5)
│   │   │   ├── stream_analyzer.hpp (Phase 4)
│   │   │   ├── encoder_detector.hpp
│   │   │   ├── database.hpp
│   │   │   ├── storage_manager.hpp
│   │   │   ├── logger.hpp
│   │   │   └── config.hpp
│   │   ├── build/             # Build output
│   │   │   └── vms-recorder   # Binary
│   │   └── CMakeLists.txt
│   │
│   ├── api/                   # Node.js API
│   │   ├── src/
│   │   │   └── index.js
│   │   └── package.json
│   │
│   ├── frontend/              # React frontend
│   │   └── (in development)
│   │
│   └── mediamtx/              # Streaming server
│       └── mediamtx.yml
│
├── data/
│   └── recordings/            # Video recordings
│       └── [Camera Name]/
│           ├── [Camera]_YYYYMMDD_HHMMSS.mp4
│           └── [Camera]_multi.log
│
├── docs/                      # Documentation
│   ├── SYSTEM_ARCHITECTURE_FINAL.md (this file)
│   ├── README.md
│   ├── QUICK_START.md
│   ├── optimization/          # Phase 1-5 results
│   └── operations/            # Operational guides
│
├── ecosystem.config.js        # PM2 configuration
├── .env                       # Environment variables
└── README.md                  # Project README
```

---

## 🔐 **SECURITY CONSIDERATIONS**

**Current Implementation:**
- RTSP credentials in database (encrypted: ❌)
- MediaMTX authentication (basic auth)
- API authentication (not implemented: ❌)
- Database password in .env file

**Recommendations:**
- Implement API authentication (JWT)
- Encrypt RTSP credentials in database
- Use HTTPS for API
- Implement role-based access control (RBAC)

---

## 📈 **OPTIMIZATION HISTORY**

| Phase | Focus | CPU Reduction | Key Changes |
|-------|-------|---------------|-------------|
| **Baseline** | Initial | - | Separate processes, H.264 VAAPI |
| **Phase 1** | Resolution | -57% | 1440p → 1080p live streaming |
| **Phase 3** | Architecture | -75% | Single process, dual outputs |
| **Phase 4** | Quality | -70% | CUDA for yuvj420p cameras |
| **Phase 5** | GPU | -81% | NVDEC decode, Hybrid GPU |

**Total Improvement:** 94.1% → 18.1% CPU per camera (81% reduction)

---

## 🚀 **FUTURE ENHANCEMENTS**

**Phase 6: API Backend Completion**
- Complete REST API endpoints
- Authentication & authorization
- User management
- Recording playback API

**Phase 7: Frontend Development**
- Camera grid view
- Live streaming player (HLS/WebRTC)
- Recording playback
- Camera management UI
- System monitoring dashboard

**Phase 8: Advanced Features**
- Motion detection
- Event recording
- Cloud backup
- Mobile app
- AI integration (object detection)

---

## 📚 **RELATED DOCUMENTATION**

- **Quick Start:** `docs/QUICK_START.md`
- **Optimization Results:** `docs/optimization/PHASE5_FINAL_RESULTS.md`
- **GPU Analysis:** `docs/optimization/GPU_UTILIZATION_ANALYSIS.md`
- **Operations:** `docs/operations/PM2_OPERATIONS.md`
- **API Documentation:** `docs/api/README.md` (TBD)

---

**Document Version:** 5.0  
**Last Updated:** October 20, 2025  
**Maintained By:** VMS Development Team

