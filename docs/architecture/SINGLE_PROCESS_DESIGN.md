# Phase 3 Design - Single Process Multi-Output

**Date:** October 20, 2025  
**Goal:** Merge recording + live streaming into single FFmpeg process per camera  
**Expected Savings:** -10-15% CPU

---

## 🎯 OBJECTIVE

**Current Architecture:**
```yaml
Per camera: 2 separate FFmpeg processes
  Process 1: RTSP decode → Recording (H.265 NVENC)
  Process 2: RTSP decode → Live High (H.264 NVENC)

Problem: Decode RTSP stream 2 times per camera
```

**Target Architecture:**
```yaml
Per camera: 1 FFmpeg process with 2 outputs
  Single process: RTSP decode → Recording + Live High
    Output 1: MP4 segments (H.265 NVENC, 1080p @ 2Mbps)
    Output 2: RTSP stream (H.264 NVENC, 1080p @ 3Mbps)

Benefit: Decode RTSP stream 1 time per camera
```

---

## 📐 DESIGN

### **FFmpeg Command Structure:**

```bash
ffmpeg \
  # Hardware acceleration
  -hwaccel cuda \
  
  # Input
  -rtsp_transport tcp \
  -i rtsp://camera_url \
  
  # === OUTPUT 1: Recording (H.265 NVENC) ===
  -map 0:v -map 0:a? \
  -c:v:0 hevc_nvenc \
  -preset:v:0 p4 \
  -b:v:0 2M \
  -c:a:0 aac \
  -b:a:0 128k \
  -f segment \
  -segment_time 180 \
  -segment_format mp4 \
  -strftime 1 \
  -reset_timestamps 1 \
  /path/to/recording_%Y%m%d_%H%M%S.mp4 \
  
  # === OUTPUT 2: Live High (H.264 NVENC) ===
  -map 0:v -map 0:a? \
  -c:v:1 h264_nvenc \
  -preset:v:1 p4 \
  -tune:v:1 ll \
  -s:v:1 1920x1080 \
  -b:v:1 3M \
  -maxrate:v:1 3M \
  -bufsize:v:1 6M \
  -r:v:1 25 \
  -g:v:1 50 \
  -c:a:1 aac \
  -b:a:1 128k \
  -f rtsp \
  -rtsp_transport tcp \
  rtsp://localhost:8554/live/camera_id/high
```

---

## 🔧 IMPLEMENTATION PLAN

### **Step 1: Modify FFmpegMultiOutput Class**

**File:** `services/recorder/src/ffmpeg_multi_output.hpp`

**Changes:**

1. **Add live streaming parameters to constructor:**
```cpp
FFmpegMultiOutput(
    const std::string& name,
    const std::string& id,
    const std::string& url,
    const std::string& recPath,
    bool enableLive = true  // NEW: Enable live streaming output
)
```

2. **Update buildFFmpegCommand() to add 2nd output:**
```cpp
std::vector<std::string> buildFFmpegCommand() {
    // ... existing input setup ...
    
    // === OUTPUT 1: Recording ===
    args.push_back("-map"); args.push_back("0:v");
    args.push_back("-map"); args.push_back("0:a?");
    args.push_back("-c:v:0"); args.push_back("hevc_nvenc");
    args.push_back("-preset:v:0"); args.push_back("p4");
    args.push_back("-b:v:0"); args.push_back("2M");
    args.push_back("-c:a:0"); args.push_back("aac");
    args.push_back("-b:a:0"); args.push_back("128k");
    // ... segment settings ...
    args.push_back(outputPattern);
    
    // === OUTPUT 2: Live High ===
    if (enableLive) {
        args.push_back("-map"); args.push_back("0:v");
        args.push_back("-map"); args.push_back("0:a?");
        args.push_back("-c:v:1"); args.push_back("h264_nvenc");
        args.push_back("-preset:v:1"); args.push_back("p4");
        args.push_back("-tune:v:1"); args.push_back("ll");
        args.push_back("-s:v:1"); args.push_back("1920x1080");
        args.push_back("-b:v:1"); args.push_back("3M");
        args.push_back("-maxrate:v:1"); args.push_back("3M");
        args.push_back("-bufsize:v:1"); args.push_back("6M");
        args.push_back("-r:v:1"); args.push_back("25");
        args.push_back("-g:v:1"); args.push_back("50");
        args.push_back("-c:a:1"); args.push_back("aac");
        args.push_back("-b:a:1"); args.push_back("128k");
        args.push_back("-f"); args.push_back("rtsp");
        args.push_back("-rtsp_transport"); args.push_back("tcp");
        args.push_back(rtspPublishHigh);
    }
    
    return args;
}
```

3. **Update class documentation:**
```cpp
/**
 * FFmpegMultiOutput - Single FFmpeg process with multiple outputs
 * 
 * PHASE 3 OPTIMIZATION: Single process with 2 outputs
 * - Output 1: Recording (H.265 NVENC, MP4 segments)
 * - Output 2: Live High (H.264 NVENC, RTSP stream)
 * 
 * Benefits:
 * - Single RTSP decode (vs 2 separate decodes)
 * - Reduced process overhead
 * - Expected CPU savings: -10-15%
 */
```

---

### **Step 2: Update CameraRecorder Class**

**File:** `services/recorder/src/camera_recorder.hpp`

**Changes:**

1. **Remove LiveTranscoder object:**
```cpp
// OLD:
FFmpegMultiOutput* recordingProcess;
LiveTranscoder* liveTranscoderHigh;

// NEW:
FFmpegMultiOutput* multiOutputProcess;  // Handles both recording + live
```

2. **Update process creation:**
```cpp
// OLD:
recordingProcess = new FFmpegMultiOutput(cameraName, cameraIdStr, rtspUrl, cameraRecordingPath);
liveTranscoderHigh = new LiveTranscoder(cameraName, cameraIdStr, rtspUrl, "high");

// NEW:
multiOutputProcess = new FFmpegMultiOutput(
    cameraName, 
    cameraIdStr, 
    rtspUrl, 
    cameraRecordingPath,
    true  // Enable live streaming
);
```

3. **Update cleanup:**
```cpp
// OLD:
delete recordingProcess;
delete liveTranscoderHigh;

// NEW:
delete multiOutputProcess;
```

4. **Update status checks:**
```cpp
// OLD:
bool recOk = recordingProcess && recordingProcess->checkStatus();
bool liveOk = liveTranscoderHigh && liveTranscoderHigh->checkStatus();

// NEW:
bool processOk = multiOutputProcess && multiOutputProcess->checkStatus();
```

---

## 📊 EXPECTED RESULTS

### **CPU Breakdown:**

```yaml
Current (Phase 1):
  Recording: 39.5% (includes decode + encode)
  Live High: 40.8% (includes decode + encode)
  Total: 80.3%

Estimated decode overhead per process: ~10%
Total decode overhead: 10% × 4 processes = 40%

After Phase 3:
  Single process: ~68-72% (decode once, encode twice)
  Savings: -10-15% CPU
```

### **Process Count:**

```yaml
Current: 4 processes (2 per camera)
After Phase 3: 2 processes (1 per camera)
Reduction: -50%
```

---

## 🧪 TESTING PLAN

### **Test 1: Single Camera Test**

1. Modify code for 1 camera only
2. Build and deploy
3. Verify both outputs working:
   - Recording: Check MP4 files created
   - Live High: Check RTSP stream accessible
4. Monitor CPU usage
5. Compare with baseline

### **Test 2: Dual Camera Test**

1. Deploy to both cameras
2. Monitor CPU for 30 minutes
3. Verify stability
4. Check video quality

### **Test 3: Stress Test**

1. Run for 2-4 hours
2. Check for memory leaks
3. Verify no dropped frames
4. Check file integrity

---

## ⚠️ RISKS & MITIGATION

### **Risk 1: Single process failure affects both outputs**

**Mitigation:**
- Robust error handling
- Auto-reconnect logic
- Health monitoring

### **Risk 2: Increased complexity**

**Mitigation:**
- Thorough testing
- Keep backup binary
- Rollback plan ready

### **Risk 3: FFmpeg multi-output issues**

**Mitigation:**
- Test FFmpeg command manually first
- Verify both outputs work independently
- Check FFmpeg logs for errors

---

## 🔄 ROLLBACK PLAN

If Phase 3 fails:

1. **Stop service:**
```bash
pm2 stop vms-recorder
```

2. **Restore Phase 1 binary:**
```bash
cd /home/camera/app/vms/services/recorder/build
cp vms-recorder.before-phase3 vms-recorder
```

3. **Restart service:**
```bash
pm2 start vms-recorder
```

4. **Verify:**
- Check 4 FFmpeg processes running
- Verify CPU ~80%

---

## 📝 IMPLEMENTATION CHECKLIST

- [ ] Backup current binary
- [ ] Document Phase 1 performance
- [ ] Modify FFmpegMultiOutput class
- [ ] Update CameraRecorder class
- [ ] Update class documentation
- [ ] Build and test compilation
- [ ] Test FFmpeg command manually
- [ ] Deploy to 1 camera first
- [ ] Verify both outputs working
- [ ] Monitor CPU usage
- [ ] Deploy to 2 cameras
- [ ] Performance validation
- [ ] 2-4 hour stability test
- [ ] Document results

---

**Status:** 📋 DESIGN COMPLETE  
**Next:** Implementation

