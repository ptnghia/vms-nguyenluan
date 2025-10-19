# VMS - Video Management System# 🎥 VMS - Video Management System

## Hệ thống Quản lý Camera Nguyễn Luân

**An ninh & Giao thông - Security & Traffic Monitoring**

**Mục tiêu:** Hệ thống VMS cho 200 cameras với live streaming, recording, và AI analytics.

[![Status](https://img.shields.io/badge/status-design%20complete-green)](./docs/FINAL_SOLUTION.md)

---[![Phase](https://img.shields.io/badge/phase-ready%20to%20build-blue)](./docs/plan/)

[![Cameras](https://img.shields.io/badge/cameras-200%20(scale%20to%20500+)-brightgreen)](#)

## 🎯 **Features**

---

### **✅ Đã Hoàn Thành (Phase 1 - MVP)**

## 📋 **Tổng quan**

#### **Recording Engine (C++)**

- ✅ RTSP capture từ IP camerasHệ thống Video Management System (VMS) cho giám sát an ninh và giao thông với **200 cameras**, hỗ trợ:

- ✅ Original quality recording (copy codec, 0% GPU)- ✅ Recording 24/7 @ 1080p

- ✅ MP4 segmentation (5 phút/segment)- ✅ Live viewing với adaptive quality (720p/1440p)

- ✅ Auto-reconnect on failure- ✅ AI: License Plate Recognition, Motion Detection, Analytics

- ✅ Multi-camera support (tested với 2 cameras)- ✅ High Availability & 99.9% SLA

- ✅ Scale to 500+ cameras

#### **Live Streaming**

- ✅ Dual quality adaptive streaming:---

  - **Low (720p @ 2Mbps)** - Grid view với nhiều cameras

  - **High (1440p @ 5Mbps)** - Fullscreen hoặc small grid## 🚀 **Quick Start**

- ✅ NVIDIA NVENC hardware encoding

- ✅ MediaMTX RTSP/HLS/WebRTC server### **1. Đọc phương án cuối cùng:**

- ✅ Low latency (~350ms)📄 **[docs/FINAL_SOLUTION.md](./docs/FINAL_SOLUTION.md)** ⭐



#### **Infrastructure**### **2. Xem kế hoạch triển khai:**

- ✅ PostgreSQL database📂 **[docs/plan/](./docs/plan/)** - 5 phases chi tiết

- ✅ Redis cache

- ✅ Docker containers### **3. Tham khảo phân tích kỹ thuật:**

- ✅ Environment configuration📂 **[docs/analysis/](./docs/analysis/)** - Technical analysis & research



------



## 💻 **Yêu Cầu Hệ Thống**## 📊 **System Specs**



### **Hardware**```yaml

- **CPU:** Intel Core i5-14500 (14 cores, 20 threads)Capacity:

- **RAM:** 16GB DDR4  Cameras: 200 (current), 500+ (future)

- **GPU:** NVIDIA RTX 3050 6GB  Recording: 24/7 @ 1080p, 365 days retention

- **Storage:** 2TB NVMe SSD  Live viewers: 100% cameras concurrent

- **Network:** 1Gbps Ethernet  

Performance:

### **Software**  Latency: <500ms

- Ubuntu Server 22.04 LTS  CPU utilization: 39.6%

- FFmpeg 6.1.1+ (NVENC support)  Uptime: 99.9% SLA

- Node.js 20 LTS  

- PostgreSQL 15Architecture:

- Redis 7  Recording: C++ with FFmpeg + Intel QuickSync

- Docker 24+  API: Node.js (NestJS/Express)

- MediaMTX 1.9.3+  AI Workers: Python (Celery)

  Frontend: React + TypeScript

---  Storage: NVMe hot / HDD warm / S3 cold

  

## 🚀 **Quick Start**Network:

  Camera network: 1Gbps (800Mbps used)

```bash  Monitoring center: 10Gbps (960Mbps worst)

# 1. Clone repository  VMS cluster: 10Gbps backbone

git clone https://github.com/ptnghia/vms-nguyenluan.git```

cd vms-nguyenluan

---

# 2. Start infrastructure

docker-compose up -d## 💰 **Cost**



# 3. Build recording engine```yaml

cd services/recorder/buildCAPEX (One-time):

cmake .. && make  Hardware: $87,000

  

# 4. Start streaming serverOPEX (Yearly):

cd ../../streaming  Power & cooling: $21,600

./start-mediamtx.sh &  Cloud storage (S3): $85,200

  Personnel: $36,000

# 5. Start recording  Total: ~$149,000/year

cd ../..  

./run-recorder-simple.shPer Camera:

```  Monthly: ~$69/camera/month

  

---Timeline:

  MVP (5 cameras): 4 weeks

## 📊 **Performance (2 Cameras Tested)**  Production (50 cameras): 10 weeks

  AI Integration: 18 weeks

- **GPU:** 4-7% utilization, 592MB VRAM  Full deployment (200 cameras): 28 weeks

- **CPU:** ~252% (13 cores)  Adaptive multi-quality: 35 weeks total

- **RAM:** 4.5GB / 15GB```

- **Temperature:** 52-53°C

- **Power:** 24.6W---



**Per Camera:**## 🏗️ **Architecture**

- CPU: ~126% (~1.26 cores)

- RAM: ~2.25GB```

- VRAM: ~280MB┌─────────────────────────────────────────────────────┐

│          Camera Network (200 cameras)               │

---│          Single Main Stream: 4Mbps each             │

│          Total: 800Mbps (fits in 1Gbps)            │

## 🔗 **Stream URLs**└──────────────────────┬──────────────────────────────┘

                       │

```bash                       │ RTSP Main Stream

# RTSP (Direct)                       ▼

rtsp://vms_web:vms_web_secret_2025@localhost:8554/live/{camera_uuid}/low┌──────────────────────────────────────────────────────┐

rtsp://vms_web:vms_web_secret_2025@localhost:8554/live/{camera_uuid}/high│       VMS Recording Cluster (6 nodes)                │

│       Per camera: Record + Dual Transcode (QSV)      │

# HLS (Browser)│       - Recording: 1080p (copy, 0% CPU)             │

http://localhost:8888/live/{camera_uuid}/low/index.m3u8│       - Low: 720p @ 2Mbps (3% CPU)                  │

http://localhost:8888/live/{camera_uuid}/high/index.m3u8│       - High: 1440p @ 5Mbps (6% CPU)                │

└──────────────────────┬──────────────────────────────┘

# WebRTC (Low Latency)                       │

http://localhost:8889/live/{camera_uuid}/low/whep                       │ Adaptive quality

http://localhost:8889/live/{camera_uuid}/high/whep                       ▼

```┌──────────────────────────────────────────────────────┐

│       Monitoring Center (4 stations)                 │

---│       Auto quality selection:                        │

│       - Grid ≥18: 720p (economical)                 │

## 📁 **Project Structure**│       - Grid <18: 1440p (high quality)              │

│       - Fullscreen: 1440p (best)                    │

```└──────────────────────────────────────────────────────┘

vms/```

├── services/

│   ├── recorder/          # C++ Recording Engine**Key Innovation**: Single-stream + adaptive multi-quality transcode

│   │   ├── src/           # Source code- ✅ Solves bandwidth bottleneck (800Mbps vs 1.2Gbps)

│   │   └── build/         # Build output- ✅ Better user experience (adaptive quality)

│   ├── streaming/         # MediaMTX Server- ✅ Cost-effective (Intel QSV, no GPU needed)

│   ├── api/               # Node.js API (TODO)- ✅ Industry standard (Milestone, Genetec, Nx Witness pattern)

│   └── ui/                # React Frontend (TODO)

├── data/recordings/       # MP4 storage---

├── docs/plan/            # Planning docs

├── docker-compose.yml## 📁 **Project Structure**

└── README.md

``````

vms/

---├── README.md                      # This file

├── docs/                          # 📚 Main documentation

## 📝 **TODO**│   ├── README.md                 # Documentation guide

│   ├── FINAL_SOLUTION.md         # ⭐ Final solution (START HERE)

- [x] Recording engine│   ├── reports/                  # Assessment reports

- [x] Live streaming (720p + 1440p)│   │   ├── SERVER_ASSESSMENT.md

- [x] NVENC encoding│   │   ├── PROJECT_SUMMARY.md

- [ ] API Backend│   │   └── SETUP_COMPLETE.md

- [ ] Frontend UI│   ├── plan/                     # Implementation plans

- [ ] Authentication│   │   ├── Phase1_MVP.md        # Weeks 1-4

- [ ] Playback interface│   │   ├── Phase2_Production.md # Weeks 5-10

│   │   ├── Phase3_AI_Integration.md # Weeks 11-18

---│   │   ├── Phase4_Enterprise_Scale.md # Weeks 19-28

│   │   └── Phase5_Adaptive_MultiQuality.md # Weeks 29-35

## 📞 **Contact**│   └── analysis/                 # Technical analysis

│       ├── 00_QUICK_REFERENCE.md

**Developer:** Nguyen Luan  │       ├── 01-10_*.md

**GitHub:** [ptnghia/vms-nguyenluan](https://github.com/ptnghia/vms-nguyenluan)│       ├── 11_Infrastructure_Scaling.md

│       ├── 13_Implementation_Summary.md

---│       ├── 15_Single_Stream_Architecture.md # ⭐⭐ Technical deep-dive

│       └── archive/

**Built with ❤️ for professional video surveillance**```


---

## 🎯 **Implementation Phases**

| Phase | Duration | Cameras | Budget | Key Features |
|-------|----------|---------|--------|--------------|
| **1: MVP** | 4 weeks | 5 | $15k | Proof of concept, basic recording |
| **2: Production** | 6 weeks | 50 | $25k | Multi-camera, RBAC, export |
| **3: AI** | 8 weeks | 50 | $20k | LPR, motion, analytics |
| **4: Enterprise** | 10 weeks | 200 | $27k | HA, MFA, monitoring |
| **5: Adaptive** | 7 weeks | 200 | $2k | Multi-quality, 10Gbps |
| **Total** | **35 weeks** | **200** | **$89k** | Complete system |

---

## 🔑 **Key Features**

### **Recording:**
- 24/7 recording @ 1080p
- 3-tier storage (hot/warm/cold)
- 365 days retention
- Zero frame drops
- Auto-failover

### **Live Viewing:**
- Adaptive quality (720p/1440p)
- Grid layouts (up to 64 cameras)
- Latency <500ms
- 100% concurrent cameras
- Video wall support

### **AI & Analytics:**
- License Plate Recognition (>90% accuracy)
- Motion detection with zones
- Vehicle counting & classification
- Traffic analytics
- Real-time alerts

### **Management:**
- RBAC with zones
- MFA security
- Audit logging
- Multi-tenant ready
- Complete monitoring (Prometheus + Grafana)

### **Scalability:**
- Horizontal scaling
- 200 cameras (current)
- 500+ cameras (future)
- 60% CPU headroom
- 10Gbps ready

---

## 💡 **Why This Solution?**

### **vs Commercial VMS (Milestone, Genetec):**
| Aspect | Commercial | Our Solution |
|--------|------------|--------------|
| License cost | $200/cam/year | $0 |
| Customization | Limited | Full control |
| AI features | Extra cost | Included |
| Vendor lock-in | Yes | No |
| Source code | No | Yes |
| **5-year TCO** | ~$375k | ~$832k |

**Note**: Higher TCO but with full control, no vendor lock-in, unlimited customization, and all AI features included.

### **Technical Advantages:**
- ✅ **Bandwidth efficient**: 33% reduction (800Mbps vs 1.2Gbps)
- ✅ **Cost-effective**: Intel QSV (no $10k GPU)
- ✅ **Proven pattern**: Same as industry leaders
- ✅ **Future-proof**: 500+ camera capacity, 4K ready
- ✅ **High quality**: Adaptive 720p/1440p

---

## 🛠️ **Tech Stack**

### **Backend:**
```yaml
Recording Engine: C++17 + FFmpeg 6.0+ + Intel QSV
API: Node.js 20 LTS + NestJS/Express
Database: PostgreSQL 15 + Redis 7
AI Workers: Python 3.11 + Celery + RabbitMQ
ML: TensorFlow / PyTorch / PaddleOCR
```

### **Frontend:**
```yaml
Web: React 18 + TypeScript + Redux
Video: Video.js / HLS.js
UI: Material-UI / Ant Design
Mobile: PWA (Progressive Web App)
```

### **Infrastructure:**
```yaml
OS: Ubuntu Server 22.04 LTS
Storage: NVMe (hot) + HDD RAID6 (warm) + S3 (cold)
Network: 10Gbps backbone, VLAN segmentation
Monitoring: Prometheus + Grafana + ELK Stack
```

---

## 📖 **Documentation**

### **Getting Started:**
1. [Final Solution](./docs/FINAL_SOLUTION.md) - Complete overview
2. [Phase 1: MVP](./docs/plan/Phase1_MVP.md) - Build first 5 cameras
3. [Quick Reference](./docs/analysis/00_QUICK_REFERENCE.md) - Quick answers

### **Technical Details:**
- [Architecture Deep-dive](./docs/analysis/15_Single_Stream_Architecture.md) - Complete technical analysis
- [Infrastructure](./docs/analysis/11_Infrastructure_Scaling.md) - Server & network design
- [Original Plans](./docs/analysis/01-10_*.md) - Initial requirements analysis

### **Reports:**
- [Server Assessment](./docs/reports/SERVER_ASSESSMENT.md) - Hardware validation
- [Project Summary](./docs/reports/PROJECT_SUMMARY.md) - Complete summary
- [Setup Complete](./docs/reports/SETUP_COMPLETE.md) - Infrastructure status

### **Implementation:**
- [Phase 2: Production](./docs/plan/Phase2_Production.md) - Scale to 50 cameras
- [Phase 3: AI](./docs/plan/Phase3_AI_Integration.md) - LPR & analytics
- [Phase 4: Enterprise](./docs/plan/Phase4_Enterprise_Scale.md) - 200 cameras + HA
- [Phase 5: Adaptive](./docs/plan/Phase5_Adaptive_MultiQuality.md) - Multi-quality

---

## 🤝 **Team**

```yaml
Required Roles:
  - Technical Lead / Architect
  - Backend Developer (C++)
  - Backend Developer (Node.js)
  - Frontend Developer (React)
  - AI/ML Engineer
  - DevOps Engineer
  - Project Manager

Phase 1 (MVP): 2-3 developers
Phase 2-3: 4-5 developers
Phase 4-5: 6-8 developers (full team)
```

---

## 📊 **Status**

- ✅ **Requirements** - Complete
- ✅ **Architecture** - Complete
- ✅ **Technical Analysis** - Complete
- ✅ **Implementation Plans** - Complete
- ✅ **Cost Analysis** - Complete
- ⏳ **Phase 1 Budget Approval** - Pending
- ⏳ **Team Recruitment** - Pending
- ⏳ **Hardware Procurement** - Pending

---

## 🚦 **Next Steps**

1. **Review** [Final Solution](./docs/FINAL_SOLUTION.md)
2. **Approve** Phase 1 budget ($15k)
3. **Recruit** initial team (2-3 devs)
4. **Procure** pilot hardware
5. **Start** Phase 1 development

**Target start date**: [TBD]

---

## 📞 **Contact**

```yaml
Project Owner: [TBD]
Technical Lead: [TBD]
Email: [TBD]
```

---

## 📜 **License**

[TBD - Proprietary / Open Source / MIT]

---

## ⭐ **Key Highlights**

```
🎯 200 cameras, 24/7 recording, 365 days retention
📹 Adaptive quality: 720p grid, 1440p fullscreen  
🧠 AI: LPR >90% accuracy, motion, analytics
💰 $87k CAPEX, $149k/year OPEX
⚡ 39.6% CPU, 99.9% SLA
🚀 Scale to 500+ cameras ready
```

---

**Ready to build! 🚀**

**Last updated**: October 19, 2025  
**Version**: 2.0 (Final with Adaptive Multi-Quality)
