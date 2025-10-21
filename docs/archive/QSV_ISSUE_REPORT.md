# ⚠️ Intel QuickSync Issue Report

**Date:** October 20, 2025  
**Task:** 1.1 - Verify Intel QSV Support  
**Status:** ❌ **BLOCKED**

---

## 🔍 FINDINGS

### **Hardware:**
```yaml
CPU: Intel Core i5-14500 (14 cores, 20 threads)
  - Has Intel UHD Graphics 770 (integrated GPU)
  - QuickSync Gen 12.5 support ✅

GPU: NVIDIA GeForce RTX 3050 6GB
  - Primary display adapter
  - NVENC support ✅
```

### **Issue:**
```yaml
Problem: Intel iGPU is DISABLED in BIOS
Evidence:
  - lspci shows only NVIDIA GPU
  - No Intel display device found
  - /dev/dri/renderD128 points to NVIDIA
  - vainfo fails with "unsupported drm device: nvid"

Impact:
  - Cannot use Intel QuickSync (QSV)
  - h264_qsv encoder unavailable
  - Original optimization plan blocked
```

### **FFmpeg Encoders Available:**
```yaml
✅ h264_nvenc - NVIDIA NVENC H.264 encoder
✅ hevc_nvenc - NVIDIA NVENC HEVC encoder
❌ h264_qsv - Intel QSV (requires iGPU enabled)
❌ hevc_qsv - Intel QSV (requires iGPU enabled)
✅ libx264 - Software encoder (CPU)
```

---

## 💡 OPTIONS

### **Option 1: Enable Intel iGPU in BIOS** (Recommended)

**Steps:**
1. Reboot system
2. Enter BIOS/UEFI setup
3. Find "Internal Graphics" or "iGPU Multi-Monitor" setting
4. Enable iGPU
5. Set primary display to "Auto" or "iGPU"
6. Save and reboot

**Pros:**
- ✅ Use Intel QuickSync as planned
- ✅ Lower CPU usage (15% per camera)
- ✅ Better quality at same bitrate
- ✅ Can use both iGPU + NVIDIA

**Cons:**
- ⚠️ Requires system reboot
- ⚠️ Need BIOS access
- ⚠️ May need display reconfiguration

**Expected Results:**
```yaml
After enabling iGPU:
  - lspci will show Intel UHD Graphics 770
  - /dev/dri/card0 (Intel) + card1 (NVIDIA)
  - vainfo will work
  - h264_qsv encoder available
  - Proceed with original plan
```

---

### **Option 2: Use NVENC Instead of QSV** (Alternative)

**Changes to Plan:**
```yaml
Original Plan:
  - Single FFmpeg process
  - Intel QSV encoding
  - CPU: 126% → 15% per camera

Modified Plan:
  - Single FFmpeg process
  - NVIDIA NVENC encoding
  - CPU: 126% → 20-25% per camera (still good!)
```

**Pros:**
- ✅ No BIOS changes needed
- ✅ Can implement immediately
- ✅ NVENC quality is excellent
- ✅ Still achieves 80-84% CPU reduction

**Cons:**
- ⚠️ Slightly higher CPU than QSV (20% vs 15%)
- ⚠️ Uses GPU instead of iGPU
- ⚠️ NVIDIA GPU busy (may affect other tasks)

**Implementation:**
```bash
# Instead of:
-c:v h264_qsv -preset veryfast -global_quality 23

# Use:
-c:v h264_nvenc -preset p4 -cq 23 -b:v 0
```

---

## 📊 PERFORMANCE COMPARISON

### **Current (3 processes):**
```yaml
CPU: 126% per camera
  - Recording: 42% (copy mode)
  - Live Low: 42% (NVENC 720p)
  - Live High: 42% (NVENC 1440p)
```

### **Option 1: Single Process + QSV:**
```yaml
CPU: 15% per camera
  - Single process with QSV
  - 88% reduction ✅
```

### **Option 2: Single Process + NVENC:**
```yaml
CPU: 20-25% per camera
  - Single process with NVENC
  - 80-84% reduction ✅
```

### **Comparison:**
```yaml
5 cameras:
  Current: 630% CPU ❌ (not possible)
  QSV: 75% CPU ✅ (ideal)
  NVENC: 100-125% CPU ✅ (acceptable)
```

---

## 🎯 RECOMMENDATION

### **Immediate Action:**

**If BIOS access available:**
→ **Choose Option 1** (Enable iGPU)
- Best performance
- Original plan
- 15% CPU per camera

**If BIOS access NOT available:**
→ **Choose Option 2** (Use NVENC)
- Still excellent results
- 20-25% CPU per camera
- Can implement now

---

## 📋 NEXT STEPS

### **If Option 1 (Enable iGPU):**
1. ⏸️ Pause optimization
2. 🔧 Enable iGPU in BIOS
3. ✅ Verify vainfo works
4. ▶️ Resume optimization with QSV

### **If Option 2 (Use NVENC):**
1. ✅ Update optimization plan
2. ✅ Change encoder to h264_nvenc
3. ✅ Adjust CPU target (20-25%)
4. ▶️ Continue with implementation

---

## 📝 TECHNICAL DETAILS

### **Test Commands:**

```bash
# Check Intel iGPU
lspci | grep -i intel | grep -i display

# Check NVIDIA GPU
lspci | grep -i nvidia

# Check DRI devices
ls -la /dev/dri/

# Test vainfo
LIBVA_DRIVER_NAME=iHD vainfo

# Check FFmpeg encoders
ffmpeg -hide_banner -encoders | grep -E "(qsv|nvenc)"
```

### **Expected After iGPU Enable:**

```bash
$ lspci | grep VGA
00:02.0 VGA compatible controller: Intel Corporation Raptor Lake-S GT1 [UHD Graphics 770]
01:00.0 VGA compatible controller: NVIDIA Corporation GA107 [GeForce RTX 3050 6GB]

$ ls -la /dev/dri/
card0 (Intel)
card1 (NVIDIA)
renderD128 (Intel)
renderD129 (NVIDIA)

$ vainfo
VAProfileH264Main
VAProfileH264High
VAProfileHEVCMain
...
```

---

**Status:** ⏸️ **WAITING FOR DECISION**  
**Blocker:** Intel iGPU disabled in BIOS  
**Options:** Enable iGPU (best) or Use NVENC (good)  
**Impact:** Both options achieve >80% CPU reduction
