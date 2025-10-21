# 🔄 Hybrid Encoder Implementation Plan

**Date:** October 20, 2025  
**Status:** ✅ iGPU ENABLED - Ready to implement  
**Strategy:** QSV Primary + NVENC Fallback + Software Fallback

---

## ✅ HARDWARE VERIFICATION

### **Current Status:**
```yaml
✅ Intel iGPU: ENABLED and WORKING
   Device: Intel UHD Graphics 770 (AlderLake-S GT1)
   DRI: /dev/dri/renderD128 (pci-0000_00_02_0)
   VA-API: Intel iHD driver 24.1.0
   Profiles: H264Main, H264High, HEVCMain, VP9

✅ NVIDIA GPU: AVAILABLE
   Device: GeForce RTX 3050 6GB
   DRI: /dev/dri/renderD129 (pci-0000_01_00_0)
   NVENC: Gen 8 (Ampere)

✅ FFmpeg Support:
   Hardware Accelerators: qsv, cuda, vaapi
   QSV Encoders: h264_qsv, hevc_qsv, av1_qsv
   NVENC Encoders: h264_nvenc, hevc_nvenc
```

---

## 🎯 HYBRID STRATEGY

### **Encoder Priority:**

```yaml
Priority 1: Intel QuickSync (QSV)
  Device: /dev/dri/renderD128
  Encoder: h264_qsv
  CPU Usage: 15% per camera
  Power: 15W
  Best for: Maximum efficiency, scaling to 10+ cameras

Priority 2: NVIDIA NVENC
  Device: GPU 0
  Encoder: h264_nvenc
  CPU Usage: 20-25% per camera
  Power: 75W
  Best for: When QSV unavailable, 5-7 cameras

Priority 3: Software (x264)
  Encoder: libx264
  CPU Usage: 80-100% per camera
  Power: CPU dependent
  Best for: Emergency fallback only
```

### **Automatic Selection Logic:**

```cpp
EncoderType selectEncoder() {
    // 1. Try QSV first
    if (testQSVAvailable()) {
        log("Using Intel QuickSync (QSV) - Best efficiency");
        return ENCODER_QSV;
    }
    
    // 2. Fallback to NVENC
    if (testNVENCAvailable()) {
        log("QSV unavailable, using NVIDIA NVENC");
        return ENCODER_NVENC;
    }
    
    // 3. Last resort: software
    log("Hardware encoding unavailable, using software (x264)");
    return ENCODER_SOFTWARE;
}
```

---

## 📋 IMPLEMENTATION PLAN

### **Phase 1: Encoder Detection (30 min)**

**File:** `services/recorder/src/encoder_detector.hpp`

```cpp
#ifndef ENCODER_DETECTOR_HPP
#define ENCODER_DETECTOR_HPP

#include <string>

enum EncoderType {
    ENCODER_QSV,      // Intel QuickSync
    ENCODER_NVENC,    // NVIDIA NVENC
    ENCODER_SOFTWARE  // Software (x264)
};

class EncoderDetector {
public:
    static EncoderType detectBestEncoder();
    static bool testQSV();
    static bool testNVENC();
    static std::string getEncoderName(EncoderType type);
    static std::string getFFmpegParams(EncoderType type);
};

#endif
```

**Implementation:**
- Test QSV: Try encoding 1 frame with h264_qsv
- Test NVENC: Try encoding 1 frame with h264_nvenc
- Return best available encoder
- Cache result (don't test every time)

### **Phase 2: FFmpegMultiOutput Class (2 hours)**

**File:** `services/recorder/src/ffmpeg_multi_output.hpp`

```cpp
class FFmpegMultiOutput {
private:
    std::string rtspUrl;
    std::string cameraName;
    std::string recordingPath;
    std::string rtmpUrlLow;
    std::string rtmpUrlHigh;
    
    EncoderType encoderType;
    pid_t ffmpegPid;
    bool isRunning;
    
    std::string buildFFmpegCommand();
    std::string getEncoderParams();
    
public:
    FFmpegMultiOutput(const std::string& rtspUrl, 
                      const std::string& cameraName,
                      const std::string& recordingPath,
                      const std::string& rtmpUrlLow,
                      const std::string& rtmpUrlHigh);
    
    bool start();
    void stop();
    bool isHealthy();
    std::string getStatus();
    EncoderType getEncoderType() const { return encoderType; }
};
```

**Key Features:**
- Automatic encoder detection on initialization
- Build appropriate FFmpeg command based on encoder
- Single process with 3 outputs
- Health monitoring
- Logging encoder selection

### **Phase 3: FFmpeg Commands (1 hour)**

**QSV Command:**
```bash
ffmpeg -hwaccel qsv -hwaccel_device /dev/dri/renderD128 \
  -c:v h264_qsv -i rtsp://camera_url \
  -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a \
  # Output 1: Recording (H.264 CRF 23 QSV)
  -c:v:0 h264_qsv -preset veryfast -global_quality 23 -c:a:0 aac \
  -f segment -segment_time 180 -strftime 1 "recording_%Y%m%d_%H%M%S.mp4" \
  # Output 2: Live Low (720p QSV)
  -c:v:1 h264_qsv -preset veryfast -b:v 2M -s 1280x720 -c:a:1 aac \
  -f flv rtmp://localhost/live/camera_low \
  # Output 3: Live High (1440p QSV)
  -c:v:2 h264_qsv -preset veryfast -b:v 5M -s 2560x1440 -c:a:2 aac \
  -f flv rtmp://localhost/live/camera_high
```

**NVENC Command:**
```bash
ffmpeg -hwaccel cuda -hwaccel_device 0 \
  -c:v h264_cuvid -i rtsp://camera_url \
  -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a \
  # Output 1: Recording (H.264 CQ 23 NVENC)
  -c:v:0 h264_nvenc -preset p4 -cq 23 -b:v 0 -c:a:0 aac \
  -f segment -segment_time 180 -strftime 1 "recording_%Y%m%d_%H%M%S.mp4" \
  # Output 2: Live Low (720p NVENC)
  -c:v:1 h264_nvenc -preset p4 -b:v 2M -s 1280x720 -c:a:1 aac \
  -f flv rtmp://localhost/live/camera_low \
  # Output 3: Live High (1440p NVENC)
  -c:v:2 h264_nvenc -preset p4 -b:v 5M -s 2560x1440 -c:a:2 aac \
  -f flv rtmp://localhost/live/camera_high
```

**Software Command (Fallback):**
```bash
ffmpeg -i rtsp://camera_url \
  -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a \
  # Output 1: Recording (H.264 CRF 23 x264)
  -c:v:0 libx264 -preset fast -crf 23 -c:a:0 aac \
  -f segment -segment_time 180 -strftime 1 "recording_%Y%m%d_%H%M%S.mp4" \
  # Output 2: Live Low (720p x264)
  -c:v:1 libx264 -preset veryfast -b:v 2M -s 1280x720 -c:a:1 aac \
  -f flv rtmp://localhost/live/camera_low \
  # Output 3: Live High (1440p x264)
  -c:v:2 libx264 -preset veryfast -b:v 5M -s 2560x1440 -c:a:2 aac \
  -f flv rtmp://localhost/live/camera_high
```

### **Phase 4: Update CameraRecorder (1 hour)**

**Changes to `camera_recorder.hpp`:**
```cpp
class CameraRecorder {
private:
    // OLD: 3 separate processes
    // FFmpegProcess* recordingProcess;
    // FFmpegProcess* liveLowProcess;
    // FFmpegProcess* liveHighProcess;
    
    // NEW: Single multi-output process
    FFmpegMultiOutput* multiOutputProcess;
    
public:
    bool startRecording();
    void stopRecording();
    std::string getEncoderInfo(); // New: report encoder type
};
```

### **Phase 5: Build and Test (1 hour)**

**Test Plan:**
1. Build recorder with new code
2. Test with 1 camera first
3. Verify encoder selection (should be QSV)
4. Verify all 3 outputs working
5. Check CPU usage (should be ~15%)
6. Test NVENC fallback (disable iGPU temporarily)
7. Verify automatic fallback works

### **Phase 6: Deploy (30 min)**

**Deployment Steps:**
1. Stop current recording: `pm2 stop recorder`
2. Backup old binary
3. Deploy new binary
4. Start recording: `pm2 start recorder`
5. Monitor logs for encoder selection
6. Verify performance

### **Phase 7: Validation (1 hour)**

**Validation Checklist:**
- [ ] Encoder detection works correctly
- [ ] QSV is selected as primary encoder
- [ ] All 3 outputs working (recording + 2 live streams)
- [ ] CPU usage ~15% per camera (QSV)
- [ ] Storage rate ~21.6 GB/day per camera
- [ ] Video quality acceptable
- [ ] Logs show encoder selection
- [ ] Fallback works if QSV disabled

---

## 📊 EXPECTED RESULTS

### **With QSV (Primary):**
```yaml
CPU: 126% → 15% per camera (88% reduction)
5 cameras: 75% CPU ✅ EXCELLENT
10 cameras: 150% CPU ✅ POSSIBLE
Storage: 48.48 GB → 21.6 GB/day (55% reduction)
Power: 15W (iGPU)
```

### **With NVENC (Fallback):**
```yaml
CPU: 126% → 20-25% per camera (80-84% reduction)
5 cameras: 100-125% CPU ✅ GOOD
7 cameras: 140-175% CPU ✅ ACCEPTABLE
Storage: 48.48 GB → 21.6 GB/day (55% reduction)
Power: 75W (GPU)
```

### **With Software (Emergency):**
```yaml
CPU: 126% → 80-100% per camera (20-36% reduction)
2 cameras: 160-200% CPU ⚠️ HIGH
Storage: 48.48 GB → 21.6 GB/day (55% reduction)
Power: CPU dependent
```

---

## 🔍 MONITORING & LOGGING

### **Log Messages:**

```
[INFO] Detecting best encoder...
[INFO] Testing Intel QuickSync (QSV)...
[SUCCESS] QSV available - Using Intel QuickSync for best efficiency
[INFO] Camera 'front_gate' started with QSV encoder
[INFO] Expected CPU usage: ~15% per camera
[INFO] Recording: /data/recordings/front_gate/
[INFO] Live Low: rtmp://localhost/live/front_gate_low
[INFO] Live High: rtmp://localhost/live/front_gate_high
```

**If QSV fails:**
```
[WARNING] QSV test failed: Device not available
[INFO] Testing NVIDIA NVENC...
[SUCCESS] NVENC available - Using NVIDIA NVENC
[INFO] Camera 'front_gate' started with NVENC encoder
[INFO] Expected CPU usage: ~20-25% per camera
```

**If both fail:**
```
[ERROR] Hardware encoding unavailable
[WARNING] Falling back to software encoding (x264)
[INFO] Camera 'front_gate' started with SOFTWARE encoder
[WARNING] Expected CPU usage: ~80-100% per camera
[WARNING] Performance may be degraded
```

---

## 📝 CONFIGURATION

### **Environment Variables (Optional):**

```bash
# Force specific encoder (for testing)
VMS_ENCODER=qsv      # Force QSV
VMS_ENCODER=nvenc    # Force NVENC
VMS_ENCODER=software # Force software
VMS_ENCODER=auto     # Auto-detect (default)

# QSV device
VMS_QSV_DEVICE=/dev/dri/renderD128

# NVENC device
VMS_NVENC_DEVICE=0
```

---

## 🎯 BENEFITS OF HYBRID APPROACH

```yaml
✅ Best Performance:
   - Uses QSV when available (15% CPU)
   - Automatic fallback to NVENC (20-25% CPU)
   - Always works (software fallback)

✅ Resilient:
   - Survives hardware changes
   - Survives driver issues
   - No manual configuration

✅ Transparent:
   - Logs encoder selection
   - Reports performance expectations
   - Easy to debug

✅ Future-Proof:
   - Easy to add new encoders (VAAPI, etc.)
   - Easy to add encoder preferences
   - Easy to add per-camera encoder selection
```

---

## 📋 TIMELINE

```yaml
Total: 6 hours

Phase 1: Encoder Detection (30 min)
Phase 2: FFmpegMultiOutput Class (2 hours)
Phase 3: FFmpeg Commands (1 hour)
Phase 4: Update CameraRecorder (1 hour)
Phase 5: Build and Test (1 hour)
Phase 6: Deploy (30 min)
Phase 7: Validation (1 hour)
```

---

**Status:** ✅ **READY TO IMPLEMENT**  
**Hardware:** ✅ QSV + NVENC both available  
**Strategy:** Hybrid with automatic fallback  
**Expected Result:** 88% CPU reduction with QSV

**Last Updated:** October 20, 2025

