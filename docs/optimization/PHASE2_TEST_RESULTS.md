# Phase 2 Test Results - VAAPI vs NVENC

**Date:** October 20, 2025 07:20:00  
**Test:** VAAPI H.264 encoding vs NVENC H.264 encoding  
**Status:** ⚠️ **VAAPI LESS EFFICIENT THAN NVENC**

---

## 🧪 TEST CONFIGURATION

```yaml
Test Setup:
  Encoder: h264_vaapi (Intel UHD Graphics 770)
  Resolution: 1920x1080
  Bitrate: 3 Mbps
  Frame rate: 25 fps
  Duration: 30 seconds
  Camera: Duc Tai Dendo 1 (RTSP)
```

---

## 📊 TEST RESULTS

### **CPU Usage:**

```yaml
VAAPI H.264 Encoding:
  Average: 28.5% CPU
  Min: 23.1% CPU
  Max: 30.5% CPU
  Samples: 6 over 30 seconds
```

### **Comparison with NVENC:**

| Encoder | CPU per Camera | Difference |
|---------|----------------|------------|
| **NVENC H.264** (current) | 20.4% | Baseline |
| **VAAPI H.264** (test) | 28.5% | **+8.1% (+40%)** ⚠️ |

---

## 🔍 ANALYSIS

### **Why is VAAPI Less Efficient?**

1. **NVENC is more mature:**
   - NVIDIA has optimized NVENC over many generations
   - RTX 3050 has 8th Gen NVENC (Ampere)
   - Very efficient for H.264 encoding

2. **Intel UHD 770 limitations:**
   - Gen 12.5 QuickSync
   - Good but not as optimized as NVENC for this workload
   - May be better for H.265 (HEVC)

3. **Workload characteristics:**
   - 1080p @ 3 Mbps is NVENC's sweet spot
   - NVENC excels at real-time encoding
   - Low latency tuning (`-tune ll`) helps NVENC

4. **Driver/software stack:**
   - VAAPI driver overhead
   - Filter chain overhead (`scale,format,hwupload`)
   - NVENC has direct hardware path

---

## 💡 IMPLICATIONS FOR PHASE 2

### **Original Plan:**
```yaml
Phase 2: Chuyển Live sang VAAPI
  Expected: -25-30% CPU savings
  Reason: Offload to Intel iGPU
```

### **Reality:**
```yaml
VAAPI vs NVENC:
  VAAPI: 28.5% per camera
  NVENC: 20.4% per camera
  Difference: +8.1% per camera (+40%)

For 2 cameras:
  VAAPI: 57.0% total
  NVENC: 40.8% total
  Difference: +16.2% total
```

### **Conclusion:**
**❌ Phase 2 (VAAPI for live) is NOT beneficial**

Switching to VAAPI would INCREASE CPU usage by 40%, not decrease it.

---

## 🔄 REVISED OPTIMIZATION STRATEGY

### **What Worked:**
✅ **Phase 1:** Giảm resolution 1440p → 1080p
- Result: -57% CPU (188.1% → 80.3%)
- Status: HUGE SUCCESS

### **What Doesn't Work:**
❌ **Phase 2:** Chuyển live sang VAAPI
- Result: +40% CPU per camera
- Status: NOT RECOMMENDED

### **What to Try Instead:**

#### **Option A: Keep Current Setup (RECOMMENDED)**
```yaml
Current (after Phase 1):
  Recording: H.265 NVENC (39.5%)
  Live: H.264 NVENC 1080p (40.8%)
  Total: 80.3% CPU

Pros:
  - Already achieved 57% reduction
  - Very stable
  - Good scalability (5 cameras possible)
  
Cons:
  - None significant
```

#### **Option B: Try VAAPI for Recording (H.265)**
```yaml
Test: VAAPI H.265 (HEVC) for recording
Reason: Intel UHD 770 may be better at HEVC than H.264

Potential:
  Recording: VAAPI H.265 (unknown CPU)
  Live: NVENC H.264 1080p (40.8%)
  
Need to test first
```

#### **Option C: Focus on Phase 3 (Single Process)**
```yaml
Phase 3: Single process multi-output
  Current: 4 processes (2 per camera)
  Target: 2 processes (1 per camera)
  
Expected savings:
  - Eliminate duplicate RTSP decoding
  - Reduce process overhead
  - Estimated: -10-15% CPU
  
Potential result:
  Total: ~68-72% CPU (giảm thêm 10-15%)
```

---

## 🎯 RECOMMENDED NEXT STEPS

### **Recommendation: SKIP Phase 2, GO TO Phase 3**

**Reasoning:**
1. Phase 1 already achieved excellent results (57% reduction)
2. VAAPI is less efficient than NVENC for H.264
3. Phase 3 (single process) has better potential

**New Plan:**

```yaml
✅ Phase 1: COMPLETE
  - Giảm resolution 1440p → 1080p
  - Result: -57% CPU
  - Status: SUCCESS

❌ Phase 2: SKIP
  - VAAPI less efficient than NVENC
  - Would increase CPU by 40%
  - Status: NOT RECOMMENDED

→ Phase 3: PROCEED
  - Single process multi-output
  - Eliminate duplicate decoding
  - Expected: -10-15% CPU
  - Target: ~68-72% CPU total
```

---

## 📊 PROJECTED FINAL RESULTS

### **If we proceed with Phase 3 only:**

```yaml
Baseline (before optimizations):
  Total: 188.1% CPU

After Phase 1:
  Total: 80.3% CPU (-57%)

After Phase 3 (projected):
  Total: ~68-72% CPU (-62-64% from baseline)

Scalability:
  Current: 5 cameras possible
  After Phase 3: 5-6 cameras possible
```

---

## 🔬 ALTERNATIVE: TEST VAAPI H.265 FOR RECORDING

**If we want to utilize Intel iGPU:**

Test VAAPI H.265 (HEVC) for recording instead of live:

```yaml
Hypothesis:
  Intel UHD 770 may be better at HEVC than H.264
  HEVC is more complex, may benefit from dedicated hardware

Test:
  Recording: VAAPI H.265 @ 1080p, 2 Mbps
  Current: NVENC H.265 @ 1080p, 2 Mbps (39.5%)
  
If VAAPI H.265 < 39.5%:
  → Switch recording to VAAPI
  → Keep live on NVENC
  → Hybrid: VAAPI recording + NVENC live
```

---

## ✅ CONCLUSION

**Phase 2 Test Results:**
- ❌ VAAPI H.264 is 40% LESS efficient than NVENC H.264
- ❌ Switching to VAAPI would INCREASE CPU usage
- ❌ Phase 2 is NOT recommended

**Revised Strategy:**
- ✅ Keep Phase 1 changes (1080p live)
- ❌ Skip Phase 2 (VAAPI for live)
- ✅ Proceed to Phase 3 (single process)
- 🔬 Optional: Test VAAPI H.265 for recording

**Expected Final Result:**
- Total CPU: ~68-72% (vs 188.1% baseline)
- Reduction: 62-64%
- Scalability: 5-6 cameras

---

**Last Updated:** October 20, 2025 07:20:00  
**Status:** ⚠️ PHASE 2 NOT RECOMMENDED  
**Next:** Proceed to Phase 3 OR test VAAPI H.265 for recording

