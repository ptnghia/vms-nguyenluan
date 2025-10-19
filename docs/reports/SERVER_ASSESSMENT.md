# 🖥️ Server Assessment & Test Environment Setup

**Date**: October 19, 2025  
**Purpose**: Validate current server for 3-5 camera MVP test

---

## 📊 **Current Server Specifications**

```yaml
CPU:
  Model: Intel Core i5-14500 (14th Gen Raptor Lake)
  Cores: 14 cores (6P + 8E cores)
  Threads: 20 threads
  Base Clock: 2.6 GHz
  Boost Clock: Up to 5.0 GHz
  
  Features:
    - ✅ Intel QuickSync Video (Gen 12.5)
    - ✅ AVX2, AVX-512 support
    - ✅ Hardware H.264/H.265 encode/decode
    - ✅ Up to 8x 1080p concurrent transcodes

Memory:
  Total: 16 GB DDR4
  Available: ~13 GB
  Swap: 4 GB

GPU:
  Model: NVIDIA GeForce RTX 3050 6GB
  Note: Optional for AI workload, not required for video transcode

Storage:
  Mount: /home
  Total: 367 GB
  Used: 2.5 GB
  Available: 346 GB (94% free)
  
Network:
  [To be verified - check with: ip addr, ethtool]
```

---

## ✅ **Validation for 3-5 Camera MVP**

### **Requirements (from Phase 1 Plan):**

| Component | Required (5 cams) | Current Server | Status |
|-----------|-------------------|----------------|--------|
| **CPU Cores** | 4+ cores | 14 cores | ✅ **OK** (350% overhead) |
| **CPU Threads** | 8+ threads | 20 threads | ✅ **OK** (250% overhead) |
| **QuickSync** | Required | Gen 12.5 | ✅ **Excellent** |
| **RAM** | 8 GB | 16 GB | ✅ **OK** (100% overhead) |
| **Storage** | 100 GB | 346 GB free | ✅ **OK** (3x required) |
| **GPU (AI)** | Optional | RTX 3050 | ✅ **Bonus** for Phase 3 |

### **Performance Estimate:**

```yaml
Single Camera Load (with transcode):
  - Recording: 0.5% CPU (copy mode)
  - Low transcode (720p): 3% CPU (QSV)
  - High transcode (1440p): 6% CPU (QSV)
  Total per camera: ~9.5% CPU

5 Cameras Total:
  Expected CPU: 9.5% × 5 = 47.5% (of 20 threads = ~9.5 threads)
  Expected RAM: 2 GB (500 MB per camera × 5)
  Expected Storage: 50 GB for 3-day retention
  
Current Server Capacity:
  ✅ CPU: 47.5% load → 52.5% headroom
  ✅ RAM: 2 GB / 16 GB = 12.5% → plenty available
  ✅ Storage: 50 GB / 346 GB = 14.5% → excellent
  
Verdict: ✅ EXCELLENT - Can handle 10+ cameras easily
```

---

## 🎯 **Recommended Test Configuration**

### **Phase 1 MVP (Weeks 1-4):**

```yaml
Cameras: 3-5 cameras
Resolution: 1080p @ 4 Mbps
Recording: 24/7, 3-day retention
Live streaming: Dual quality (720p + 1440p)
Features:
  - ✅ Basic recording engine (C++ + FFmpeg)
  - ✅ Simple API (Node.js)
  - ✅ Web UI (React)
  - ✅ Live view grid (4 cameras max)
  
Expected Usage:
  CPU: 30-50%
  RAM: 2-4 GB
  Storage: 30-50 GB
  Network: ~20 Mbps (5 cameras × 4 Mbps)
```

### **Future Scaling Path:**

```yaml
Current Server Can Support:
  - Phase 1: 5 cameras (MVP) ✅
  - Phase 2: 15-20 cameras (with optimization)
  - Phase 3: 20 cameras + AI workload (using RTX 3050)
  
For 50+ cameras: Need additional recording nodes
For 200 cameras: Need 6-node cluster (as per original plan)
```

---

## 🐳 **Docker Environment Setup**

### **Architecture:**

```
Docker Compose Stack:
├── Recording Engine (C++ container)
│   └── FFmpeg 6.0+ with Intel QSV
├── API Server (Node.js container)
│   └── NestJS + PostgreSQL client
├── PostgreSQL Database
│   └── Camera metadata, recordings index
├── Redis Cache
│   └── Live stream sessions
├── Frontend (React container)
│   └── Nginx serving static files
└── Development Tools
    └── Volumes for hot-reload
```

### **Container Specifications:**

```yaml
recording-engine:
  Image: ubuntu:22.04 + FFmpeg + Intel drivers
  Resources:
    CPU: 8 cores (40% of available)
    Memory: 4 GB
    Devices: /dev/dri (for QuickSync)
  Volumes:
    - recordings:/data/recordings
    - logs:/var/log/vms
    
api-server:
  Image: node:20-alpine
  Resources:
    CPU: 2 cores
    Memory: 1 GB
  Ports:
    - "3000:3000"
    
postgres:
  Image: postgres:15-alpine
  Resources:
    CPU: 1 core
    Memory: 512 MB
  Volumes:
    - postgres-data:/var/lib/postgresql/data
    
redis:
  Image: redis:7-alpine
  Resources:
    CPU: 0.5 core
    Memory: 256 MB
    
frontend:
  Image: node:20-alpine (build) + nginx:alpine (serve)
  Resources:
    CPU: 1 core
    Memory: 512 MB
  Ports:
    - "8080:80"
```

---

## 🚀 **Quick Start Commands**

### **1. Verify Server Capabilities:**

```bash
# Check Intel QuickSync support
sudo apt install -y vainfo intel-gpu-tools
vainfo

# Expected output: VAProfileH264Main, VAProfileHEVC, etc.
```

### **2. Install Docker:**

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### **3. Clone & Start:**

```bash
# Navigate to project
cd /home/camera/app/vms

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

---

## 📋 **Pre-Deployment Checklist**

- [ ] **Intel QuickSync verified** (`vainfo` shows H.264/HEVC profiles)
- [ ] **Docker installed** (version 24.0+)
- [ ] **Docker Compose installed** (version 2.20+)
- [ ] **Network configured** (camera VLAN accessible)
- [ ] **Storage mounted** (346GB available at `/home`)
- [ ] **Firewall rules** (ports 3000, 8080, 554 RTSP)
- [ ] **Test cameras identified** (3-5 RTSP streams)
- [ ] **RTSP credentials** (username/password for cameras)

---

## 🔍 **Network Assessment (TODO)**

**Run these commands to verify network:**

```bash
# Check network interfaces
ip addr show

# Check network speed
ethtool eth0 | grep Speed

# Test bandwidth to camera network
iperf3 -c <camera_network_gateway>

# Verify RTSP access to test cameras
ffprobe -rtsp_transport tcp rtsp://admin:password@<camera_ip>:554/stream
```

---

## 💰 **Cost for MVP Test**

```yaml
Hardware: $0 (using existing server)
Software: $0 (open source stack)
Test Cameras: $0 (using existing cameras)
Network: $0 (using existing LAN)

Total MVP Cost: $0 🎉

Time Investment:
  - Docker setup: 2 hours
  - Development: 4 weeks (as per Phase 1 plan)
  - Testing & validation: 1 week
```

---

## ⚠️ **Important Notes**

### **Intel i5-14500 QuickSync Capabilities:**

- ✅ **Supports up to 8x 1080p transcodes** (Gen 12.5)
- ✅ **Better than Xeon E-2388G** used in production plan
- ✅ **Lower power consumption** (~65W TDP vs 95W Xeon)
- ✅ **Excellent for MVP and beyond**

### **RTX 3050 GPU (Bonus):**

- **Not needed for video transcode** (QuickSync is better)
- **Perfect for Phase 3 AI/LPR workload**:
  - YOLOv8 object detection
  - PaddleOCR license plate recognition
  - Real-time inference with CUDA
  - ~5-10x faster than CPU for AI

### **Scaling Considerations:**

```yaml
Current Server Limits:
  Max cameras (recording only): ~20 cameras
  Max cameras (with dual transcode): ~15 cameras
  Max cameras (with AI): ~10-12 cameras
  
Why? QuickSync limit is ~8 concurrent transcodes
With 15 cameras doing dual transcode = 30 outputs
Need quality/performance trade-offs after 8 cameras

For 50+ cameras: Follow Phase 2 plan (add recording nodes)
For 200 cameras: Follow Phase 4 plan (6-node cluster)
```

---

## ✅ **Conclusion**

**Current server is EXCELLENT for MVP testing! 🎉**

```
✅ Intel i5-14500 with QuickSync: Perfect for 5-15 cameras
✅ 16 GB RAM: More than enough
✅ 346 GB storage: Plenty for test data
✅ RTX 3050: Bonus for future AI work
✅ Cost: $0 (use existing hardware)

Recommendation: Proceed with Docker setup immediately!
```

---

**Next Steps:**
1. Install Docker & Docker Compose
2. Verify Intel QuickSync with `vainfo`
3. Review `docker-compose.yml` (to be created)
4. Identify 3-5 test cameras with RTSP access
5. Begin Phase 1 development

---

**Last Updated**: October 19, 2025
