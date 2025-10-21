# GPU Utilization Analysis - Phase 4

**Date:** October 20, 2025 08:25:00  
**System:** 3 cameras (2x yuv420p + 1x yuvj420p)  
**GPUs:** NVIDIA RTX 3050 6GB + Intel UHD 770

---

## 🎯 NVIDIA RTX 3050 6GB UTILIZATION

### **Current Usage (3 cameras):**

```yaml
GPU Core Utilization: 7-9% (avg: 7.7%)
NVENC (Encoder): 30-62% (avg: 47.8%)
NVDEC (Decoder): 3% (minimal)
Memory: 1034/6144 MB (16.8%)
Temperature: 52°C
Power Draw: 25.2 W

Monitoring: 6 samples over 30 seconds
  Sample 1: GPU 8%, NVENC 44%, NVDEC 3%
  Sample 2: GPU 9%, NVENC 30%, NVDEC 3%
  Sample 3: GPU 8%, NVENC 50%, NVDEC 3%
  Sample 4: GPU 6%, NVENC 49%, NVDEC 3%
  Sample 5: GPU 8%, NVENC 62%, NVDEC 3%
  Sample 6: GPU 7%, NVENC 52%, NVDEC 3%

Status: ✅ VERY LOW UTILIZATION
```

---

## 📊 DETAILED ANALYSIS

### **1. NVENC (Hardware Encoder) - 47.8%**

**Current Load:**
- 3 cameras encoding simultaneously
- 6 output streams total:
  - 3x H.265 NVENC (recording)
  - 3x H.264 NVENC (live streaming)

**Capacity Analysis:**
```yaml
Current: 47.8% NVENC utilization

Projected capacity:
  6 cameras (12 streams): ~95% NVENC
  7 cameras (14 streams): ~111% NVENC (may hit limit)

Conclusion: Can handle 6 cameras comfortably
NVENC is the bottleneck (not CPU!)
```

**NVENC Specifications:**
- RTX 3050: 8th Gen NVENC (Ampere)
- Dual encoders: 2x hardware encoding engines
- Max concurrent sessions: ~8-10 streams
- Current sessions: 6 streams (60-75% of max)

### **2. GPU Core - 7.7%**

**Current Load:**
- CUDA color space conversion (1 camera)
- Minimal compute workload

**Capacity Analysis:**
```yaml
Current: 7.7% GPU core utilization

Projected capacity:
  10 cameras with CUDA: ~25% GPU core
  20 cameras with CUDA: ~50% GPU core
  40 cameras with CUDA: ~100% GPU core

Conclusion: GPU core has massive headroom
Not a bottleneck
```

### **3. NVDEC (Hardware Decoder) - 3%**

**Current Load:**
- Minimal usage (RTSP streams decoded by CPU)
- CUDA operations use minimal decode

**Capacity Analysis:**
```yaml
Current: 3% NVDEC utilization

Potential optimization:
  Enable hardware decode: -hwaccel cuda
  Could reduce CPU by additional 10-15%
  
Conclusion: NVDEC is underutilized
Opportunity for further optimization
```

### **4. GPU Memory - 16.8%**

**Current Load:**
- 1034 MB / 6144 MB used
- 5110 MB available (83.2%)

**Capacity Analysis:**
```yaml
Current: 1034 MB (3 cameras)

Projected capacity:
  6 cameras: ~2068 MB (33.7%)
  12 cameras: ~4136 MB (67.3%)
  18 cameras: ~6204 MB (101%) - may hit limit

Conclusion: Memory sufficient for 12-15 cameras
Not a bottleneck for target capacity
```

### **5. Temperature & Power - Excellent**

**Current Status:**
- Temperature: 52°C (very cool)
- Power: 25.2 W (very low)
- TDP: 70W max (36% utilized)

**Thermal Headroom:**
```yaml
Current: 52°C
Max safe: 83°C
Headroom: 31°C

Conclusion: Excellent thermal performance
Can handle much higher load
```

---

## 🎯 INTEL UHD 770 UTILIZATION

### **Current Usage:**

```yaml
Status: NOT USED (idle)
Reason: NVENC is more efficient for current workload

Previous testing (Phase 2):
  VAAPI H.264: 28.5% CPU per camera
  NVENC H.264: 20.4% CPU per camera
  Conclusion: NVENC is 40% more efficient
```

**Potential Use Cases:**
1. **Fallback encoder** if NVENC saturated
2. **Additional capacity** for low-priority streams
3. **Thumbnail generation** or preview streams

---

## 📈 CAPACITY ANALYSIS

### **Current Bottleneck: NVENC (47.8%)**

**Not CPU (56% of 1600% = 3.5%)**  
**Not GPU Core (7.7%)**  
**Not Memory (16.8%)**  
**✅ NVENC Encoder (47.8%)**

### **Maximum Camera Capacity:**

**Scenario 1: All cameras use dual outputs (recording + live)**
```yaml
Current: 3 cameras = 6 NVENC streams = 47.8%
Max: 6 cameras = 12 NVENC streams = ~95%

Bottleneck: NVENC encoder
CPU usage: ~112% (7% of 1600% max)
Conclusion: 6 cameras max with dual outputs
```

**Scenario 2: Recording only (no live streaming)**
```yaml
Current: 3 cameras = 3 NVENC streams = ~24%
Max: 12 cameras = 12 NVENC streams = ~95%

Bottleneck: NVENC encoder
CPU usage: ~224% (14% of 1600% max)
Conclusion: 12 cameras max with recording only
```

**Scenario 3: Mixed (some with live, some without)**
```yaml
Example: 6 cameras with dual + 6 cameras recording only
  = 12 + 6 = 18 NVENC streams
  = ~143% NVENC (over capacity)

Realistic: 4 cameras dual + 4 cameras recording only
  = 8 + 4 = 12 NVENC streams
  = ~95% NVENC
  = 8 cameras total

Conclusion: 8 cameras mixed mode
```

---

## 💡 OPTIMIZATION OPPORTUNITIES

### **1. Enable Hardware Decode (NVDEC)**

**Current:** CPU decodes RTSP streams  
**Proposed:** Use NVDEC for hardware decode

**Implementation:**
```bash
ffmpeg -hwaccel cuda -hwaccel_output_format cuda \
  -c:v h264_cuvid \  # Hardware decode
  -i rtsp://... \
  -c:v hevc_nvenc ...  # Hardware encode
```

**Expected Benefits:**
- CPU reduction: -10-15% per camera
- NVDEC usage: 3% → 30-40%
- Total CPU: 56% → 40-45%
- Capacity: 6 → 7-8 cameras

**Risks:**
- Increased complexity
- May have compatibility issues
- NVDEC has session limits (~8-10)

### **2. Use Intel UHD 770 for Additional Capacity**

**Approach:** Offload some cameras to VAAPI

**Implementation:**
```yaml
Priority cameras: NVENC (highest quality)
Secondary cameras: VAAPI (good quality)

Example:
  4 cameras NVENC: 8 streams = 63% NVENC
  4 cameras VAAPI: 8 streams = ~114% CPU
  Total: 8 cameras, 170% CPU (10.6% of max)
```

**Expected Benefits:**
- Capacity: 6 → 8-10 cameras
- Utilizes both GPUs
- Flexible quality tiers

### **3. Reduce Live Streaming Quality**

**Current:** 1080p @ 3 Mbps  
**Proposed:** 720p @ 2 Mbps for some cameras

**Expected Benefits:**
- NVENC load: -20-30% per stream
- Capacity: 6 → 8-9 cameras
- Quality: Still good for monitoring

---

## 🎯 RECOMMENDATIONS

### **Immediate (Current Setup):**

**Status:** ✅ OPTIMAL

```yaml
Cameras: 3 (2 yuv420p + 1 yuvj420p)
CPU: 56% (3.5% of max)
NVENC: 47.8% (comfortable)
GPU Core: 7.7% (excellent)
Memory: 16.8% (excellent)
Temperature: 52°C (excellent)
Power: 25.2W (excellent)

Conclusion: System is well-balanced and efficient
```

### **Short-term (Add 3 more cameras):**

**Target:** 6 cameras total

```yaml
Expected usage:
  CPU: ~112% (7% of max)
  NVENC: ~95% (near limit)
  GPU Core: ~15%
  Memory: ~34%
  Temperature: ~60°C
  Power: ~35W

Recommendation: ✅ SAFE TO ADD 3 MORE CAMERAS
Bottleneck: NVENC (will be at 95%)
```

### **Medium-term (Optimize for 8+ cameras):**

**Option 1: Enable NVDEC hardware decode**
- Capacity: 6 → 7-8 cameras
- Complexity: Medium
- Risk: Low-Medium

**Option 2: Use Intel UHD 770 for secondary cameras**
- Capacity: 6 → 8-10 cameras
- Complexity: Medium
- Risk: Low

**Option 3: Reduce live streaming quality**
- Capacity: 6 → 8-9 cameras
- Complexity: Low
- Risk: Low (quality trade-off)

### **Long-term (Scale beyond 10 cameras):**

**Option 1: Add second NVIDIA GPU**
- RTX 3050 #2: +6 cameras
- Total: 12 cameras
- Cost: ~$200-250

**Option 2: Upgrade to higher-end GPU**
- RTX 4060: 3x NVENC engines
- Capacity: ~18 cameras
- Cost: ~$300-350

---

## 📊 SUMMARY TABLE

| Metric | Current | Max (Safe) | Max (Theoretical) | Bottleneck |
|--------|---------|------------|-------------------|------------|
| **CPU** | 56% (3.5%) | 1600% (100%) | 1600% | ❌ Not a bottleneck |
| **NVENC** | 47.8% | 95% | 100% | ✅ **PRIMARY BOTTLENECK** |
| **GPU Core** | 7.7% | 100% | 100% | ❌ Not a bottleneck |
| **GPU Memory** | 16.8% | 80% | 100% | ❌ Not a bottleneck |
| **NVDEC** | 3% | 95% | 100% | ❌ Underutilized |
| **Temperature** | 52°C | 75°C | 83°C | ❌ Not a bottleneck |
| **Power** | 25.2W | 60W | 70W | ❌ Not a bottleneck |

**Conclusion:** NVENC encoder is the only bottleneck. All other resources have massive headroom.

---

## 🎯 FINAL RECOMMENDATIONS

### **Current Status (3 cameras):**
✅ **EXCELLENT** - All metrics optimal, massive headroom

### **Add 3 more cameras (6 total):**
✅ **RECOMMENDED** - Will utilize NVENC at 95%, still safe

### **Add 5 more cameras (8 total):**
⚠️ **REQUIRES OPTIMIZATION** - Need to implement Option 1, 2, or 3

### **Add 10+ cameras:**
⚠️ **REQUIRES HARDWARE UPGRADE** - Need second GPU or upgrade

---

**Last Updated:** October 20, 2025 08:25:00  
**Status:** NVENC is the bottleneck at 47.8% (can handle 6 cameras max)  
**Recommendation:** Add 3 more cameras, then evaluate optimization options

