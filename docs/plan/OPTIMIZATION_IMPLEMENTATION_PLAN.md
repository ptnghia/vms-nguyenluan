# 🚀 Kế Hoạch Triển Khai Tối Ưu VMS v2.0

**Ngày bắt đầu:** 20 Tháng 10, 2025  
**Mục tiêu:** Giảm 88% CPU + 55% Storage  
**Timeline:** 3 phases (6 hours → 2 days → 2 weeks)

---

## 📋 OVERVIEW

### **Objectives:**

```yaml
Phase 1 (Immediate - 6 hours):
  ✅ Implement single-process architecture
  ✅ Switch to Intel QSV encoding
  ✅ Enable H.264 CRF 23 compression
  ✅ Reduce CPU: 126% → 15% per camera
  ✅ Reduce Storage: 48.48 GB → 21.6 GB per day

Phase 2 (Short-term - 2 days):
  ✅ Upgrade to H.265/HEVC encoding
  ✅ Setup external 4TB HDD
  ✅ Reduce Storage: 21.6 GB → 12.96 GB per day
  ✅ Enable 30 days retention for 5 cameras

Phase 3 (Mid-term - 2 weeks):
  ✅ Implement tiered storage
  ✅ Auto-tiering with re-encoding
  ✅ 365 days retention
  ✅ Total storage: 19TB (vs 88.5TB)
```

---

## 🔴 PHASE 1: IMMEDIATE OPTIMIZATION (6 hours)

### **Timeline:** Hôm nay (20/10/2025)

### **Goal:** Giảm 88% CPU + 55% Storage với H.264 CRF 23

---

### **Task 1.1: Verify Hardware Support** (30 phút)

#### **Checklist:**

```bash
# 1. Verify Intel QSV availability
ffmpeg -hwaccels 2>&1 | grep qsv
# Expected: qsv

# 2. Check QSV encoders
ffmpeg -encoders 2>&1 | grep qsv
# Expected: h264_qsv, hevc_qsv

# 3. Test QSV encoding performance
ffmpeg -hwaccel qsv -c:v h264_qsv \
  -i "/home/camera/app/vms/data/recordings/Duc Tai Dendo 1/Duc_Tai_Dendo_1_20251019_090854.mp4" \
  -c:v h264_qsv -global_quality 23 -preset veryfast \
  -t 60 -f null - 2>&1 | grep "frame="

# Expected: >100 fps encoding speed

# 4. Verify CPU flags
cat /proc/cpuinfo | grep flags | head -1 | grep -o "avx2"
# Expected: avx2 (confirmed)
```

**Acceptance Criteria:**
- ✅ QSV available in FFmpeg
- ✅ h264_qsv encoder works
- ✅ Encoding speed >100 fps
- ✅ CPU has AVX2 support

**Status:** ⬜ Not Started

---

### **Task 1.2: Backup Current System** (30 phút)

#### **Steps:**

```bash
# 1. Stop recorder (optional - can do rolling update)
pm2 stop vms-recorder

# 2. Backup current code
cd /home/camera/app/vms/services/recorder
git add -A
git commit -m "backup: v1.0 before optimization"
git tag v1.0-backup

# 3. Backup current recordings (sample only)
mkdir -p /home/camera/app/vms/backup/recordings-sample
cp "/home/camera/app/vms/data/recordings/Duc Tai Dendo 1/"*.mp4 \
   /home/camera/app/vms/backup/recordings-sample/ | head -10

# 4. Document current metrics
echo "=== Metrics Before Optimization ===" > /home/camera/app/vms/backup/metrics-before.txt
du -sh /home/camera/app/vms/data/recordings/* >> /home/camera/app/vms/backup/metrics-before.txt
pm2 list >> /home/camera/app/vms/backup/metrics-before.txt
free -h >> /home/camera/app/vms/backup/metrics-before.txt
```

**Acceptance Criteria:**
- ✅ Code backed up to git
- ✅ Sample recordings backed up
- ✅ Current metrics documented

**Status:** ⬜ Not Started

---

### **Task 1.3: Create FFmpegMultiOutput Class** (2 hours)

#### **File:** `/home/camera/app/vms/services/recorder/src/ffmpeg_multi_output.hpp`

#### **Implementation:**

```cpp
#pragma once

#include <string>
#include <unistd.h>
#include <sys/wait.h>
#include <signal.h>
#include "logger.hpp"

/**
 * FFmpegMultiOutput - Single process with 3 outputs
 * 
 * Optimized architecture:
 * - Single RTSP connection
 * - Shared input decode (QSV)
 * - 3 outputs: Recording + Live LOW + Live HIGH
 * - CPU: ~15% per camera (vs 126% before)
 */
class FFmpegMultiOutput {
private:
    std::string cameraName;
    std::string cameraId;
    std::string rtspUrl;
    std::string recordingPath;
    std::string mediamtxUrlLow;
    std::string mediamtxUrlHigh;
    pid_t processPid;
    bool isRunning;

public:
    FFmpegMultiOutput(
        const std::string& name,
        const std::string& id,
        const std::string& url,
        const std::string& recPath
    ) : cameraName(name),
        cameraId(id),
        rtspUrl(url),
        recordingPath(recPath),
        processPid(-1),
        isRunning(false) {
        
        // MediaMTX URLs
        mediamtxUrlLow = "rtsp://vms_recorder:vms_recorder_secret_2025@localhost:8554/live/" 
                        + cameraId + "/low";
        mediamtxUrlHigh = "rtsp://vms_recorder:vms_recorder_secret_2025@localhost:8554/live/" 
                         + cameraId + "/high";
    }

    ~FFmpegMultiOutput() {
        stop();
    }

    /**
     * Build optimized FFmpeg command
     */
    std::string buildCommand() {
        std::string cmd = "ffmpeg ";
        
        // Input with QSV hardware decode
        cmd += "-hwaccel qsv -c:v h264_qsv ";
        cmd += "-rtsp_transport tcp ";
        cmd += "-i " + rtspUrl + " ";
        
        // Output 1: Recording (H.264 CRF 23 with QSV)
        cmd += "-map 0:v -c:v h264_qsv ";
        cmd += "-global_quality 23 ";
        cmd += "-look_ahead 1 ";
        cmd += "-preset veryfast ";
        cmd += "-b:v 2M -maxrate 2.5M -bufsize 5M ";
        cmd += "-f segment -segment_time 180 -segment_format mp4 ";
        cmd += "-strftime 1 -reset_timestamps 1 ";
        cmd += recordingPath + "/%Y%m%d_%H%M%S.mp4 ";
        
        // Output 2: Live LOW 720p
        cmd += "-map 0:v -c:v h264_qsv ";
        cmd += "-s 1280x720 ";
        cmd += "-global_quality 25 ";
        cmd += "-b:v 1.5M -maxrate 1.8M -bufsize 3M ";
        cmd += "-preset veryfast -tune ll ";
        cmd += "-r 25 -g 50 ";
        cmd += "-f rtsp " + mediamtxUrlLow + " ";
        
        // Output 3: Live HIGH 1440p
        cmd += "-map 0:v -c:v h264_qsv ";
        cmd += "-s 2560x1440 ";
        cmd += "-global_quality 23 ";
        cmd += "-b:v 3M -maxrate 3.5M -bufsize 6M ";
        cmd += "-preset veryfast -tune ll ";
        cmd += "-r 25 -g 50 ";
        cmd += "-f rtsp " + mediamtxUrlHigh;
        
        return cmd;
    }

    /**
     * Start multi-output process
     */
    bool start() {
        if (isRunning) {
            Logger::warn("FFmpeg multi-output already running for " + cameraName);
            return true;
        }

        std::string cmd = buildCommand();
        Logger::info("Starting FFmpeg multi-output for " + cameraName);
        Logger::debug("Command: " + cmd);

        processPid = fork();

        if (processPid == 0) {
            // Child process
            execl("/bin/sh", "sh", "-c", cmd.c_str(), nullptr);
            Logger::error("Failed to exec FFmpeg for " + cameraName);
            exit(1);
        } else if (processPid > 0) {
            // Parent process
            isRunning = true;
            Logger::info("FFmpeg multi-output started for " + cameraName + 
                        " (PID: " + std::to_string(processPid) + ")");
            return true;
        } else {
            // Fork failed
            Logger::error("Failed to fork FFmpeg process for " + cameraName);
            return false;
        }
    }

    /**
     * Stop process
     */
    void stop() {
        if (!isRunning || processPid <= 0) {
            return;
        }

        Logger::info("Stopping FFmpeg multi-output for " + cameraName);
        
        // Send SIGTERM
        kill(processPid, SIGTERM);
        
        // Wait for process to exit (max 5 seconds)
        int status;
        int attempts = 0;
        while (attempts < 50) {
            pid_t result = waitpid(processPid, &status, WNOHANG);
            if (result != 0) {
                break;
            }
            usleep(100000); // 100ms
            attempts++;
        }
        
        // Force kill if still running
        if (attempts >= 50) {
            Logger::warn("FFmpeg did not stop gracefully, sending SIGKILL");
            kill(processPid, SIGKILL);
            waitpid(processPid, &status, 0);
        }
        
        isRunning = false;
        processPid = -1;
        Logger::info("FFmpeg multi-output stopped for " + cameraName);
    }

    /**
     * Check if process is running
     */
    bool checkRunning() {
        if (!isRunning || processPid <= 0) {
            return false;
        }

        // Check if process exists
        int status;
        pid_t result = waitpid(processPid, &status, WNOHANG);
        
        if (result == 0) {
            // Process still running
            return true;
        } else {
            // Process exited
            isRunning = false;
            if (WIFEXITED(status)) {
                Logger::error("FFmpeg exited with code " + 
                            std::to_string(WEXITSTATUS(status)) + 
                            " for " + cameraName);
            } else if (WIFSIGNALED(status)) {
                Logger::error("FFmpeg killed by signal " + 
                            std::to_string(WTERMSIG(status)) + 
                            " for " + cameraName);
            }
            return false;
        }
    }

    bool getIsRunning() const { return isRunning; }
    pid_t getPid() const { return processPid; }
};
```

**Acceptance Criteria:**
- ✅ File created and compiles
- ✅ Single process with 3 outputs
- ✅ QSV hardware acceleration
- ✅ CRF 23 quality

**Status:** ⬜ Not Started

---

### **Task 1.4: Update CameraRecorder** (1 hour)

#### **File:** `/home/camera/app/vms/services/recorder/src/camera_recorder.hpp`

#### **Changes:**

```cpp
// OLD (v1.0):
FFmpegProcess* ffmpegProcess;
LiveTranscoder* liveTranscoderLow;
LiveTranscoder* liveTranscoderHigh;

// Start 3 separate processes
ffmpegProcess = new FFmpegProcess(...);
liveTranscoderLow = new LiveTranscoder(...);
liveTranscoderHigh = new LiveTranscoder(...);

// NEW (v2.0):
#include "ffmpeg_multi_output.hpp"

FFmpegMultiOutput* ffmpegMultiOutput;

// Start single process
ffmpegMultiOutput = new FFmpegMultiOutput(
    cameraName,
    cameraIdStr,
    rtspUrl,
    cameraRecordingPath
);

if (!ffmpegMultiOutput->start()) {
    Logger::error("Failed to start multi-output for " + cameraName);
    // Handle error...
}
```

**Acceptance Criteria:**
- ✅ Replace 3 processes with 1
- ✅ Code compiles without errors
- ✅ Maintains same functionality

**Status:** ⬜ Not Started

---

### **Task 1.5: Build & Test** (1 hour)

#### **Steps:**

```bash
# 1. Build
cd /home/camera/app/vms/services/recorder/build
cmake .. && make

# Expected: No compilation errors

# 2. Test with 1 camera (dry run)
./vms-recorder --test-mode --camera-id 1 &
TEST_PID=$!

# 3. Monitor for 5 minutes
sleep 300

# 4. Check CPU usage
ps aux | grep vms-recorder
# Expected: <20% CPU

# 5. Check file creation
ls -lh /home/camera/app/vms/data/recordings/Duc\ Tai\ Dendo\ 1/ | tail -5
# Expected: New files ~45MB each (vs 103MB before)

# 6. Check video quality
ffprobe -v error -show_entries stream=bit_rate,codec_name \
  /home/camera/app/vms/data/recordings/Duc\ Tai\ Dendo\ 1/$(ls -t /home/camera/app/vms/data/recordings/Duc\ Tai\ Dendo\ 1/ | head -1)
# Expected: codec_name=h264, bit_rate~2000000

# 7. Stop test
kill $TEST_PID
```

**Acceptance Criteria:**
- ✅ Builds successfully
- ✅ CPU usage <20%
- ✅ File size ~45MB per segment
- ✅ Bitrate ~2 Mbps
- ✅ Video plays correctly

**Status:** ⬜ Not Started

---

### **Task 1.6: Deploy to Production** (1 hour)

#### **Steps:**

```bash
# 1. Stop current recorder
pm2 stop vms-recorder

# 2. Backup current binary
cp /home/camera/app/vms/services/recorder/build/vms-recorder \
   /home/camera/app/vms/backup/vms-recorder-v1.0

# 3. Deploy new binary
cp /home/camera/app/vms/services/recorder/build/vms-recorder \
   /home/camera/app/vms/services/recorder/build/vms-recorder

# 4. Start recorder
pm2 start vms-recorder

# 5. Monitor logs
pm2 logs vms-recorder --lines 100

# 6. Monitor CPU
htop
# Expected: ~15% CPU per camera (vs 126% before)

# 7. Monitor storage growth
watch -n 60 'du -sh /home/camera/app/vms/data/recordings/'
# Expected: ~0.36 GB/hour per camera (vs 0.81 GB/hour before)

# 8. Verify live streams
curl http://localhost:8554/live/cam001/low
curl http://localhost:8554/live/cam001/high
# Expected: 200 OK

# 9. Test frontend
# Open http://192.168.1.232:5173/
# Login and verify live view works
```

**Acceptance Criteria:**
- ✅ Deployment successful
- ✅ No errors in logs
- ✅ CPU usage <20% per camera
- ✅ Storage growth ~0.36 GB/hour
- ✅ Live streams working
- ✅ Frontend playback working

**Status:** ⬜ Not Started

---

### **Phase 1 Deliverables:**

```yaml
✅ Code:
  - ffmpeg_multi_output.hpp (new)
  - camera_recorder.hpp (updated)
  - Compiled binary

✅ Documentation:
  - Metrics before/after
  - Deployment notes
  - Rollback procedure

✅ Metrics:
  - CPU: 126% → 15% per camera (88% reduction)
  - Storage: 48.48 GB → 21.6 GB per day (55% reduction)
  - File size: 103 MB → 45 MB per segment
  - Quality: Maintained (CRF 23)
```

---

## 🟡 PHASE 2: H.265 UPGRADE (2 days)

### **Timeline:** 21-22/10/2025

### **Goal:** Giảm thêm 40% storage với H.265/HEVC

---

### **Day 1: Implement H.265 Encoding**

#### **Task 2.1: Update FFmpegMultiOutput for HEVC** (3 hours)

```cpp
// Change recording output to HEVC
"-map 0:v -c:v hevc_qsv "
"-global_quality 28 "  // CRF 28 for HEVC = CRF 23 for H.264
"-b:v 1.5M -maxrate 2M -bufsize 4M "
```

#### **Task 2.2: Test HEVC Quality** (2 hours)

```bash
# Compare H.264 vs H.265
ffmpeg -i h264_file.mp4 -i hevc_file.mp4 -lavfi psnr -f null -
# Expected PSNR: >40 dB
```

#### **Task 2.3: Browser Compatibility Testing** (2 hours)

- Test Chrome, Firefox, Safari
- Verify HLS playback with HEVC
- Fallback to H.264 if needed

---

### **Day 2: External Storage Setup**

#### **Task 2.4: Purchase & Setup 4TB HDD** (3 hours)

```bash
# Format HDD
sudo mkfs.ext4 /dev/sdb1

# Mount
sudo mkdir -p /mnt/vms-storage
sudo mount /dev/sdb1 /mnt/vms-storage
sudo chown camera:camera /mnt/vms-storage

# Auto-mount
echo "UUID=$(blkid -s UUID -o value /dev/sdb1) /mnt/vms-storage ext4 defaults 0 2" | sudo tee -a /etc/fstab

# Update recording path
export RECORDING_PATH="/mnt/vms-storage/recordings"
```

#### **Task 2.5: Deploy & Monitor** (3 hours)

---

### **Phase 2 Deliverables:**

```yaml
✅ HEVC encoding working
✅ 4TB external HDD mounted
✅ 30 days retention for 5 cameras
✅ Storage: 12.96 GB/day per camera (73% reduction vs v1.0)
```

---

## 🟢 PHASE 3: TIERED STORAGE (2 weeks)

### **Timeline:** 23/10 - 03/11/2025

### **Goal:** 365 days retention với 19TB storage

---

### **Week 1: Development**

- StorageTierManager service
- Auto-tiering cron job
- Re-encoding pipeline
- Database schema updates

### **Week 2: Testing & Deployment**

- Integration testing
- Performance testing
- Production deployment
- Monitoring setup

---

### **Phase 3 Deliverables:**

```yaml
✅ 3-tier storage operational
✅ Auto-tiering working
✅ 365 days retention
✅ Total storage: 19TB (78% reduction vs v1.0)
✅ Cost: $560 (94% savings vs v1.0)
```

---

## ✅ SUCCESS CRITERIA

### **Phase 1:**
- ✅ CPU: <20% per camera
- ✅ Storage: <25 GB/day per camera
- ✅ Quality: Visually lossless
- ✅ Zero downtime

### **Phase 2:**
- ✅ Storage: <15 GB/day per camera
- ✅ 30 days retention working
- ✅ Browser compatibility

### **Phase 3:**
- ✅ 365 days retention
- ✅ <20TB total storage
- ✅ Auto-tiering working

---

## 🚨 ROLLBACK PLAN

### **If Phase 1 fails:**

```bash
# 1. Stop new recorder
pm2 stop vms-recorder

# 2. Restore v1.0 binary
cp /home/camera/app/vms/backup/vms-recorder-v1.0 \
   /home/camera/app/vms/services/recorder/build/vms-recorder

# 3. Restart
pm2 start vms-recorder

# 4. Verify
pm2 logs vms-recorder
```

---

## 📊 MONITORING

### **Metrics to track:**

```bash
# CPU usage
pm2 monit

# Storage growth
watch -n 300 'du -sh /home/camera/app/vms/data/recordings/'

# File sizes
ls -lh /home/camera/app/vms/data/recordings/*/  | tail -20

# Quality check
ffprobe -v error -show_entries stream=bit_rate \
  /home/camera/app/vms/data/recordings/Duc\ Tai\ Dendo\ 1/latest.mp4
```

---

**Status:** 🟢 **READY TO START**  
**Next Action:** Begin Phase 1 Task 1.1  
**Estimated Completion:** 22/10/2025 (Phase 1+2)

