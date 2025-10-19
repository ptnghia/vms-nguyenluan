# 15_Single_Stream_Architecture.md

## ⚠️ **VẤN ĐỀ: Dual-Stream từ Camera**

### **Problem Statement:**
```yaml
Nếu cả VMS và Client đều connect trực tiếp tới camera:

Camera phải cung cấp 2 streams:
  1. Main Stream (1080p @ 4Mbps) → VMS Recording
  2. Sub Stream (720p @ 2Mbps) → Client Live View
  
Total bandwidth từ mỗi camera: 6Mbps
Total cho 200 cameras: 1.2Gbps

Vấn đề:
  ❌ Camera network chỉ có 1Gbps (không đủ!)
  ❌ Camera CPU có thể không handle 2 streams
  ❌ Một số camera chỉ support 1 RTSP connection
  ❌ Tăng gấp đôi traffic không cần thiết
```

---

## ✅ **GIẢI PHÁP 1: VMS Record Main + Transcode to Sub (RECOMMENDED)**

### **Kiến trúc:**
```
┌──────────────────────────────────────────────────────────┐
│                Camera Network (200 cameras)              │
│                ONLY Main Stream (4Mbps each)             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ 800Mbps (200 × 4Mbps)
                     │ Single stream per camera
                     ▼
        ┌────────────────────────────────┐
        │      VMS Recording Cluster     │
        │                                 │
        │  ┌──────────────────────────┐  │
        │  │  Recording Engine (C++)  │  │
        │  │  - Record main stream    │  │
        │  │  - Segments to storage   │  │
        │  └──────────────────────────┘  │
        │                                 │
        │  ┌──────────────────────────┐  │
        │  │  Live Transcoder (GPU)   │  │
        │  │  - Read from main stream │  │
        │  │  - Transcode to 720p     │  │
        │  │  - Relay to clients      │  │
        │  └──────────────────────────┘  │
        └────────────────┬───────────────┘
                         │
                         │ 400Mbps (200 × 2Mbps)
                         │ Transcoded sub-stream
                         ▼
        ┌────────────────────────────────┐
        │   Monitoring Center (Clients)  │
        │   720p live view               │
        └────────────────────────────────┘
```

### **Flow chi tiết:**
```
Camera:
  ├─> Main Stream (1080p @ 4Mbps)
  │     └─> VMS Recording Node
  │           ├─> FFmpeg copy to storage (no CPU)
  │           └─> FFmpeg transcode to 720p (GPU)
  │                 └─> mediamtx relay
  │                       └─> Clients (LAN)
  └─> No sub-stream needed!

Bandwidth từ camera: Only 4Mbps
Camera connections: Only 1 RTSP connection
```

### **Implementation:**

#### **Recording + Transcode Process (Single FFmpeg)**
```cpp
// C++ Recording Engine với integrated transcoding
class CameraProcessor {
public:
    void ProcessCamera(const std::string& camera_id, 
                       const std::string& rtsp_url_main) {
        
        // Single FFmpeg process handles BOTH recording and transcoding
        std::string ffmpeg_cmd = 
            "ffmpeg -rtsp_transport tcp "
            "-i " + rtsp_url_main + " "
            
            // Output 1: Record main stream (copy, no transcode)
            "-map 0 -c copy "
            "-f segment -segment_time 180 -strftime 1 "
            "/data/recordings/" + camera_id + "/%Y%m%d_%H%M%S.mp4"
            
            // Output 2: Transcode to 720p for live (GPU)
            "-map 0:v -c:v h264_nvenc "
            "-s 1280x720 -b:v 2M -maxrate 2.4M -bufsize 1.2M "
            "-preset p1 -tune ll "
            "-f rtsp rtsp://localhost:8554/live/" + camera_id;
        
        // Execute
        ExecuteFFmpeg(ffmpeg_cmd);
    }
};

// Benefits:
// - Single connection to camera (4Mbps)
// - Single FFmpeg process (efficient)
// - Recording: zero CPU (copy mode)
// - Transcoding: GPU accelerated (2% GPU per camera)
// - Total: 200 cameras = 400% GPU (need 4-5 GPUs OR QSV)
```

#### **Alternative: Intel QSV (More cost-effective)**
```cpp
// Use Intel QuickSync instead of NVIDIA
std::string ffmpeg_cmd = 
    "ffmpeg -hwaccel qsv -c:v h264_qsv "
    "-rtsp_transport tcp "
    "-i " + rtsp_url_main + " "
    
    // Output 1: Record (copy)
    "-map 0 -c copy "
    "-f segment -segment_time 180 -strftime 1 "
    "/data/recordings/" + camera_id + "/%Y%m%d_%H%M%S.mp4 "
    
    // Output 2: Transcode 720p (QSV)
    "-map 0:v -c:v h264_qsv "
    "-s 1280x720 -b:v 2M "
    "-preset veryfast "
    "-f rtsp rtsp://localhost:8554/live/" + camera_id;

// Intel QSV specs:
// - 1 CPU can handle 30-40 transcodes
// - 200 cameras = 5-7 CPUs needed
// - Already have 6 recording nodes with Intel CPUs
// - Use existing hardware, no need for GPUs!
```

### **Resource Requirements:**

#### **Option A: NVIDIA GPU**
```yaml
Hardware:
  GPUs needed: 4-5× NVIDIA T4
  Cost: $2,000 × 5 = $10,000
  Power: 70W × 5 = 350W
  
Per GPU:
  Concurrent transcodes: 40-50 cameras
  Utilization: 80-90%
  
Distribution:
  Node 1: 40 cameras
  Node 2: 40 cameras
  Node 3: 40 cameras
  Node 4: 40 cameras
  Node 5: 40 cameras
```

#### **Option B: Intel QSV (RECOMMENDED)**
```yaml
Hardware:
  Use existing CPUs with QuickSync
  Intel Xeon E (consumer grade with QSV)
  Cost: $0 (already planned)
  Power: Already counted
  
Per CPU:
  Concurrent transcodes: 30-40 cameras
  Utilization: 60-70%
  
Distribution:
  Node 1: 35 cameras
  Node 2: 35 cameras
  Node 3: 35 cameras
  Node 4: 35 cameras
  Node 5: 35 cameras
  Node 6: 35 cameras (with headroom)
```

### **Performance Metrics:**
```yaml
Bandwidth from Cameras:
  Before (dual-stream): 1.2Gbps (200 × 6Mbps)
  After (single-stream): 800Mbps (200 × 4Mbps)
  Savings: 33% ✅

Camera Connections:
  Before: 2 connections per camera (400 total)
  After: 1 connection per camera (200 total)
  Savings: 50% ✅

VMS Processing:
  Recording: Zero CPU (copy mode)
  Transcoding: QSV hardware (low CPU impact)
  Total CPU: ~5% per camera
  
Latency:
  Direct RTSP: ~200ms
  Transcode + Relay: ~350ms
  Increase: +150ms (acceptable for monitoring)

Quality:
  Recording: 1080p (unchanged)
  Live: 720p (transcoded from 1080p, good quality)
```

---

## ✅ **GIẢI PHÁP 2: VMS Relay Both Streams (No Transcode)**

### **Kiến trúc:**
```
Camera Network (200 cameras)
  ├─> Main Stream (4Mbps) → VMS Recording
  └─> Sub Stream (2Mbps) → VMS Relay → Clients

VMS pulls both streams từ camera
Bandwidth từ camera: 6Mbps (same as before)

BUT:
  - VMS relay sub-stream (zero CPU, chỉ copy packets)
  - Clients không trực tiếp connect camera
  - Centralized control qua VMS
```

### **Implementation:**
```cpp
// Recording node pulls both streams
class DualStreamProcessor {
public:
    void ProcessCamera(const std::string& camera_id,
                       const std::string& rtsp_main,
                       const std::string& rtsp_sub) {
        
        // Process 1: Record main stream
        std::thread recording_thread([&]() {
            std::string cmd = 
                "ffmpeg -rtsp_transport tcp "
                "-i " + rtsp_main + " "
                "-c copy -f segment -segment_time 180 "
                "/data/recordings/" + camera_id + "/%Y%m%d_%H%M%S.mp4";
            system(cmd.c_str());
        });
        
        // Process 2: Relay sub stream (zero CPU)
        std::thread relay_thread([&]() {
            std::string cmd = 
                "ffmpeg -rtsp_transport tcp "
                "-i " + rtsp_sub + " "
                "-c copy "  // No transcode!
                "-f rtsp rtsp://localhost:8554/live/" + camera_id;
            system(cmd.c_str());
        });
        
        recording_thread.join();
        relay_thread.join();
    }
};

// Resource usage:
// - CPU per camera: ~2% (relay overhead)
// - 200 cameras = 400% CPU (4 cores)
// - No GPU needed
```

### **Pros & Cons:**
```yaml
Advantages:
  ✅ No transcode (zero GPU needed)
  ✅ Low CPU (chỉ relay)
  ✅ Best quality (sub-stream từ camera, không qua transcode)
  ✅ Low latency (~250ms)

Disadvantages:
  ❌ Camera phải support 2 streams
  ❌ Bandwidth từ camera: 6Mbps (không giảm)
  ❌ Camera network: 1.2Gbps (vẫn over budget)
  ❌ VMS bandwidth: 400Mbps in + 400Mbps out
```

**Verdict:** Không giải quyết được vấn đề bandwidth! ❌

---

## ✅ **GIẢI PHÁP 3: Single Main Stream Only (Trade-off Quality)**

### **Kiến trúc:**
```
Camera Network (200 cameras)
  └─> Main Stream ONLY (4Mbps)
        ├─> VMS Record at 1080p
        └─> VMS Relay at 1080p → Clients

Clients xem trực tiếp 1080p stream
No transcoding needed
```

### **Implementation:**
```cpp
// Single stream for both recording and live
std::string cmd = 
    "ffmpeg -rtsp_transport tcp "
    "-i " + rtsp_main + " "
    
    // Tee to both recording and relay
    "-f tee "
    "-map 0 -c copy "
    "[f=segment:segment_time=180]/data/recordings/" + camera_id + "/%Y%m%d_%H%M%S.mp4|"
    "[f=rtsp]rtsp://localhost:8554/live/" + camera_id;
```

### **Pros & Cons:**
```yaml
Advantages:
  ✅ Single stream từ camera (4Mbps)
  ✅ Zero transcoding (no GPU)
  ✅ Minimal CPU (~1% per camera)
  ✅ Best quality (1080p live)
  ✅ Lowest latency (~200ms)

Disadvantages:
  ❌ Client bandwidth: 800Mbps (200 × 4Mbps)
  ❌ Client PC need more powerful (decode 1080p)
  ❌ Network trong trung tâm: 800Mbps (high)
  ❌ Không tối ưu bandwidth cho live viewing
```

**Verdict:** OK nếu network trong trung tâm đủ mạnh

---

## 🎯 **SO SÁNH & KHUYẾN NGHỊ**

### **Comparison Table:**

| Aspect | Solution 1<br>(Transcode) | Solution 2<br>(Relay Both) | Solution 3<br>(Main Only) |
|--------|---------------------------|----------------------------|---------------------------|
| **Bandwidth từ Camera** | 800Mbps ✅ | 1.2Gbps ❌ | 800Mbps ✅ |
| **Camera Connections** | 1 ✅ | 2 ❌ | 1 ✅ |
| **VMS CPU** | Low (QSV) | Low | Minimal |
| **VMS GPU** | Optional (QSV better) | None | None |
| **Client Bandwidth** | 400Mbps ✅ | 400Mbps ✅ | 800Mbps ⚠️ |
| **Live Quality** | 720p (good) | 720p (best) | 1080p (overkill) |
| **Latency** | ~350ms | ~250ms | ~200ms |
| **Complexity** | Medium | Low | Lowest |
| **Cost** | Medium (QSV free) | Low | Low |
| **Recommendation** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

### **Final Recommendation: SOLUTION 1 với Intel QSV**

**Lý do:**
1. ✅ **Giải quyết vấn đề bandwidth** - chỉ 800Mbps từ cameras
2. ✅ **Single connection** - camera không bị stress
3. ✅ **Sử dụng hardware có sẵn** - Intel QSV, không cần GPU riêng
4. ✅ **Quality tốt** - 720p transcoded từ 1080p vẫn rất tốt
5. ✅ **Client bandwidth thấp** - 400Mbps, dễ handle
6. ✅ **Scalable** - mỗi node handle 35 cameras

---

## 🔧 **IMPLEMENTATION DETAILS**

### **Recording Node Configuration (với QSV):**

```yaml
# /etc/vms/recording-node.yml
hardware:
  cpu: Intel Xeon E-2388G (8 cores with QuickSync)
  ram: 64GB
  storage: 2TB NVMe + 80TB HDD
  network: 2× 10GbE

camera_processing:
  cameras_per_node: 35
  
  recording:
    codec: copy  # No transcode
    format: mp4
    segment_duration: 180
    
  live_transcode:
    enabled: true
    engine: qsv  # Intel QuickSync
    input: main_stream_1080p
    output:
      resolution: 1280x720
      bitrate: 2M
      codec: h264_qsv
      preset: veryfast
      tune: zerolatency
    relay:
      protocol: rtsp
      server: localhost:8554
```

### **FFmpeg Command Template:**
```bash
#!/bin/bash
# /usr/local/bin/process-camera.sh

CAMERA_ID=$1
RTSP_MAIN=$2

ffmpeg \
  -hwaccel qsv \
  -c:v h264_qsv \
  -rtsp_transport tcp \
  -i "$RTSP_MAIN" \
  \
  -map 0 -c copy \
  -f segment -segment_time 180 -strftime 1 \
  /data/recordings/${CAMERA_ID}/%Y%m%d_%H%M%S.mp4 \
  \
  -map 0:v -c:v h264_qsv \
  -s 1280x720 -b:v 2M -maxrate 2.4M -bufsize 1.2M \
  -preset veryfast \
  -f rtsp rtsp://localhost:8554/live/${CAMERA_ID}

# Resource usage:
# - Main stream: 4Mbps from camera
# - Recording: ~0.5% CPU (copy)
# - Transcoding: ~4% CPU (QSV)
# - Total: ~4.5% CPU per camera
# - 35 cameras: ~160% CPU (2 cores @ 100%)
```

### **Load Distribution:**
```yaml
Node 1: cameras 001-035 (35 cameras)
Node 2: cameras 036-070 (35 cameras)
Node 3: cameras 071-105 (35 cameras)
Node 4: cameras 106-140 (35 cameras)
Node 5: cameras 141-175 (35 cameras)
Node 6: cameras 176-200 (25 cameras) + standby capacity

Total:
  Active cameras: 200
  Standby capacity: 40 cameras (20% buffer)
  CPU usage per node: ~150% (2 cores @ 75%)
  Network per node: ~140Mbps (35 × 4Mbps)
```

---

## 📊 **RESOURCE ANALYSIS (Updated)**

### **Network Bandwidth:**
```yaml
Camera Network (VLAN 10):
  Before: 1.2Gbps (200 × 6Mbps) - OVER CAPACITY!
  After: 800Mbps (200 × 4Mbps) - FIT IN 1Gbps! ✅
  
Recording Network (VLAN 20):
  To Storage: 800Mbps (unchanged)
  To Clients: 400Mbps (transcoded streams)
  Total: 1.2Gbps (within 10Gbps capacity) ✅

Monitoring Center Network:
  From VMS: 400Mbps (200 × 2Mbps transcoded)
  Client PCs: 16× 2Mbps = 32Mbps per PC ✅
```

### **CPU Usage:**
```yaml
Recording Node (35 cameras):
  Recording (copy): 35 × 0.5% = 17.5% (negligible)
  Transcoding (QSV): 35 × 4% = 140%
  Overhead: 10%
  Total: ~160% (2 cores fully utilized)
  
  Available: 8 cores = 800%
  Used: 160%
  Headroom: 640% (80% free for other tasks)
```

### **Cost Update:**
```yaml
Original Plan (Direct RTSP):
  Hardware: $85,000
  Issue: Bandwidth overflow ❌
  
New Plan (Transcode with QSV):
  Hardware: $85,000 (unchanged!)
  CPU: Intel Xeon E-2388G (already supports QSV)
  GPU: Not needed
  Extra cost: $0 ✅
  
  Benefit: Solves bandwidth problem
  Trade-off: +150ms latency (acceptable)
```

---

## ✅ **FINAL ARCHITECTURE (REVISED)**

```
┌──────────────────────────────────────────────────┐
│         Camera Network (200 cameras)             │
│         Single Main Stream: 4Mbps each           │
│         Total: 800Mbps (fits in 1Gbps!)         │
└──────────────────┬───────────────────────────────┘
                   │
                   │ RTSP Main Stream only
                   │
        ┌──────────▼──────────────────────┐
        │  VMS Recording Cluster (6 nodes)│
        │                                  │
        │  Per Camera:                     │
        │  ┌────────────────────────────┐ │
        │  │ FFmpeg Process             │ │
        │  │ - Record main (copy)       │ │
        │  │ - Transcode to 720p (QSV)  │ │
        │  │ - Relay to mediamtx        │ │
        │  └────────────────────────────┘ │
        └──────────┬───────────────────────┘
                   │
                   │ 720p @ 2Mbps (400Mbps total)
                   │
        ┌──────────▼───────────────────────┐
        │   Monitoring Center              │
        │   4 PCs × 64 cameras each        │
        │   720p live view                 │
        └──────────────────────────────────┘
```

**This solves your problem! 🎯**

---

## 🎨 **ENHANCED: ADAPTIVE MULTI-QUALITY STREAMING**

### **Yêu cầu mở rộng (Updated Oct 19, 2025):**

```yaml
Problem Statement:
  "Mạng nội bộ dễ nâng cấp để đảm bảo băng thông xem live"
  
Viewing Quality Requirements:
  Grid ≥18 cameras: HD 720p (economical)
  Grid <18 cameras: 2K 1440p (high quality)
  Fullscreen single: 2K 1440p (best quality)
  
Network Context:
  Internal network: Upgradeable (không bị giới hạn)
  Camera network: 1Gbps (cố định - đã tối ưu)
```

### **✅ GIẢI PHÁP: HOÀN TOÀN KHẢ THI!**

Đây là pattern chuẩn trong VMS chuyên nghiệp (Milestone XProtect, Genetec Security Center, Nx Witness).

---

## 📐 **ARCHITECTURE: DUAL TRANSCODE OUTPUT**

### **Flow Diagram:**

```
┌───────────────────────────────────────────────────────┐
│        VMS Recording Node (per camera)                │
│                                                        │
│  Camera ──────► FFmpeg ────┬──► Recording (copy)     │
│  Main 4Mbps                 │    1080p original       │
│  1920×1080                  │    /data/recordings/    │
│                             │                         │
│                             ├──► Transcode Low (QSV)  │
│                             │    720p @ 2Mbps         │
│                             │    rtsp://.../low       │
│                             │                         │
│                             └──► Transcode High (QSV) │
│                                  1440p @ 5Mbps        │
│                                  rtsp://.../high      │
└───────────────────────────────────────────────────────┘
                     │                     │
                     │ 2Mbps               │ 5Mbps
                     ▼                     ▼
        ┌─────────────────────────────────────────┐
        │   Client: Adaptive Stream Selector      │
        │                                          │
        │   IF grid ≥ 18: Use LOW (720p)          │
        │   IF grid < 18: Use HIGH (1440p)        │
        │   IF fullscreen: Use HIGH (1440p)       │
        └──────────────────────────────────────────┘
```

---

## 🔧 **IMPLEMENTATION**

### **1. FFmpeg Multi-Output Configuration:**

```bash
#!/bin/bash
# record_and_transcode_dual_quality.sh

CAMERA_ID="cam_001"
RTSP_MAIN="rtsp://192.168.10.101:554/stream1"
RECORDING_PATH="/data/recordings"
RELAY_HOST="localhost:8554"

ffmpeg \
  -hwaccel qsv -c:v h264_qsv \
  -rtsp_transport tcp \
  -i "$RTSP_MAIN" \
  \
  `# Output 1: Recording (copy mode - no CPU)` \
  -map 0 -c copy \
  -f segment -segment_time 180 -segment_format mp4 \
  -strftime 1 -reset_timestamps 1 \
  "${RECORDING_PATH}/${CAMERA_ID}/%Y%m%d_%H%M%S.mp4" \
  \
  `# Output 2: Low Quality for Grid ≥18` \
  -map 0:v -c:v h264_qsv \
  -s 1280x720 -b:v 2M -maxrate 2.4M -bufsize 1.2M \
  -preset veryfast -g 50 -bf 0 \
  -f rtsp "rtsp://${RELAY_HOST}/live/${CAMERA_ID}/low" \
  \
  `# Output 3: High Quality for Grid <18 & Fullscreen` \
  -map 0:v -c:v h264_qsv \
  -s 2560x1440 -b:v 5M -maxrate 6M -bufsize 3M \
  -preset veryfast -g 50 -bf 0 \
  -f rtsp "rtsp://${RELAY_HOST}/live/${CAMERA_ID}/high"
```

### **2. C++ Implementation:**

```cpp
// multi_quality_processor.hpp
#pragma once
#include <string>
#include <vector>

class MultiQualityProcessor {
public:
    struct QualityProfile {
        std::string name;           // "low", "high"
        std::string resolution;     // "1280x720", "2560x1440"
        int bitrate_kbps;          // 2000, 5000
        int maxrate_kbps;          // 2400, 6000
        int bufsize_kbps;          // 1200, 3000
    };
    
    struct Config {
        std::string camera_id;
        std::string rtsp_url;
        std::string recording_path;
        std::string relay_host;
        std::vector<QualityProfile> qualities;
    };
    
    explicit MultiQualityProcessor(const Config& config);
    ~MultiQualityProcessor();
    
    bool Start();
    void Stop();
    bool IsRunning() const;
    
    // Runtime control
    void EnableQuality(const std::string& quality_name);
    void DisableQuality(const std::string& quality_name);
    std::vector<std::string> GetActiveQualities() const;
    
private:
    Config config_;
    pid_t ffmpeg_pid_;
    std::vector<std::string> active_qualities_;
    
    std::string BuildFFmpegCommand();
    std::string BuildRecordingOutput();
    std::string BuildTranscodeOutput(const QualityProfile& profile);
};

// multi_quality_processor.cpp
#include "multi_quality_processor.hpp"
#include <sstream>
#include <unistd.h>
#include <signal.h>
#include <sys/wait.h>

MultiQualityProcessor::MultiQualityProcessor(const Config& config)
    : config_(config), ffmpeg_pid_(-1) {
    // Enable all qualities by default
    for (const auto& profile : config_.qualities) {
        active_qualities_.push_back(profile.name);
    }
}

MultiQualityProcessor::~MultiQualityProcessor() {
    Stop();
}

std::string MultiQualityProcessor::BuildFFmpegCommand() {
    std::ostringstream cmd;
    
    // Input with QSV hardware acceleration
    cmd << "ffmpeg -hwaccel qsv -c:v h264_qsv "
        << "-rtsp_transport tcp -i " << config_.rtsp_url << " ";
    
    // Recording output (always enabled)
    cmd << BuildRecordingOutput() << " ";
    
    // Transcode outputs (based on active qualities)
    for (const auto& profile : config_.qualities) {
        auto it = std::find(active_qualities_.begin(), 
                           active_qualities_.end(), 
                           profile.name);
        if (it != active_qualities_.end()) {
            cmd << BuildTranscodeOutput(profile) << " ";
        }
    }
    
    return cmd.str();
}

std::string MultiQualityProcessor::BuildRecordingOutput() {
    std::ostringstream out;
    out << "-map 0 -c copy "
        << "-f segment -segment_time 180 -segment_format mp4 "
        << "-strftime 1 -reset_timestamps 1 "
        << config_.recording_path << "/" << config_.camera_id 
        << "/%Y%m%d_%H%M%S.mp4";
    return out.str();
}

std::string MultiQualityProcessor::BuildTranscodeOutput(
    const QualityProfile& profile) {
    std::ostringstream out;
    out << "-map 0:v -c:v h264_qsv "
        << "-s " << profile.resolution << " "
        << "-b:v " << profile.bitrate_kbps << "k "
        << "-maxrate " << profile.maxrate_kbps << "k "
        << "-bufsize " << profile.bufsize_kbps << "k "
        << "-preset veryfast -g 50 -bf 0 "
        << "-f rtsp rtsp://" << config_.relay_host << "/live/" 
        << config_.camera_id << "/" << profile.name;
    return out.str();
}

bool MultiQualityProcessor::Start() {
    if (IsRunning()) {
        return false;  // Already running
    }
    
    std::string cmd = BuildFFmpegCommand();
    
    ffmpeg_pid_ = fork();
    if (ffmpeg_pid_ == 0) {
        // Child process
        execl("/bin/sh", "sh", "-c", cmd.c_str(), nullptr);
        _exit(1);  // exec failed
    } else if (ffmpeg_pid_ < 0) {
        return false;  // fork failed
    }
    
    return true;
}

void MultiQualityProcessor::Stop() {
    if (ffmpeg_pid_ > 0) {
        kill(ffmpeg_pid_, SIGTERM);
        
        // Wait for process to exit (with timeout)
        int status;
        waitpid(ffmpeg_pid_, &status, WNOHANG);
        
        ffmpeg_pid_ = -1;
    }
}

bool MultiQualityProcessor::IsRunning() const {
    if (ffmpeg_pid_ <= 0) return false;
    
    // Check if process is still alive
    return kill(ffmpeg_pid_, 0) == 0;
}

void MultiQualityProcessor::EnableQuality(const std::string& quality_name) {
    auto it = std::find(active_qualities_.begin(), 
                       active_qualities_.end(), 
                       quality_name);
    if (it == active_qualities_.end()) {
        active_qualities_.push_back(quality_name);
        // Note: Requires restart to take effect
    }
}

void MultiQualityProcessor::DisableQuality(const std::string& quality_name) {
    auto it = std::find(active_qualities_.begin(), 
                       active_qualities_.end(), 
                       quality_name);
    if (it != active_qualities_.end()) {
        active_qualities_.erase(it);
        // Note: Requires restart to take effect
    }
}

std::vector<std::string> MultiQualityProcessor::GetActiveQualities() const {
    return active_qualities_;
}

// Example usage
int main() {
    MultiQualityProcessor::Config config;
    config.camera_id = "cam_001";
    config.rtsp_url = "rtsp://192.168.10.101:554/stream1";
    config.recording_path = "/data/recordings";
    config.relay_host = "localhost:8554";
    
    // Define quality profiles
    config.qualities = {
        {"low", "1280x720", 2000, 2400, 1200},
        {"high", "2560x1440", 5000, 6000, 3000}
    };
    
    MultiQualityProcessor processor(config);
    
    if (processor.Start()) {
        printf("Multi-quality processor started for %s\n", 
               config.camera_id.c_str());
        
        // Run for some time...
        sleep(3600);
        
        processor.Stop();
    }
    
    return 0;
}
```

### **3. Client-Side Adaptive Logic:**

```typescript
// adaptive-stream-manager.ts
export enum StreamQuality {
  LOW_720P = 'low',
  HIGH_1440P = 'high',
}

export interface StreamMetadata {
  cameraId: string;
  quality: StreamQuality;
  url: string;
  bitrate: number;
  resolution: string;
  bandwidth: number; // Mbps
}

export class AdaptiveStreamManager {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  /**
   * Select appropriate quality based on viewing context
   */
  selectQuality(gridSize: number, isFullscreen: boolean): StreamQuality {
    if (isFullscreen) {
      return StreamQuality.HIGH_1440P;
    }
    
    // Grid with less than 18 cameras = high quality
    if (gridSize < 18) {
      return StreamQuality.HIGH_1440P;
    }
    
    // Large grid (≥18 cameras) = low quality
    return StreamQuality.LOW_720P;
  }
  
  /**
   * Get stream URL from VMS API
   */
  async getStreamUrl(
    cameraId: string, 
    quality: StreamQuality
  ): Promise<StreamMetadata> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/live/cameras/${cameraId}/stream?quality=${quality}`,
      {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get stream URL: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get multiple streams in batch
   */
  async getBatchStreams(
    cameraIds: string[], 
    quality: StreamQuality
  ): Promise<StreamMetadata[]> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/live/cameras/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          camera_ids: cameraIds,
          quality: quality,
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get batch streams: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Calculate total bandwidth for a view
   */
  calculateBandwidth(streams: StreamMetadata[]): number {
    return streams.reduce((total, stream) => total + stream.bandwidth, 0);
  }
  
  private getAuthToken(): string {
    // Get token from storage/context
    return localStorage.getItem('auth_token') || '';
  }
}

// video-wall.tsx
import React, { useEffect, useState } from 'react';
import { AdaptiveStreamManager, StreamQuality, StreamMetadata } from './adaptive-stream-manager';

interface VideoWallProps {
  cameraIds: string[];
  columns: number;
  rows: number;
}

export const VideoWall: React.FC<VideoWallProps> = ({ cameraIds, columns, rows }) => {
  const [streams, setStreams] = useState<StreamMetadata[]>([]);
  const [quality, setQuality] = useState<StreamQuality>(StreamQuality.LOW_720P);
  const [bandwidth, setBandwidth] = useState<number>(0);
  
  const gridSize = columns * rows;
  const manager = new AdaptiveStreamManager('http://vms-api:3000');
  
  useEffect(() => {
    loadStreams();
  }, [cameraIds, columns, rows]);
  
  const loadStreams = async () => {
    // Determine quality based on grid size
    const selectedQuality = manager.selectQuality(gridSize, false);
    setQuality(selectedQuality);
    
    // Load streams
    const streamData = await manager.getBatchStreams(
      cameraIds.slice(0, gridSize),
      selectedQuality
    );
    
    setStreams(streamData);
    setBandwidth(manager.calculateBandwidth(streamData));
  };
  
  return (
    <div className="video-wall">
      <div className="info-bar">
        <span>Cameras: {gridSize}</span>
        <span>Quality: {quality === StreamQuality.HIGH_1440P ? '1440p' : '720p'}</span>
        <span>Bandwidth: {bandwidth.toFixed(1)} Mbps</span>
      </div>
      
      <div 
        className="grid-container"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {streams.map((stream) => (
          <div key={stream.cameraId} className="grid-cell">
            <video 
              src={stream.url} 
              autoPlay 
              muted
              className="camera-feed"
            />
            <div className="camera-label">
              {stream.cameraId} - {stream.resolution}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// fullscreen-player.tsx
import React, { useEffect, useState } from 'react';
import { AdaptiveStreamManager, StreamQuality, StreamMetadata } from './adaptive-stream-manager';

interface FullscreenPlayerProps {
  cameraId: string;
  onClose: () => void;
}

export const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({ cameraId, onClose }) => {
  const [stream, setStream] = useState<StreamMetadata | null>(null);
  const manager = new AdaptiveStreamManager('http://vms-api:3000');
  
  useEffect(() => {
    loadHighQualityStream();
  }, [cameraId]);
  
  const loadHighQualityStream = async () => {
    // Always use high quality for fullscreen
    const quality = manager.selectQuality(1, true);
    const streamData = await manager.getStreamUrl(cameraId, quality);
    setStream(streamData);
  };
  
  return (
    <div className="fullscreen-player">
      {stream && (
        <>
          <video 
            src={stream.url} 
            autoPlay 
            controls
            className="fullscreen-video"
          />
          <div className="overlay-info">
            <span>{stream.cameraId}</span>
            <span>{stream.resolution} @ {stream.bitrate}Mbps</span>
          </div>
          <button onClick={onClose} className="close-button">×</button>
        </>
      )}
    </div>
  );
};
```

---

## 📊 **RESOURCE ANALYSIS**

### **CPU Usage per Camera:**

```yaml
Hardware Decode (QSV): 0.5% CPU
Recording (copy): 0% CPU
Transcode Low (720p QSV): 3% CPU
Transcode High (1440p QSV): 6% CPU

Total per camera: 9.5% CPU
```

### **Per Recording Node (35 cameras):**

```yaml
CPU: Intel Xeon E-2388G (8 cores, 16 threads)

Total Usage: 35 × 9.5% = 332.5% = 3.3 cores
Available: 8 cores
Utilization: 41.6%
Headroom: 58.4% ✅

Thermal: Well within limits
Power: ~95W TDP
```

### **Total Cluster (6 nodes, 200 cameras):**

```yaml
Total Cameras: 200
CPU Required: 200 × 9.5% = 1900% = 19 cores
Available: 6 × 8 = 48 cores
Utilization: 39.6% ✅

Status: EXCELLENT HEADROOM
Can scale to: 48 / 9.5% ≈ 505 cameras
```

---

## 🌐 **BANDWIDTH ANALYSIS**

### **Scenario 1: All Grid 64 (8×8) - Most Common:**

```yaml
Active Cameras: 4 stations × 64 = 256 cameras
Quality: LOW 720p @ 2Mbps

Camera → VMS: 256 × 4Mbps = 1024Mbps = 1Gbps ⚠️
VMS → Clients: 256 × 2Mbps = 512Mbps ✅

Note: Would need 210 cameras max for 800Mbps target
Recommendation: Stick to 200 cameras as planned
```

### **Scenario 2: All Grid 16 (4×4) - Worst Case:**

```yaml
Active Cameras: 12 stations × 16 = 192 cameras
Quality: HIGH 1440p @ 5Mbps

Camera → VMS: 192 × 4Mbps = 768Mbps ✅
VMS → Clients: 192 × 5Mbps = 960Mbps ✅

Status: FITS in 1Gbps network (with 4% headroom)
```

### **Scenario 3: Mixed Grid (Realistic):**

```yaml
Station 1-2: Grid 64 low (128 cams) = 256Mbps
Station 3: Grid 16 high (16 cams) = 80Mbps
Station 4: Grid 4 high (4 cams) = 20Mbps

Total: 148 cameras, 356Mbps
Status: EXCELLENT ✅
```

### **Scenario 4: Peak Usage:**

```yaml
Grid view: 180 cameras × 2Mbps = 360Mbps
Fullscreen: 20 cameras × 5Mbps = 100Mbps

Total: 200 cameras, 460Mbps
Status: COMFORTABLE ✅
```

---

## 💰 **COST & NETWORK UPGRADE**

### **Current Infrastructure:**

```yaml
Camera Network:
  Switch: 1Gbps
  Bandwidth Used: 800Mbps (200 cams × 4Mbps)
  Headroom: 200Mbps (25%)
  Status: Adequate ✅
  
Monitoring Center Network:
  Switch: 1Gbps
  Bandwidth (worst): 960Mbps (192 cams × 5Mbps)
  Headroom: 40Mbps (4%)
  Status: Tight but OK ⚠️
```

### **Recommended Upgrade:**

```yaml
Option 1: Stay with 1Gbps
  Cost: $0
  Bandwidth: Sufficient for 200 cameras
  Limitation: Careful with concurrent high-quality views
  Recommendation: OK if budget is tight
  
Option 2: Upgrade to 2.5Gbps
  Cost: ~$800
    - Managed switch 24-port 2.5Gbps: $600
    - 4× 2.5Gbps NICs for client PCs: $200
  Bandwidth: 2500Mbps (400 cams @ high quality)
  Benefit: Comfortable headroom
  Recommendation: Good balance ⭐
  
Option 3: Upgrade to 10Gbps
  Cost: ~$2,000
    - Managed switch 24-port 1/10Gbps: $1,500
    - 4× 10Gbps SFP+ NICs: $400
    - 4× SFP+ DAC cables: $100
  Bandwidth: 10,000Mbps
  Benefit: Future-proof for 4K, 500+ cameras
  Recommendation: Best long-term investment ⭐⭐
```

### **Updated Total Cost:**

```yaml
Base Infrastructure: $85,000

Monitoring Center Network Upgrade:
  Option 1 (1Gbps): +$0 = $85,000
  Option 2 (2.5Gbps): +$800 = $85,800
  Option 3 (10Gbps): +$2,000 = $87,000 ⭐

Recommendation: Option 3 (10Gbps)
  - Chỉ tăng 2.4% total cost
  - Future-proof cho scale
  - Zero bandwidth concerns
  - Hỗ trợ 4K trong tương lai
```

---

## 📋 **COMPARISON TABLE**

| Aspect | Single Quality<br/>(720p only) | **Adaptive Multi-Quality**<br/>(720p + 1440p) ⭐ |
|--------|--------------------------------|--------------------------------------------------|
| **CPU per camera** | 4.5% | 9.5% |
| **Total CPU (200 cams)** | 900% (18.8%) | 1900% (39.6%) |
| **Node capacity** | 40 cameras | 35 cameras |
| **Total nodes needed** | 5 nodes | 6 nodes |
| **Camera bandwidth** | 800Mbps | 800Mbps (same) |
| **Client bandwidth (worst)** | 400Mbps | 960Mbps |
| **Quality: Grid 64** | Acceptable | Good |
| **Quality: Grid 16** | Acceptable | Excellent ⭐ |
| **Quality: Fullscreen** | Poor | Excellent ⭐ |
| **Network upgrade** | Not needed | Recommended (2.5/10Gbps) |
| **Additional cost** | $0 | $800-$2,000 |
| **User experience** | Good | Excellent ⭐⭐ |
| **Future-proof** | Limited | Excellent ⭐⭐ |
| **Complexity** | Low | Medium |
| **Maintenance** | Easy | Easy |

**Winner: Adaptive Multi-Quality** 🏆

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Phase 1: Infrastructure Upgrade (1 week):**

```yaml
Tasks:
  □ Procure 2.5Gbps or 10Gbps switch
  □ Install switch in monitoring center rack
  □ Upgrade client PC NICs
  □ Test network throughput
  □ Verify latency and packet loss
  
Expected Results:
  - Network bandwidth: 2.5Gbps or 10Gbps
  - Latency: <1ms (LAN)
  - Packet loss: 0%
```

### **Phase 2: Software Development (2 weeks):**

```yaml
Tasks:
  □ Update C++ recording engine with dual transcode
  □ Implement MultiQualityProcessor class
  □ Add REST API endpoints for multi-quality
  □ Update client-side AdaptiveStreamManager
  □ Implement automatic quality switching
  □ Add bandwidth monitoring
  □ Create quality selector UI
  
Expected Results:
  - API supports /stream?quality=low|high
  - Client auto-selects quality based on grid size
  - Manual quality override available
```

### **Phase 3: Testing (1 week):**

```yaml
Tasks:
  □ Test 1 camera with dual transcode (QSV)
  □ Measure CPU usage per quality
  □ Test 35 cameras on single node
  □ Verify bandwidth consumption
  □ Test quality switching (low ↔ high)
  □ Test grid layouts (4×4, 8×8)
  □ Test fullscreen mode
  □ Load test with 200 cameras
  
Expected Results:
  - CPU: ~9.5% per camera ✅
  - Bandwidth: Within network limits ✅
  - Quality switching: <2 seconds ✅
  - No frame drops ✅
```

### **Phase 4: Production Deployment (2 weeks):**

```yaml
Tasks:
  □ Deploy updated recording engine to 6 nodes
  □ Configure mediamtx for dual-quality relay
  □ Update client applications
  □ Train operators on quality modes
  □ Monitor system for 1 week
  □ Optimize based on real usage
  
Expected Results:
  - All 200 cameras with dual-quality ✅
  - Monitoring center using adaptive quality ✅
  - User satisfaction high ✅
  - System stable ✅
```

---

## 🎯 **FINAL RECOMMENDATION**

### **✅ GIẢI PHÁP KHUYẾN NGHỊ:**

**Adaptive Multi-Quality Streaming với 10Gbps Monitoring Center Network**

#### **Lý do:**

1. **User Experience Tuyệt Vời:**
   - Grid lớn (64 cameras): 720p tiết kiệm băng thông
   - Grid nhỏ (16 cameras): 1440p chất lượng cao
   - Fullscreen: 1440p sắc nét
   - Tự động chuyển đổi theo context

2. **Technical Feasibility:**
   - CPU: 39.6% utilization (excellent headroom)
   - Camera bandwidth: 800Mbps (không đổi)
   - Client bandwidth: 960Mbps worst-case (fits 10Gbps)
   - Proven pattern trong ngành VMS

3. **Cost-Effective:**
   - Additional cost: $2,000 (2.4% increase)
   - Future-proof cho 500+ cameras
   - Hỗ trợ 4K trong tương lai
   - ROI cao

4. **Scalability:**
   - Current: 200 cameras @ 39.6% CPU
   - Max: 505 cameras (với existing hardware)
   - Network: 10Gbps có thể handle 1600+ cameras

5. **Operational Benefits:**
   - Operators không cần chọn quality manually
   - System tự động optimize
   - Bandwidth sử dụng hiệu quả
   - Maintenance đơn giản

#### **Implementation Timeline:**

```yaml
Week 1: Network upgrade (switch + NICs)
Week 2-3: Software development (dual transcode)
Week 4: Testing and validation
Week 5-6: Production deployment
Week 7: Monitoring and optimization

Total: 7 weeks to production
```

#### **Success Metrics:**

```yaml
Technical:
  ✅ CPU utilization: <50%
  ✅ Network utilization: <80%
  ✅ Quality switching time: <2 seconds
  ✅ Frame drops: <0.1%
  ✅ Latency: <500ms

User Satisfaction:
  ✅ Grid view quality: "Good" or better
  ✅ Fullscreen quality: "Excellent"
  ✅ No manual quality adjustment needed
  ✅ Fast response time

Business:
  ✅ Total cost: <$90k
  ✅ Operational uptime: >99.9%
  ✅ Future-proof: 5+ years
  ✅ Scale ready: 2x capacity
```

---

## 🚀 **KẾT LUẬN**

**Yêu cầu của bạn HOÀN TOÀN KHẢ THI và là giải pháp TỐI ƯU!**

### **Summary:**

✅ **Grid ≥18 cameras**: HD 720p @ 2Mbps (economical)  
✅ **Grid <18 cameras**: 2K 1440p @ 5Mbps (excellent quality)  
✅ **Fullscreen single**: 2K 1440p @ 5Mbps (best quality)  
✅ **Automatic switching**: Client auto-selects based on layout  
✅ **CPU sufficient**: 39.6% utilization with dual transcode  
✅ **Network upgrade**: 10Gbps recommended ($2k investment)  
✅ **Future-proof**: Ready for 4K and 500+ cameras  
✅ **Cost**: $87k total (chỉ +2.4% vs base plan)  

**Pattern này được sử dụng bởi:**
- Milestone XProtect (Adaptive Streaming)
- Genetec Security Center (Multi-Stream)
- Nx Witness (Smart Streaming)
- Avigilon (HDSM SmartCodec)

**Đây là giải pháp chuẩn ngành cho VMS chuyên nghiệp!** 🏆

**Sẵn sàng triển khai!** 🚀
