# Phase 1: MVP - Core Recording & Live Viewing

**Thời gian**: 4 tuần  
**Ngân sách**: $15,000  
**Mục tiêu**: Proof of concept với 5 cameras

---

## 🎯 **MỤC TIÊU**

### **Objective:**
Xây dựng hệ thống MVP để chứng minh tính khả thi của kiến trúc single-stream với transcode, phục vụ cho quyết định đầu tư giai đoạn tiếp theo.

### **Success Criteria:**
- ✅ 5 cameras recording 24/7 không drops
- ✅ Live view trong browser với latency <500ms
- ✅ Basic playback với time slider
- ✅ System uptime >99%
- ✅ CPU utilization <50%

---

## 📋 **SCOPE & DELIVERABLES**

### **In Scope:**

#### **1. Recording Engine (C++)**
```yaml
Features:
  - RTSP capture từ 5 cameras
  - H.264 decode với Intel QSV
  - Recording main stream (copy mode, no transcode)
  - Transcode to 720p cho live (QSV)
  - MP4 segments 3 phút
  - Auto-restart on failure
  - Health monitoring

Tech Stack:
  - C++17
  - FFmpeg 6.0+
  - Intel Media SDK / oneVPL
  
Deliverables:
  - camera_recorder binary
  - Configuration file (YAML)
  - Systemd service files
  - Basic monitoring script
```

#### **2. API Backend (Node.js)**
```yaml
Features:
  - Camera CRUD operations
  - Start/stop recording per camera
  - Get live stream URL
  - List recordings by camera + time
  - Basic authentication (JWT)
  - Health check endpoints

Tech Stack:
  - Node.js 20 LTS
  - Express.js
  - PostgreSQL 15
  - Redis 7 (optional for Phase 1)
  
Deliverables:
  - REST API server
  - Database schema + migrations
  - API documentation (Swagger/OpenAPI)
  - Postman collection
```

#### **3. Frontend (React)**
```yaml
Features:
  - Login page
  - Dashboard với 5 camera grid
  - Single camera fullscreen view
  - Basic playback với time slider
  - Camera status indicators
  
Tech Stack:
  - React 18 + TypeScript
  - Video.js for playback
  - Material-UI or Ant Design
  - Vite for build
  
Deliverables:
  - Web application
  - Responsive design (desktop + tablet)
  - Deployment package
```

#### **4. Infrastructure**
```yaml
Hardware (pilot):
  - 1× Recording node:
      CPU: Intel with QuickSync
      RAM: 32GB
      Storage: 2TB NVMe
      Network: 1Gbps
  - 1× Database server or VM
  - Development workstation
  
Network:
  - Basic switch (existing)
  - Camera VLAN setup
  
Cost: ~$6,000 (can use existing servers for pilot)
```

#### **5. Test Cameras**
```yaml
Cameras: 5× IP cameras
Resolution: 1080p
Bitrate: 4Mbps
Protocol: RTSP
Cost: ~$1,500 (5× $300) or use existing
```

### **Out of Scope (Phase 2+):**
- ❌ AI/ML features (LPR, motion detection)
- ❌ Mobile app
- ❌ Advanced user management
- ❌ HA/failover
- ❌ Multi-quality transcode (single 720p only)
- ❌ Advanced analytics

---

## 📅 **TIMELINE & MILESTONES**

### **Week 1: Setup & Foundation**

**Infrastructure:**
- [ ] Procure/setup recording node hardware
- [ ] Install Ubuntu Server 22.04 LTS
- [ ] Configure network (VLANs, firewall)
- [ ] Setup 5 test cameras
- [ ] Install FFmpeg with QSV support
- [ ] Install PostgreSQL, Redis (optional)

**Development:**
- [ ] Project repository setup (Git)
- [ ] Development environment setup
- [ ] Database schema design
- [ ] API routes planning
- [ ] UI wireframes

**Deliverable:** Infrastructure ready, project scaffolding complete

---

### **Week 2: Core Recording Engine**

**Backend (C++):**
- [ ] RTSP connection manager
- [ ] FFmpeg wrapper with QSV
- [ ] Single camera recording (copy mode)
- [ ] Single quality transcode (720p)
- [ ] MP4 segmentation (3 min)
- [ ] Error handling & logging
- [ ] Process monitoring

**Testing:**
- [ ] Test 1 camera for 24 hours
- [ ] Verify no frame drops
- [ ] Check CPU usage (<10% per camera)
- [ ] Validate file segments

**Deliverable:** Recording engine working for 1 camera

---

### **Week 3: API & Multi-Camera**

**Backend (Node.js):**
- [ ] Express server setup
- [ ] PostgreSQL connection
- [ ] Camera CRUD endpoints
- [ ] Recording start/stop endpoints
- [ ] Live stream URL generation
- [ ] Recording list/search endpoints
- [ ] JWT authentication
- [ ] Error handling & validation

**Recording Engine:**
- [ ] Scale to 5 cameras
- [ ] Process management per camera
- [ ] Health monitoring
- [ ] Auto-restart on failure
- [ ] Log aggregation

**Testing:**
- [ ] API integration tests
- [ ] Load test với 5 cameras
- [ ] 24-hour stability test
- [ ] Failover scenarios

**Deliverable:** API + 5 cameras recording stable

---

### **Week 4: Frontend & Integration**

**Frontend (React):**
- [ ] Project setup (Vite + TypeScript)
- [ ] Login page with JWT
- [ ] Dashboard with camera grid (2×3)
- [ ] Video player component (Video.js)
- [ ] Live view integration
- [ ] Playback với time slider
- [ ] Camera status indicators
- [ ] Responsive layout

**Integration:**
- [ ] Frontend ↔ API integration
- [ ] Live streaming test (RTSP/HLS)
- [ ] Playback test
- [ ] End-to-end testing
- [ ] Bug fixes

**Documentation:**
- [ ] Installation guide
- [ ] API documentation
- [ ] User manual (basic)
- [ ] Troubleshooting guide

**Demo:**
- [ ] Prepare demo environment
- [ ] Demo script
- [ ] Presentation slides
- [ ] Stakeholder demo

**Deliverable:** Complete MVP ready for demo

---

## 👥 **TEAM & RESPONSIBILITIES**

### **Required Team:**

```yaml
Backend Developer (C++):
  - Recording engine development
  - FFmpeg integration
  - Performance optimization
  - Time: 100% (4 weeks)

Backend Developer (Node.js):
  - API development
  - Database design
  - Authentication
  - Time: 100% (4 weeks)

Frontend Developer:
  - React application
  - Video player integration
  - UI/UX implementation
  - Time: 50% (2 weeks full-time equivalent)

DevOps Engineer:
  - Infrastructure setup
  - Network configuration
  - Monitoring setup
  - Time: 50% (2 weeks full-time equivalent)

Project Manager/Tech Lead:
  - Coordination
  - Architecture decisions
  - Stakeholder communication
  - Time: 25% (1 week full-time equivalent)
```

**Total effort:** ~5.25 person-weeks  
**Cost (personnel):** ~$13,000 @ $2,500/week average

---

## 💰 **BUDGET BREAKDOWN**

```yaml
Hardware (Pilot):
  Recording Node: $3,500
    - Intel Core i5/i7 with QuickSync
    - 32GB RAM
    - 2TB NVMe SSD
    - 1Gbps NIC
  Database VM: $0 (use existing infrastructure)
  Network: $500 (switch, cables)
  Total: $4,000

Cameras:
  5× IP Cameras: $1,500 (or use existing)

Software Licenses:
  OS: Ubuntu (free)
  Database: PostgreSQL (free)
  Tools: All open source
  Total: $0

Development:
  Workstation: $0 (use existing)
  Cloud services: $100 (testing, Git, etc.)

Personnel:
  5.25 person-weeks @ $2,500/week: $13,125

Contingency (10%): $1,875

Grand Total: $20,600

Target: $15,000 (reduce if needed):
  - Use existing cameras: -$1,500
  - Use lower-spec server: -$1,500
  - Reduce contingency: -$875
  - Reduce cloud costs: -$50
  Adjusted: ~$16,675 (still over)
  
Optimization to hit $15k:
  - Reuse existing hardware where possible
  - Use refurbished server: -$1,500
  - Defer network upgrade: -$300
  Final: $14,875 ✅
```

---

## 🔧 **TECHNICAL SPECIFICATIONS**

### **Recording Node Setup:**

```bash
# System specs
CPU: Intel Core i5-12400 or better (with QuickSync)
RAM: 32GB DDR4
Storage:
  - OS: 256GB SSD
  - Data: 2TB NVMe SSD
Network: 1Gbps Ethernet
OS: Ubuntu Server 22.04 LTS

# Software installation
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential cmake git
sudo apt install -y postgresql-client redis-tools

# FFmpeg with QSV support
sudo apt install -y intel-media-va-driver-non-free
# Build FFmpeg from source with --enable-libmfx

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15
```

### **Database Schema (MVP):**

```sql
-- Cameras table
CREATE TABLE cameras (
  id SERIAL PRIMARY KEY,
  camera_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  rtsp_url VARCHAR(500) NOT NULL,
  location VARCHAR(255),
  status VARCHAR(20) DEFAULT 'offline',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recordings table
CREATE TABLE recordings (
  id SERIAL PRIMARY KEY,
  camera_id VARCHAR(50) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  file_size BIGINT,
  duration INT, -- seconds
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id)
);

-- Create indexes
CREATE INDEX idx_recordings_camera_time 
  ON recordings(camera_id, start_time DESC);
CREATE INDEX idx_recordings_start_time 
  ON recordings(start_time DESC);

-- Users table (basic auth)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Recording Engine Config:**

```yaml
# /etc/vms/recorder.yaml
cameras:
  - id: cam_001
    name: "Camera 1 - Main Gate"
    rtsp_url: "rtsp://192.168.10.101:554/stream1"
    enabled: true
  
  - id: cam_002
    name: "Camera 2 - Parking Lot"
    rtsp_url: "rtsp://192.168.10.102:554/stream1"
    enabled: true
  
  # ... cam_003, cam_004, cam_005

recording:
  output_dir: "/data/recordings"
  segment_duration: 180  # seconds
  codec: h264_qsv
  hwaccel: qsv
  
transcoding:
  enabled: true
  quality: 720p
  bitrate: 2000000  # 2Mbps
  preset: veryfast
  output_rtsp: "rtsp://localhost:8554/live/{camera_id}"

monitoring:
  health_check_interval: 30  # seconds
  restart_on_failure: true
  max_restart_attempts: 3

logging:
  level: info
  file: "/var/log/vms/recorder.log"
  max_size: 100MB
  max_files: 10
```

---

## 📊 **TESTING & VALIDATION**

### **Unit Tests:**
```yaml
Recording Engine (C++):
  - RTSP connection handling
  - FFmpeg command building
  - Segment file naming
  - Error recovery
  Coverage target: >70%

API Backend (Node.js):
  - Endpoint responses
  - Authentication
  - Database operations
  - Input validation
  Coverage target: >80%

Frontend (React):
  - Component rendering
  - User interactions
  - API integration
  Coverage target: >60%
```

### **Integration Tests:**
```yaml
End-to-end:
  - Camera → Recording → Storage
  - API → Database
  - Frontend → API → Video playback
  
Load Testing:
  - 5 cameras simultaneous
  - API: 100 req/s
  - Concurrent viewers: 5
```

### **Acceptance Tests:**
```yaml
Functional:
  ✅ Record 5 cameras for 24 hours
  ✅ No frame drops (<0.1%)
  ✅ Live view latency <500ms
  ✅ Playback works smoothly
  ✅ Login/logout works
  
Performance:
  ✅ CPU <50% (5 cameras × 9.5% = 47.5%)
  ✅ Memory <16GB
  ✅ Disk I/O <500MB/s
  ✅ Network <25Mbps
  
Reliability:
  ✅ Auto-restart on crash
  ✅ No data loss
  ✅ Uptime >99% (7 min downtime/week acceptable)
```

---

## 📈 **SUCCESS METRICS**

### **Technical KPIs:**
```yaml
Recording:
  Frame drops: <0.1%
  Segment failures: 0
  CPU per camera: <10%
  Storage utilization: <80%

Live Streaming:
  Latency: <500ms (target: ~400ms)
  Buffering events: <1 per hour
  Quality: Smooth 720p playback

API:
  Response time p95: <200ms
  Error rate: <0.1%
  Uptime: >99.5%

Frontend:
  Page load time: <2s
  Time to first frame: <1s
  User actions: <100ms response
```

### **Business KPIs:**
```yaml
Delivery:
  On-time delivery: Yes (4 weeks)
  Budget: <$15k
  All features implemented: Yes

Stakeholder Satisfaction:
  Demo successful: Yes
  Feedback positive: Yes
  Go-ahead for Phase 2: Yes
```

---

## ⚠️ **RISKS & MITIGATION**

### **Technical Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| QSV driver issues | High | Medium | Test on similar hardware first, fallback to software encode |
| FFmpeg compatibility | Medium | Low | Use stable FFmpeg 6.0+, extensive testing |
| Network bandwidth | Medium | Low | Monitor usage, adjust bitrate if needed |
| Storage I/O bottleneck | Medium | Low | Use NVMe SSD, monitor I/O wait |
| Camera compatibility | Low | Medium | Test with multiple camera brands |

### **Project Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Delayed hardware | High | Low | Order early, have backup vendor |
| Developer unavailable | High | Low | Cross-training, documentation |
| Scope creep | Medium | High | Strict scope control, change request process |
| Timeline slip | Medium | Medium | Weekly check-ins, buffer time |
| Budget overrun | Medium | Low | Reuse existing hardware where possible |

---

## 📚 **DELIVERABLES CHECKLIST**

### **Code:**
- [ ] Recording engine source code (C++)
- [ ] API backend source code (Node.js)
- [ ] Frontend application (React)
- [ ] Database migrations
- [ ] Configuration files
- [ ] Deployment scripts

### **Documentation:**
- [ ] Installation guide
- [ ] Configuration guide
- [ ] API documentation (Swagger)
- [ ] User manual
- [ ] Architecture diagram
- [ ] Troubleshooting guide

### **Infrastructure:**
- [ ] Recording node configured
- [ ] Database setup
- [ ] Network configured
- [ ] Monitoring basic setup

### **Testing:**
- [ ] Unit test suite
- [ ] Integration tests
- [ ] Load test results
- [ ] 24-hour stability test report

### **Demo:**
- [ ] Demo environment ready
- [ ] Demo script
- [ ] Presentation slides
- [ ] Q&A preparation

---

## 🎬 **GO-LIVE CHECKLIST**

### **Pre-deployment:**
- [ ] All code reviewed and merged
- [ ] Tests passing (unit + integration)
- [ ] 24-hour stability test passed
- [ ] Documentation complete
- [ ] Backup plan ready

### **Deployment:**
- [ ] Database migrations executed
- [ ] Recording engine deployed
- [ ] API deployed
- [ ] Frontend deployed
- [ ] Cameras configured and tested

### **Post-deployment:**
- [ ] Smoke tests passed
- [ ] Monitoring active
- [ ] Logs flowing
- [ ] Team notified
- [ ] Stakeholder demo scheduled

### **Demo Day:**
- [ ] Environment stable
- [ ] All 5 cameras working
- [ ] Demo script rehearsed
- [ ] Stakeholders invited
- [ ] Feedback form ready

---

## 🔄 **TRANSITION TO PHASE 2**

### **Go/No-Go Decision Criteria:**

**GO to Phase 2 if:**
- ✅ All technical KPIs met
- ✅ 24-hour stability test passed
- ✅ Stakeholder demo successful
- ✅ Budget within $15k
- ✅ Positive feedback received
- ✅ Phase 2 budget approved

**NO-GO scenarios:**
- ❌ Critical bugs unresolved
- ❌ Performance below target
- ❌ Stakeholder concerns not addressed
- ❌ Budget significantly overrun

### **Handover to Phase 2:**
- [ ] Code repository organized
- [ ] Documentation updated
- [ ] Infrastructure inventory
- [ ] Lessons learned documented
- [ ] Phase 2 requirements refined
- [ ] Team availability confirmed

---

## 📞 **CONTACTS & SUPPORT**

```yaml
Technical Lead:
  Name: [TBD]
  Email: [TBD]
  Phone: [TBD]

Backend Developer (C++):
  Name: [TBD]
  Email: [TBD]

Backend Developer (Node.js):
  Name: [TBD]
  Email: [TBD]

Frontend Developer:
  Name: [TBD]
  Email: [TBD]

DevOps Engineer:
  Name: [TBD]
  Email: [TBD]

Project Manager:
  Name: [TBD]
  Email: [TBD]
  Phone: [TBD]
```

---

**Phase 1 Complete! Ready to build MVP! 🚀**
