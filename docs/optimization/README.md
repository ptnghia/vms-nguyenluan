# Optimization History

**Purpose:** Documentation of all optimization phases (Phase 1-5)

---

## 📊 **Optimization Summary**

| Phase | Focus | CPU Reduction | Key Changes |
|-------|-------|---------------|-------------|
| **Baseline** | Initial | - | Separate processes, H.264 VAAPI |
| **Phase 1** | Resolution | -57% | 1440p → 1080p live streaming |
| **Phase 3** | Architecture | -75% | Single process, dual outputs |
| **Phase 4** | Quality | -70% | CUDA for yuvj420p cameras |
| **Phase 5** | GPU | -81% | NVDEC decode, Hybrid GPU |

**Total Improvement:** 94.1% → 18.1% CPU per camera (81% reduction)

---

## 📄 **Phase Results**

### **Phase 1: Resolution Optimization**
- **File:** [PHASE1_RESULTS.md](./PHASE1_RESULTS.md)
- **Focus:** Reduce live streaming resolution and bitrate
- **Result:** 1440p @ 5Mbps → 1080p @ 3Mbps
- **CPU:** 201% → 80.3% (2 cameras)
- **Reduction:** -57%

### **Phase 2: VAAPI Testing**
- **File:** [PHASE2_TEST_RESULTS.md](./PHASE2_TEST_RESULTS.md)
- **Focus:** Test Intel VAAPI vs NVIDIA NVENC
- **Result:** VAAPI 28.5% vs NVENC 20.4% CPU
- **Decision:** Skip Phase 2, NVENC is 40% more efficient

### **Phase 3: Single Process Architecture**
- **Files:** 
  - [PHASE3_BASELINE.md](./PHASE3_BASELINE.md)
  - [PHASE3_MANUAL_TEST_RESULTS.md](./PHASE3_MANUAL_TEST_RESULTS.md)
  - [PHASE3_PRODUCTION_RESULTS.md](./PHASE3_PRODUCTION_RESULTS.md)
- **Focus:** Merge recording + live streaming into single FFmpeg process
- **Result:** 2 processes → 1 process per camera
- **CPU:** 80.3% → 46.7% (2 cameras)
- **Reduction:** -75% from baseline

### **Phase 4: Adaptive Quality**
- **File:** [PHASE4_ADAPTIVE_QUALITY_RESULTS.md](./PHASE4_ADAPTIVE_QUALITY_RESULTS.md)
- **Focus:** CUDA acceleration for yuvj420p cameras
- **Result:** Camera Agri Luong Son 1: 142% → 24.6% CPU
- **Reduction:** -83% for yuvj420p cameras

### **Phase 5: Hybrid GPU System**
- **Files:**
  - [PHASE5_HYBRID_GPU_INITIAL_RESULTS.md](./PHASE5_HYBRID_GPU_INITIAL_RESULTS.md)
  - [PHASE5_FINAL_RESULTS.md](./PHASE5_FINAL_RESULTS.md)
- **Focus:** NVDEC hardware decode + Hybrid GPU (NVIDIA + Intel)
- **Result:** 56% → 54.3% CPU (3 cameras)
- **Stability:** ±0.3% variance (extremely stable)
- **Capacity:** 12 cameras max (6 NVIDIA + 6 Intel)

---

## 🔬 **Technical Analysis**

### **GPU Utilization Analysis**
- **File:** [GPU_UTILIZATION_ANALYSIS.md](./GPU_UTILIZATION_ANALYSIS.md)
- **Focus:** Analyze GPU usage and identify bottlenecks
- **Finding:** NVENC bottleneck at 47.8%, need hybrid GPU system
- **Solution:** Phase 5 Hybrid GPU implementation

### **H.265 Encoding Tests**
- **Files:**
  - [H265_ENCODING_TEST_RESULTS.md](./H265_ENCODING_TEST_RESULTS.md)
  - [H265_NVENC_PRODUCTION_RESULTS.md](./H265_NVENC_PRODUCTION_RESULTS.md)
- **Focus:** Switch from H.264 VAAPI to H.265 NVENC
- **Result:** 64.98% → 44.1% CPU per camera
- **Reduction:** -32%

### **Camera Compatibility**
- **File:** [CAMERA_COMPATIBILITY_ANALYSIS.md](./CAMERA_COMPATIBILITY_ANALYSIS.md)
- **Focus:** Analyze camera pixel formats and compatibility
- **Finding:** yuvj420p cameras need CUDA acceleration
- **Solution:** Phase 4 implementation

---

## 📈 **Performance Timeline**

```
Baseline (2 cameras):
  CPU: 201% total (100.5% per camera)
  Architecture: Separate processes
  Encoding: H.264 VAAPI

↓ Phase 1 (Resolution)
  CPU: 80.3% total (40.2% per camera)
  Improvement: -60% per camera

↓ Phase 3 (Single Process)
  CPU: 46.7% total (23.4% per camera)
  Improvement: -77% per camera

↓ Phase 4 (CUDA for yuvj420p)
  CPU: 56% total (18.7% per camera, 3 cameras)
  Improvement: -81% per camera

↓ Phase 5 (NVDEC + Hybrid GPU)
  CPU: 54.3% total (18.1% per camera, 3 cameras)
  Improvement: -81% per camera
  Stability: ±0.3% variance
  Capacity: 12 cameras max
```

---

## 🎯 **Key Achievements**

1. **81% CPU Reduction:** 94.1% → 18.1% per camera
2. **500% Capacity Increase:** 2 → 12 cameras
3. **Extreme Stability:** ±0.3% CPU variance
4. **Hybrid GPU System:** NVIDIA + Intel for maximum capacity
5. **Hardware Acceleration:** NVENC + NVDEC + CUDA

---

## 📚 **Related Documentation**

- **System Architecture:** [../SYSTEM_ARCHITECTURE_FINAL.md](../SYSTEM_ARCHITECTURE_FINAL.md)
- **Design Documents:** [../architecture/](../architecture/)
- **Operations:** [../operations/](../operations/)

---

**Last Updated:** October 20, 2025

