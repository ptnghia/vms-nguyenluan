# System Architecture

**Purpose:** System architecture and design documents

---

## 📋 **Architecture Documents**

### **1. Single Process Design (Phase 3)**
- **File:** [SINGLE_PROCESS_DESIGN.md](./SINGLE_PROCESS_DESIGN.md)
- **Content:**
  - Single FFmpeg process architecture
  - Dual outputs: Recording + Live streaming
  - Performance comparison vs separate processes
  - Implementation details

### **2. Hybrid GPU Design (Phase 5)**
- **File:** [HYBRID_GPU_DESIGN.md](./HYBRID_GPU_DESIGN.md)
- **Content:**
  - Hybrid GPU system (NVIDIA + Intel)
  - GPU selector algorithm
  - NVDEC hardware decode
  - Capacity planning (12 cameras)

---

## 🏗️ **Current Architecture (Phase 5)**

### **High-Level Overview:**
```
Camera (RTSP)
    │
    ▼
NVDEC Decode (GPU)
    │
    ▼
CUDA Processing (if yuvj420p)
    │
    ├─────────────────────────────┐
    │                             │
    ▼                             ▼
NVENC Encode (Recording)    NVENC Encode (Live)
H.265 @ 2 Mbps              H.264 @ 3 Mbps
    │                             │
    ▼                             ▼
MP4 Segments                MediaMTX (RTSP)
```

### **Key Features:**
- Single FFmpeg process per camera
- Dual outputs in one process
- NVDEC hardware decode
- CUDA acceleration for yuvj420p
- Hybrid GPU: NVIDIA (1-6) + Intel VAAPI (7+)

---

## 📊 **Architecture Evolution**

### **Baseline (Pre-Phase 1):**
```
Camera → Recording Process (H.264 VAAPI)
      → Live Process (H.264 NVENC @ 1440p)
      → Live Process (H.264 NVENC @ 720p)

Total: 3 processes per camera
CPU: 94.1% per camera
```

### **Phase 1: Resolution Optimization**
```
Camera → Recording Process (H.264 VAAPI)
      → Live Process (H.264 NVENC @ 1080p)

Total: 2 processes per camera
CPU: 40.2% per camera (-57%)
```

### **Phase 3: Single Process**
```
Camera → Single Process
         ├─ Recording (H.265 NVENC)
         └─ Live (H.264 NVENC @ 1080p)

Total: 1 process per camera
CPU: 23.4% per camera (-75%)
```

### **Phase 5: Hybrid GPU + NVDEC**
```
Camera → NVDEC Decode → Single Process
                        ├─ Recording (H.265 NVENC)
                        └─ Live (H.264 NVENC @ 1080p)

Total: 1 process per camera
CPU: 18.1% per camera (-81%)
Capacity: 12 cameras (6 NVIDIA + 6 Intel)
```

---

## 🎯 **Design Principles**

1. **Minimize Processes:** Single process per camera
2. **Hardware Acceleration:** Use GPU for decode and encode
3. **Hybrid Approach:** Combine NVIDIA + Intel for maximum capacity
4. **Adaptive Processing:** CUDA for yuvj420p cameras
5. **Stability:** ±0.3% CPU variance

---

## 📚 **Related Documentation**

- **System Architecture:** [../SYSTEM_ARCHITECTURE_FINAL.md](../SYSTEM_ARCHITECTURE_FINAL.md)
- **Optimization Results:** [../optimization/](../optimization/)

---

**Last Updated:** October 20, 2025

