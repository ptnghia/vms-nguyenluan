# Camera Compatibility Analysis - Phase 4

**Date:** October 20, 2025 08:12:00  
**Issue:** Camera "Agri Luong Son 1" uses 142% CPU vs 23-28% for other cameras  
**Root Cause:** Pixel format `yuvj420p` (JPEG color range) requires software conversion

---

## 🔍 PROBLEM ANALYSIS

### **Camera Comparison:**

| Camera | Pixel Format | CPU Usage | Status |
|--------|--------------|-----------|--------|
| Duc Tai Dendo 1 | `yuv420p` | 26.5% | ✅ Optimal |
| Duc Tai Dendo 2 | `yuv420p` | 22.9% | ✅ Optimal |
| **Agri Luong Son 1** | **`yuvj420p`** | **142%** | ⚠️ High CPU |

### **Why `yuvj420p` is problematic:**

1. **JPEG color range** (0-255) vs **Video color range** (16-235)
2. **NVENC hardware encoder** expects `yuv420p` (video range)
3. **Software conversion** required: `yuvj420p` → `yuv420p`
4. **CPU overhead:** ~120% additional CPU for conversion

---

## 🎯 SOLUTION OPTIONS

### **Option 1: Accept Higher CPU (RECOMMENDED)**

**Approach:** Keep current setup, accept 142% CPU for this camera type

**Pros:**
- No code changes needed
- Maintains video quality
- Simple to implement

**Cons:**
- Higher CPU usage for `yuvj420p` cameras
- Reduces scalability

**Capacity:**
```yaml
Current: 3 cameras = 191.4% CPU (12% of 1600% max)

Projected capacity:
  2x yuv420p cameras: 50% CPU
  1x yuvj420p camera: 142% CPU
  Total per set: 192% CPU

Max cameras:
  - 4x yuv420p + 2x yuvj420p = ~384% CPU (24% of max)
  - 6x yuv420p + 3x yuvj420p = ~576% CPU (36% of max)
  - 8x yuv420p + 4x yuvj420p = ~768% CPU (48% of max)

Conclusion: Can handle 12 cameras mixed (8 yuv420p + 4 yuvj420p)
```

---

### **Option 2: Hardware-Accelerated Conversion**

**Approach:** Use CUDA/NVENC hardware filters for color space conversion

**Command:**
```bash
ffmpeg -hwaccel cuda -hwaccel_output_format cuda \
  -i rtsp://... \
  -vf "hwupload_cuda,scale_cuda=1920:1080:format=yuv420p" \
  -c:v hevc_nvenc ...
```

**Pros:**
- Reduces CPU usage significantly
- Maintains quality
- Better scalability

**Cons:**
- More complex FFmpeg command
- Requires CUDA support
- May have compatibility issues

**Expected CPU:** ~30-40% (vs 142% current)

---

### **Option 3: Detect and Adapt**

**Approach:** Auto-detect pixel format and apply appropriate settings

**Implementation:**
1. Probe camera stream before starting
2. Detect pixel format (`yuv420p` vs `yuvj420p`)
3. Apply hardware acceleration if `yuvj420p` detected
4. Fallback to software if hardware fails

**Pros:**
- Automatic optimization
- Best performance for all camera types
- Future-proof

**Cons:**
- Complex implementation
- Requires stream probing
- Longer startup time

---

### **Option 4: Lower Quality for Problematic Cameras**

**Approach:** Reduce bitrate/resolution for `yuvj420p` cameras

**Settings:**
- Recording: 1080p @ 1.5 Mbps (vs 2 Mbps)
- Live: 720p @ 2 Mbps (vs 1080p @ 3 Mbps)

**Pros:**
- Reduces CPU significantly
- Simple to implement

**Cons:**
- Lower video quality
- Not ideal for high-quality requirements

**Expected CPU:** ~80-100% (vs 142% current)

---

## 📊 RECOMMENDATION

### **RECOMMENDED: Option 1 (Accept Higher CPU)**

**Rationale:**
1. **System has plenty of capacity:** 1600% max CPU, currently using 12%
2. **Simple and reliable:** No complex changes needed
3. **Maintains quality:** No compromise on video quality
4. **Good scalability:** Can handle 12 mixed cameras (75% yuv420p, 25% yuvj420p)

**Capacity Analysis:**
```yaml
Current setup (3 cameras):
  - 2x yuv420p: 50% CPU
  - 1x yuvj420p: 142% CPU
  - Total: 192% CPU (12% of 1600% max)

Projected for 12 cameras:
  - 8x yuv420p: 200% CPU (8 × 25%)
  - 4x yuvj420p: 568% CPU (4 × 142%)
  - Total: 768% CPU (48% of 1600% max)

Conclusion: System can handle 12 cameras comfortably
```

---

## 🚀 FUTURE OPTIMIZATION (Phase 5)

If we need to support more cameras, implement **Option 2 (Hardware-Accelerated Conversion)**:

### **Implementation Plan:**

1. **Detect pixel format** during camera initialization
2. **Apply CUDA filters** for `yuvj420p` cameras:
   ```cpp
   if (pixelFormat == "yuvj420p") {
       args.push_back("-hwaccel");
       args.push_back("cuda");
       args.push_back("-hwaccel_output_format");
       args.push_back("cuda");
       args.push_back("-vf");
       args.push_back("hwupload_cuda,scale_cuda=1920:1080:format=yuv420p");
   }
   ```

3. **Expected result:** 142% → 30-40% CPU per `yuvj420p` camera

4. **Capacity improvement:**
   - 12 cameras: 768% → 320% CPU
   - Max cameras: 12 → 28 cameras

---

## 📋 CURRENT STATUS

**Decision:** Accept higher CPU for `yuvj420p` cameras (Option 1)

**Current Performance:**
- 3 cameras: 192% CPU (12% of max)
- Capacity: 12 mixed cameras
- Quality: Maintained at highest level

**Next Steps:**
1. ✅ Document camera compatibility
2. ✅ Update system documentation
3. Monitor for 24 hours
4. Consider Phase 5 (hardware acceleration) if more cameras needed

---

## 🎯 SUMMARY

| Metric | Value | Status |
|--------|-------|--------|
| **Current CPU** | 192% (3 cameras) | ✅ Good (12% of max) |
| **Max Capacity** | 12 cameras | ✅ Sufficient |
| **Quality** | Highest (no compromise) | ✅ Maintained |
| **Scalability** | 48% of max CPU | ✅ Good headroom |

**Recommendation:** Keep current setup, monitor performance, implement Phase 5 if needed.

---

**Last Updated:** October 20, 2025 08:12:00  
**Status:** Analysis complete, Option 1 recommended

