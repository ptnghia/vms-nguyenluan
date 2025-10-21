# 02_Recording_Engine_Cpp.md

## 🎯 Mục tiêu
- Ghi trực tiếp luồng RTSP với chất lượng cao.
- **Live streaming relay** với độ trễ cực thấp.
- Lưu theo segment (3–5 phút) để tối ưu playback.
- **Dual-stream support**: Main stream ghi + Sub stream cho live view.
- Tối ưu IO, không drop frame, failover tự động.

## 🧰 Công nghệ
- **FFmpeg (libav)** hoặc GStreamer.
- C++ cho hiệu suất cao.

## 📦 Cấu trúc xử lý
### 🎬 Recording Pipeline
1. Kết nối camera (TCP RTSP với retry logic).
2. **Dual stream processing**:
   - Main stream (1080p) → Segment recording
   - Sub stream (720p/480p) → Live relay
3. Ghi segment .mp4 với metadata embedding.
4. Cập nhật segment info vào PostgreSQL.
5. Health monitoring và auto-restart.

### 📡 Live Streaming Pipeline
1. Sub-stream relay qua rtsp-simple-server.
2. **Multi-format output**:
   - WebRTC cho web (< 500ms latency)
   - HLS cho mobile apps
   - RTMP cho emergency broadcasting
3. **Adaptive bitrate** dựa trên network conditions.
4. **Stream authentication** với JWT tokens.

## ⚡ Tối ưu hiệu năng
- Pre-allocate file.
- SSD làm cache, HDD lưu dài hạn.
- Ghi song song, mỗi camera 1 tiến trình.

## 🛡️ Error Handling & Recovery

### **Connection Retry Strategy**
```cpp
class RTSPConnectionManager {
public:
    struct RetryPolicy {
        int max_retries = 5;
        int initial_delay_ms = 1000;
        int max_delay_ms = 30000;
        float backoff_multiplier = 2.0;
    };
    
    bool ConnectWithRetry(const std::string& rtsp_url) {
        int retry_count = 0;
        int delay_ms = policy_.initial_delay_ms;
        
        while (retry_count < policy_.max_retries) {
            try {
                if (AttemptConnection(rtsp_url)) {
                    LogInfo("Connected to camera: " + rtsp_url);
                    return true;
                }
            } catch (const ConnectionException& e) {
                LogError("Connection attempt " + std::to_string(retry_count + 1) + 
                        " failed: " + e.what());
                
                // Check if camera is reachable
                if (!PingCamera(rtsp_url)) {
                    LogError("Camera unreachable, marking as offline");
                    UpdateCameraStatus(camera_id_, CameraStatus::OFFLINE);
                    return false;
                }
                
                // Exponential backoff
                std::this_thread::sleep_for(std::chrono::milliseconds(delay_ms));
                delay_ms = std::min(
                    static_cast<int>(delay_ms * policy_.backoff_multiplier),
                    policy_.max_delay_ms
                );
                retry_count++;
            }
        }
        
        LogError("Failed to connect after " + std::to_string(policy_.max_retries) + 
                " attempts");
        SendAlert("camera_connection_failed", camera_id_);
        return false;
    }
    
private:
    RetryPolicy policy_;
    std::string camera_id_;
};
```

### **Frame Drop Detection & Recovery**
```cpp
class FrameDropMonitor {
public:
    void CheckFrameHealth() {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
            now - last_frame_time_
        ).count();
        
        // Expected frame interval at 30fps = 33ms
        if (elapsed > 500) {  // No frame for 500ms
            dropped_frames_++;
            
            if (dropped_frames_ > 10) {
                LogWarning("Excessive frame drops detected: " + 
                          std::to_string(dropped_frames_));
                
                // Attempt reconnection
                RestartStream();
            }
        } else {
            // Reset counter on successful frame
            dropped_frames_ = 0;
        }
        
        last_frame_time_ = now;
    }
    
    void RestartStream() {
        LogInfo("Restarting stream due to frame drops");
        
        // Gracefully stop current stream
        StopCurrentStream();
        
        // Wait briefly
        std::this_thread::sleep_for(std::chrono::seconds(2));
        
        // Restart with retry logic
        if (!connection_manager_.ConnectWithRetry(rtsp_url_)) {
            SendCriticalAlert("stream_restart_failed", camera_id_);
        }
    }
    
private:
    std::chrono::steady_clock::time_point last_frame_time_;
    int dropped_frames_ = 0;
    std::string camera_id_;
    std::string rtsp_url_;
};
```

### **Disk Space Management**
```cpp
class DiskSpaceManager {
public:
    DiskSpaceManager(const std::string& storage_path, 
                     uint64_t min_free_gb = 100) 
        : storage_path_(storage_path), 
          min_free_bytes_(min_free_gb * 1024ULL * 1024ULL * 1024ULL) {}
    
    bool CheckSpaceBeforeWrite(size_t segment_size_bytes) {
        auto free_space = GetFreeSpace(storage_path_);
        
        if (free_space < min_free_bytes_) {
            LogCritical("Disk space critically low: " + 
                       std::to_string(free_space / (1024*1024*1024)) + " GB");
            
            // Emergency cleanup
            PerformEmergencyCleanup();
            
            // Re-check
            free_space = GetFreeSpace(storage_path_);
            
            if (free_space < min_free_bytes_) {
                SendCriticalAlert("disk_space_critical", storage_path_);
                return false;
            }
        }
        
        return true;
    }
    
    void PerformEmergencyCleanup() {
        // Delete oldest segments until we have enough space
        auto segments = GetSegmentsSortedByAge(storage_path_);
        uint64_t freed_bytes = 0;
        uint64_t target_free_bytes = min_free_bytes_ * 2;  // 2x minimum
        
        for (const auto& segment : segments) {
            if (freed_bytes >= target_free_bytes) break;
            
            // Check if segment is archived
            if (IsArchivedToObjectStorage(segment.id)) {
                DeleteSegment(segment.path);
                freed_bytes += segment.size_bytes;
                LogInfo("Deleted archived segment: " + segment.path);
            }
        }
        
        LogInfo("Emergency cleanup freed: " + 
               std::to_string(freed_bytes / (1024*1024*1024)) + " GB");
    }
    
    uint64_t GetFreeSpace(const std::string& path) {
        struct statvfs stat;
        if (statvfs(path.c_str(), &stat) != 0) {
            throw std::runtime_error("Failed to get disk stats");
        }
        return stat.f_bavail * stat.f_frsize;
    }
    
private:
    std::string storage_path_;
    uint64_t min_free_bytes_;
};
```

### **Health Monitoring & Auto-Restart**
```cpp
class RecordingProcessMonitor {
public:
    void MonitorProcess() {
        while (running_) {
            for (auto& [camera_id, process_info] : active_processes_) {
                // Check if process is alive
                if (!IsProcessAlive(process_info.pid)) {
                    LogError("Recording process died for camera: " + camera_id);
                    
                    // Check exit code
                    int exit_code = GetProcessExitCode(process_info.pid);
                    LogError("Exit code: " + std::to_string(exit_code));
                    
                    // Restart based on exit code
                    if (ShouldRestart(exit_code)) {
                        RestartRecording(camera_id);
                    } else {
                        // Fatal error, needs manual intervention
                        SendCriticalAlert("recording_fatal_error", camera_id);
                        DisableCamera(camera_id);
                    }
                }
                
                // Check process health metrics
                auto metrics = GetProcessMetrics(process_info.pid);
                
                // CPU usage too high?
                if (metrics.cpu_percent > 80) {
                    LogWarning("High CPU usage for camera " + camera_id + 
                              ": " + std::to_string(metrics.cpu_percent) + "%");
                }
                
                // Memory leak detection
                if (metrics.memory_mb > 1000) {  // > 1GB is suspicious
                    LogWarning("High memory usage for camera " + camera_id + 
                              ": " + std::to_string(metrics.memory_mb) + "MB");
                    // Consider restarting to prevent OOM
                    RestartRecording(camera_id);
                }
                
                // Check recording rate
                auto segment_count = GetSegmentCount(camera_id, 
                    std::chrono::minutes(10));
                if (segment_count < 2) {  // Should have ~3 segments in 10min
                    LogWarning("Low recording rate for camera: " + camera_id);
                    RestartRecording(camera_id);
                }
            }
            
            std::this_thread::sleep_for(std::chrono::seconds(30));
        }
    }
    
    void RestartRecording(const std::string& camera_id) {
        restart_count_[camera_id]++;
        
        if (restart_count_[camera_id] > 5) {
            // Too many restarts in short time
            LogError("Camera " + camera_id + " restarting too frequently");
            SendCriticalAlert("camera_unstable", camera_id);
            
            // Disable temporarily
            DisableCamera(camera_id, std::chrono::minutes(30));
            return;
        }
        
        // Stop current recording
        StopRecording(camera_id);
        
        // Wait briefly
        std::this_thread::sleep_for(std::chrono::seconds(5));
        
        // Start new recording
        StartRecording(camera_id);
        
        LogInfo("Restarted recording for camera: " + camera_id);
    }
    
private:
    bool running_ = true;
    std::map<std::string, ProcessInfo> active_processes_;
    std::map<std::string, int> restart_count_;
};
```

## 🧪 Ví dụ FFmpeg commands
### Recording Main Stream
```bash
ffmpeg -rtsp_transport tcp -i "rtsp://user:pass@ip/main" \
  -c copy -f segment -segment_time 180 -strftime 1 \
  -metadata camera_id="cam_001" \
  /data/cam1/%Y%m%d_%H%M%S.mp4
```

### Live Stream Relay (Sub Stream)
```bash
# Sub stream cho live viewing
ffmpeg -rtsp_transport tcp -i "rtsp://user:pass@ip/sub" \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -c:a aac -f rtsp rtsp://localhost:8554/live/cam1

# Multi-bitrate cho adaptive streaming
ffmpeg -rtsp_transport tcp -i "rtsp://user:pass@ip/sub" \
  -filter_complex "[0:v]split=3[v1][v2][v3]; \
   [v1]scale=1280:720[720p]; \
   [v2]scale=854:480[480p]; \
   [v3]scale=640:360[360p]" \
  -map "[720p]" -c:v libx264 -b:v 2M -f rtsp rtsp://localhost:8554/live/cam1_720p \
  -map "[480p]" -c:v libx264 -b:v 1M -f rtsp rtsp://localhost:8554/live/cam1_480p \
  -map "[360p]" -c:v libx264 -b:v 500k -f rtsp rtsp://localhost:8554/live/cam1_360p
```
