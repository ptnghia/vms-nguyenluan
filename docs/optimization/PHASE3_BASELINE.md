# Phase 3 Baseline - Before Single Process Implementation

**Date:** October 20, 2025 07:49:00  
**Status:** Phase 1 Complete, Starting Phase 3  
**Backup:** `vms-recorder.before-phase3`

---

## 📊 CURRENT PERFORMANCE (PHASE 1)

### **Architecture:**
```yaml
Per camera: 2 separate FFmpeg processes
  Process 1: RTSP decode → Recording (H.265 NVENC)
  Process 2: RTSP decode → Live High (H.264 NVENC, 1080p @ 3Mbps)

Total: 4 processes (2 per camera)
```

### **CPU Usage:**
```yaml
Recording (H.265 NVENC):
  Camera 1: ~19.8%
  Camera 2: ~19.8%
  Total: 39.5%

Live High (H.264 NVENC, 1080p):
  Camera 1: ~20.4%
  Camera 2: ~20.4%
  Total: 40.8%

TOTAL: 80.3% CPU (5.0% of 1600% max)
```

### **Process Count:**
```bash
4 FFmpeg processes:
  - 2 recording processes (H.265 NVENC)
  - 2 live streaming processes (H.264 NVENC)
```

---

## 🎯 PHASE 3 TARGET

### **Architecture:**
```yaml
Per camera: 1 FFmpeg process with 2 outputs
  Single process: RTSP decode → Recording + Live High
    Output 1: MP4 segments (H.265 NVENC, 1080p @ 2Mbps)
    Output 2: RTSP stream (H.264 NVENC, 1080p @ 3Mbps)

Target: 2 processes (1 per camera)
```

### **Expected CPU:**
```yaml
Based on manual test:
  Per camera: 27.8% CPU
  Total (2 cameras): 55.6% CPU

Expected savings: -24.7% (-31%)
```

---

## 📈 IMPROVEMENT TRACKING

| Metric | Baseline | Phase 1 | Phase 3 Target |
|--------|----------|---------|----------------|
| **Total CPU** | 188.1% | 80.3% | 55.6% |
| **Processes** | 4 | 4 | 2 |
| **CPU per camera** | 94.1% | 40.2% | 27.8% |
| **Reduction from baseline** | - | -57% | -70% |

---

**Last Updated:** October 20, 2025 07:49:00  
**Next:** Implement FFmpegMultiOutput with dual outputs

