# 🔧 Intel iGPU Enable Guide

**Date:** October 20, 2025  
**Purpose:** Guide to enable Intel UHD Graphics 770 in BIOS for QuickSync support

---

## 📋 OVERVIEW

### **Current Status:**
```yaml
CPU: Intel Core i5-14500 (has UHD Graphics 770)
iGPU: DISABLED in BIOS
GPU: NVIDIA RTX 3050 6GB (primary)
Issue: Cannot use Intel QuickSync without iGPU
```

### **Goal:**
```yaml
Enable Intel iGPU in BIOS
Verify iGPU is detected by system
Test Intel QuickSync (QSV) support
Continue with optimization using QSV
```

---

## 🔧 BIOS SETTINGS TO CHANGE

### **Step 1: Enter BIOS/UEFI Setup**

1. **Reboot system:**
   ```bash
   sudo reboot
   ```

2. **Press BIOS key during boot:**
   - Common keys: `Del`, `F2`, `F10`, `F12`, `Esc`
   - For your system, likely: `Del` or `F2`
   - Press repeatedly during boot screen

### **Step 2: Find iGPU Settings**

Look for these menu locations (varies by motherboard):

**Option A: Advanced → System Agent Configuration**
```
Advanced
  └─ System Agent (SA) Configuration
      └─ Graphics Configuration
          └─ iGPU Multi-Monitor: [Enabled]
          └─ Primary Display: [Auto] or [IGFX]
```

**Option B: Advanced → Integrated Graphics**
```
Advanced
  └─ Integrated Graphics Configuration
      └─ Initiate Graphic Adapter: [IGD] or [Auto]
      └─ Internal Graphics: [Enabled]
```

**Option C: Chipset → Internal Graphics**
```
Chipset
  └─ Internal Graphics
      └─ Enabled
```

**Option D: Peripherals → Initial Display Output**
```
Peripherals
  └─ Initial Display Output: [IGFX] or [Auto]
```

### **Step 3: Recommended Settings**

```yaml
Setting Name                    | Recommended Value
--------------------------------|-------------------
Internal Graphics               | Enabled
iGPU Multi-Monitor             | Enabled
Primary Display                | Auto (or IGFX)
DVMT Pre-Allocated             | 64MB or higher
DVMT Total Gfx Mem             | MAX or 256MB+
```

**Important:**
- ✅ Set "iGPU Multi-Monitor" to **Enabled** (allows both iGPU + NVIDIA)
- ✅ Set "Primary Display" to **Auto** (system will choose)
- ⚠️ Do NOT disable NVIDIA GPU
- ⚠️ Do NOT set "Primary Display" to "PEG" (PCI Express Graphics)

### **Step 4: Save and Exit**

1. Press `F10` (or "Save & Exit" option)
2. Confirm: "Yes"
3. System will reboot

---

## ✅ VERIFICATION AFTER REBOOT

### **Step 1: Check if iGPU is Detected**

```bash
# Check for Intel GPU in lspci
lspci | grep -i vga

# Expected output:
# 00:02.0 VGA compatible controller: Intel Corporation Raptor Lake-S GT1 [UHD Graphics 770]
# 01:00.0 VGA compatible controller: NVIDIA Corporation GA107 [GeForce RTX 3050 6GB]
```

**Expected:** 2 VGA controllers (Intel + NVIDIA) ✅

### **Step 2: Check DRI Devices**

```bash
# Check /dev/dri devices
ls -la /dev/dri/

# Expected output:
# card0 (Intel iGPU)
# card1 (NVIDIA GPU)
# renderD128 (Intel iGPU render node)
# renderD129 (NVIDIA GPU render node)
```

**Expected:** 2 cards + 2 render nodes ✅

### **Step 3: Test VA-API (Intel)**

```bash
# Test vainfo with Intel driver
LIBVA_DRIVER_NAME=iHD vainfo

# Expected output:
# libva info: VA-API version 1.20.0
# libva info: Trying to open /usr/lib/x86_64-linux-gnu/dri/iHD_drv_video.so
# libva info: Found init function __vaDriverInit_1_20
# libva info: va_openDriver() returns 0
# vainfo: VA-API version: 1.20 (libva 2.20.0)
# vainfo: Driver version: Intel iHD driver for Intel(R) Gen Graphics - 24.1.0
# ...
# VAProfileH264Main
# VAProfileH264High
# VAProfileHEVCMain
# ...
```

**Expected:** VA-API profiles listed ✅

### **Step 4: Verify FFmpeg QSV Support**

```bash
# Check FFmpeg encoders
ffmpeg -hide_banner -encoders | grep qsv

# Expected output:
# V..... h264_qsv             H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (Intel Quick Sync Video acceleration)
# V..... hevc_qsv             HEVC (Intel Quick Sync Video acceleration)
# ...
```

**Expected:** QSV encoders available ✅

### **Step 5: Test QSV Encoding**

```bash
# Create test video (if needed)
ffmpeg -f lavfi -i testsrc=duration=10:size=1920x1080:rate=30 -c:v libx264 -preset ultrafast /tmp/test_input.mp4

# Test QSV encoding
ffmpeg -hwaccel qsv -c:v h264_qsv -i /tmp/test_input.mp4 \
  -c:v h264_qsv -preset veryfast -global_quality 23 \
  -f null -

# Expected: Encoding completes without errors
```

**Expected:** Encoding successful ✅

---

## 🔍 TROUBLESHOOTING

### **Issue 1: iGPU Not Detected After Enable**

**Symptoms:**
```bash
$ lspci | grep -i vga
01:00.0 VGA compatible controller: NVIDIA Corporation GA107
# Only NVIDIA, no Intel
```

**Solutions:**

1. **Check BIOS setting again:**
   - Make sure "Internal Graphics" is **Enabled**
   - Make sure "iGPU Multi-Monitor" is **Enabled**
   - Try setting "Primary Display" to **IGFX** (not Auto)

2. **Update BIOS:**
   - Check motherboard manufacturer website
   - Download latest BIOS version
   - Flash BIOS update

3. **Check CPU support:**
   - i5-14500 has UHD Graphics 770 ✅
   - Should be supported

### **Issue 2: vainfo Still Fails**

**Symptoms:**
```bash
$ vainfo
vaInitialize failed with error code 18 (invalid parameter)
```

**Solutions:**

1. **Specify Intel device explicitly:**
   ```bash
   LIBVA_DRIVER_NAME=iHD vainfo --display drm --device /dev/dri/renderD128
   ```

2. **Check driver installation:**
   ```bash
   dpkg -l | grep intel-media
   # Should show: intel-media-va-driver
   ```

3. **Reinstall driver:**
   ```bash
   sudo apt remove intel-media-va-driver-non-free
   sudo apt install intel-media-va-driver vainfo
   ```

### **Issue 3: FFmpeg Cannot Use QSV**

**Symptoms:**
```bash
$ ffmpeg -hwaccel qsv -i input.mp4 ...
Device creation failed: -1
```

**Solutions:**

1. **Check FFmpeg build:**
   ```bash
   ffmpeg -hwaccels
   # Should list: qsv
   ```

2. **Specify QSV device:**
   ```bash
   ffmpeg -init_hw_device qsv=hw:/dev/dri/renderD128 -hwaccel qsv ...
   ```

3. **Use vaapi as fallback:**
   ```bash
   ffmpeg -hwaccel vaapi -vaapi_device /dev/dri/renderD128 ...
   ```

---

## 📊 VERIFICATION CHECKLIST

After enabling iGPU, verify all these:

```yaml
✅ Checklist:
  [ ] lspci shows 2 VGA controllers (Intel + NVIDIA)
  [ ] /dev/dri has card0 (Intel) + card1 (NVIDIA)
  [ ] /dev/dri has renderD128 (Intel) + renderD129 (NVIDIA)
  [ ] vainfo shows Intel VA-API profiles
  [ ] ffmpeg -encoders shows h264_qsv
  [ ] Test QSV encoding completes successfully
  [ ] No errors in dmesg | grep -i drm
```

---

## 🎯 AFTER SUCCESSFUL ENABLE

### **Next Steps:**

1. ✅ **Verify iGPU working** (use checklist above)
2. ✅ **Update Task 1.1** - Mark as complete with QSV available
3. ✅ **Continue Task 1.2** - Backup current system
4. ✅ **Proceed with optimization** - Using QSV (Option 1)

### **Expected Results:**

```yaml
After Optimization with QSV:
  CPU: 126% → 15% per camera (88% reduction)
  5 cameras: 75% CPU total ✅ EXCELLENT
  Storage: 48.48 GB → 21.6 GB/day (55% reduction)
  Quality: Excellent (visually lossless)
  Power: Low (15W iGPU vs 75W NVIDIA)
```

---

## 📝 COMMANDS TO RUN AFTER REBOOT

Copy and paste these commands to verify:

```bash
echo "=== 1. CHECK INTEL iGPU DETECTED ==="
lspci | grep -i vga
echo ""

echo "=== 2. CHECK DRI DEVICES ==="
ls -la /dev/dri/
echo ""

echo "=== 3. TEST VA-API ==="
LIBVA_DRIVER_NAME=iHD vainfo 2>&1 | head -30
echo ""

echo "=== 4. CHECK FFMPEG QSV ENCODERS ==="
ffmpeg -hide_banner -encoders 2>&1 | grep qsv
echo ""

echo "=== 5. VERIFICATION SUMMARY ==="
if lspci | grep -q "Intel.*Graphics"; then
  echo "✅ Intel iGPU detected"
else
  echo "❌ Intel iGPU NOT detected"
fi

if [ -e /dev/dri/renderD128 ]; then
  echo "✅ Intel render device exists"
else
  echo "❌ Intel render device NOT found"
fi

if LIBVA_DRIVER_NAME=iHD vainfo 2>&1 | grep -q "VAProfileH264"; then
  echo "✅ VA-API working"
else
  echo "❌ VA-API NOT working"
fi

if ffmpeg -hide_banner -encoders 2>&1 | grep -q "h264_qsv"; then
  echo "✅ FFmpeg QSV available"
else
  echo "❌ FFmpeg QSV NOT available"
fi

echo ""
echo "=== READY TO CONTINUE OPTIMIZATION ==="
```

---

## 📞 SUPPORT

If you encounter issues:

1. **Check BIOS version:**
   ```bash
   sudo dmidecode -t bios
   ```

2. **Check kernel messages:**
   ```bash
   dmesg | grep -i "drm\|i915"
   ```

3. **Check loaded modules:**
   ```bash
   lsmod | grep i915
   ```

4. **Share output** of verification commands above

---

**Status:** ⏸️ **WAITING FOR iGPU ENABLE**  
**Next:** Run verification commands after reboot  
**Then:** Continue with Task 1.2 (Backup) using QSV

**Last Updated:** October 20, 2025

