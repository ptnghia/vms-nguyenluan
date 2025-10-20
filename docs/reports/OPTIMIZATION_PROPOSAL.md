# 🚀 Đề Xuất Tối Ưu Dual-Quality Recording

**Ngày:** 20 Tháng 10, 2025  
**Vấn đề:** CPU usage cao (126% per camera) do dual-quality transcoding  
**Mục tiêu:** Giảm xuống <50% CPU per camera

---

## 📊 PHÂN TÍCH VẤN ĐỀ HIỆN TẠI

### **Kiến trúc hiện tại:**

```
Camera RTSP Stream (1080p @ 4Mbps)
    │
    ├─> FFmpeg Process 1: Recording (copy mode)
    │   └─> Output: 1440p @ 5Mbps (0% CPU - copy codec)
    │
    ├─> FFmpeg Process 2: Live Transcode LOW
    │   └─> NVENC: 1080p → 720p @ 2Mbps (~63% CPU)
    │
    └─> FFmpeg Process 3: Live Transcode HIGH
        └─> NVENC: 1080p → 1440p @ 5Mbps (~63% CPU)

Total CPU per camera: 0% + 63% + 63% = 126% CPU
```

### **Vấn đề:**

1. **3 FFmpeg processes** cho mỗi camera (1 recording + 2 transcoding)
2. **2 RTSP connections** tới camera (recording + transcoding đọc riêng)
3. **NVENC overhead:** Mỗi transcode process = ~63% CPU
4. **Không tận dụng Intel QuickSync** (QSV) - hiệu quả hơn NVENC cho nhiều streams

### **Tài nguyên hiện tại (2 cameras):**

```yaml
CPU: 252% (2.5 cores) cho 2 cameras
  → 126% per camera
  → Với 5 cameras: 630% (6.3 cores) ❌ KHÔNG BỀN VỮNG

GPU: 5% NVENC (hiệu quả nhưng không cần thiết)
RAM: 4.5GB (2.25GB per camera)
```

---

## 💡 GIẢI PHÁP ĐỀ XUẤT

### **🎯 Giải pháp 1: SINGLE FFMPEG PROCESS với Multi-Output (KHUYẾN NGHỊ)**

#### **Kiến trúc mới:**

```
Camera RTSP Stream (1080p @ 4Mbps)
    │
    └─> Single FFmpeg Process với 3 outputs:
        │
        ├─> Output 1: Recording (copy mode, 0% CPU)
        │   └─> 1440p @ 5Mbps MP4 segments
        │
        ├─> Output 2: Live LOW (NVENC/QSV, ~30% CPU)
        │   └─> 720p @ 2Mbps → MediaMTX
        │
        └─> Output 3: Live HIGH (NVENC/QSV, ~30% CPU)
            └─> 1440p @ 5Mbps → MediaMTX

Total CPU per camera: 0% + 30% + 30% = 60% CPU
Giảm: 126% → 60% = 52% reduction ✅
```

#### **Lợi ích:**

1. ✅ **Single RTSP connection** - Giảm load trên camera
2. ✅ **Shared input decode** - Decode 1 lần, dùng cho 3 outputs
3. ✅ **Giảm 50% CPU** - 126% → 60% per camera
4. ✅ **Đơn giản hơn** - 1 process thay vì 3
5. ✅ **Ít memory** - Shared buffers

#### **FFmpeg Command:**

```bash
ffmpeg \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  \
  # Output 1: Recording (copy mode - 0% CPU)
  -map 0 -c copy \
  -f segment -segment_time 180 -segment_format mp4 \
  -strftime 1 -reset_timestamps 1 \
  "/data/recordings/${CAMERA_NAME}/%Y%m%d_%H%M%S.mp4" \
  \
  # Output 2: Live LOW 720p (NVENC - ~30% CPU)
  -map 0:v -c:v h264_nvenc \
  -s 1280x720 -b:v 2M -maxrate 2M -bufsize 4M \
  -preset p4 -tune ll -r 25 -g 50 \
  -f rtsp "rtsp://localhost:8554/live/${CAMERA_ID}/low" \
  \
  # Output 3: Live HIGH 1440p (NVENC - ~30% CPU)
  -map 0:v -c:v h264_nvenc \
  -s 2560x1440 -b:v 5M -maxrate 5M -bufsize 10M \
  -preset p4 -tune ll -r 25 -g 50 \
  -f rtsp "rtsp://localhost:8554/live/${CAMERA_ID}/high"
```

#### **Ước tính performance:**

```yaml
Per Camera:
  CPU: 60% (0.6 cores)
  RAM: 1.5GB (giảm 33%)
  GPU: 3% NVENC
  
5 Cameras:
  CPU: 300% (3 cores) vs 630% hiện tại
  RAM: 7.5GB vs 11.25GB hiện tại
  GPU: 15% vs 25% hiện tại
  
Headroom:
  CPU: 11 cores free (78% free) ✅
  RAM: 8.5GB free ✅
  GPU: 85% free ✅
```

---

### **🎯 Giải pháp 2: INTEL QUICKSYNC (QSV) thay vì NVENC (TỐI ƯU NHẤT)**

#### **Tại sao QSV tốt hơn NVENC cho use case này:**

```yaml
NVENC (NVIDIA GPU):
  Pros:
    - Chất lượng tốt
    - Latency thấp
  Cons:
    - Giới hạn concurrent encodes (~3-5 streams)
    - Cần GPU riêng
    - Power consumption cao
    
Intel QuickSync (QSV):
  Pros:
    - Integrated trong CPU (i5-14500 có QSV Gen 12.5)
    - Support 30-40 concurrent encodes
    - Power efficient
    - Không cần GPU riêng
    - Chất lượng tốt (H.264/H.265)
  Cons:
    - Chất lượng hơi kém NVENC (~5%)
    - Cần driver đúng
```

#### **FFmpeg Command với QSV:**

```bash
ffmpeg \
  -hwaccel qsv -c:v h264_qsv \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  \
  # Output 1: Recording (copy mode)
  -map 0 -c copy \
  -f segment -segment_time 180 -segment_format mp4 \
  -strftime 1 -reset_timestamps 1 \
  "/data/recordings/${CAMERA_NAME}/%Y%m%d_%H%M%S.mp4" \
  \
  # Output 2: Live LOW 720p (QSV - ~15% CPU)
  -map 0:v -c:v h264_qsv \
  -s 1280x720 -b:v 2M -maxrate 2M -bufsize 4M \
  -preset veryfast -g 50 -r 25 \
  -f rtsp "rtsp://localhost:8554/live/${CAMERA_ID}/low" \
  \
  # Output 3: Live HIGH 1440p (QSV - ~15% CPU)
  -map 0:v -c:v h264_qsv \
  -s 2560x1440 -b:v 5M -maxrate 5M -bufsize 10M \
  -preset veryfast -g 50 -r 25 \
  -f rtsp "rtsp://localhost:8554/live/${CAMERA_ID}/high"
```

#### **Ước tính performance với QSV:**

```yaml
Per Camera:
  CPU: 30% (0.3 cores) - Giảm 76%!
  RAM: 1.2GB
  GPU: 0% (không dùng NVENC)
  
5 Cameras:
  CPU: 150% (1.5 cores) ✅ EXCELLENT!
  RAM: 6GB
  GPU: 0%
  
Headroom:
  CPU: 12.5 cores free (89% free) ✅✅
  RAM: 10GB free ✅
  GPU: 100% free (dành cho AI Phase 3) ✅
```

---

### **🎯 Giải pháp 3: ON-DEMAND TRANSCODING (Tối ưu nhất cho production)**

#### **Concept:**

```
Recording: Luôn chạy (copy mode, 0% CPU)
Live Transcoding: Chỉ chạy khi có viewer

Flow:
1. Client request live stream → API check viewers
2. Nếu viewers = 0 → Start transcoding process
3. Nếu viewers > 0 → Reuse existing stream
4. Khi viewers = 0 (timeout 30s) → Stop transcoding

Benefits:
- Không transcode khi không cần
- Tiết kiệm 100% CPU khi không có viewer
- Scale tốt với nhiều cameras
```

#### **Kiến trúc:**

```
┌─────────────────────────────────────────────────┐
│ Camera 1-5: Recording ONLY (copy mode)          │
│ CPU: 0% × 5 = 0%                                │
└─────────────────────────────────────────────────┘
                    │
                    │ Khi có viewer request
                    ▼
┌─────────────────────────────────────────────────┐
│ On-Demand Transcoder (QSV)                      │
│ - Start khi viewer connect                      │
│ - Stop sau 30s không có viewer                  │
│ - CPU: 30% per active camera                    │
└─────────────────────────────────────────────────┘

Ví dụ:
- 5 cameras recording: 0% CPU
- 2 cameras có viewers: 60% CPU
- Total: 60% CPU (thay vì 630%)
```

#### **Implementation:**

```typescript
// API endpoint: GET /api/streams/camera/:id
async function getStreamUrl(cameraId: string, quality: string) {
  // Check if transcoding process exists
  const transcoder = transcoderManager.get(cameraId, quality);
  
  if (!transcoder || !transcoder.isRunning()) {
    // Start on-demand transcoding
    await transcoderManager.start(cameraId, quality);
  }
  
  // Update viewer count
  transcoderManager.addViewer(cameraId, quality);
  
  // Return stream URL
  return {
    url: `rtsp://localhost:8554/live/${cameraId}/${quality}`,
    viewers: transcoderManager.getViewerCount(cameraId, quality)
  };
}

// Cleanup idle transcoders (run every 30s)
setInterval(() => {
  transcoderManager.cleanupIdle(30); // Stop if no viewers for 30s
}, 30000);
```

---

## 📊 SO SÁNH CÁC GIẢI PHÁP

| Giải pháp | CPU/cam | RAM/cam | GPU | Complexity | Khuyến nghị |
|-----------|---------|---------|-----|------------|-------------|
| **Hiện tại** | 126% | 2.25GB | 5% | Medium | ❌ Không bền vững |
| **1. Single FFmpeg + NVENC** | 60% | 1.5GB | 3% | Low | ✅ Tốt |
| **2. Single FFmpeg + QSV** | 30% | 1.2GB | 0% | Low | ✅✅ Rất tốt |
| **3. On-Demand + QSV** | 0-30% | 1.2GB | 0% | High | ✅✅✅ Tối ưu nhất |

### **Khuyến nghị theo phase:**

```yaml
Phase 1 MVP (Hiện tại):
  → Giải pháp 2: Single FFmpeg + QSV
  Lý do: Đơn giản, hiệu quả, đủ cho demo
  Timeline: 1 ngày implement
  
Phase 2 Production (50 cameras):
  → Giải pháp 3: On-Demand + QSV
  Lý do: Scale tốt, tiết kiệm tài nguyên
  Timeline: 1 tuần implement
  
Phase 4 Enterprise (200 cameras):
  → Giải pháp 3 + Load Balancing
  Lý do: Distribute load across nodes
  Timeline: Đã có trong kế hoạch
```

---

## 🔧 IMPLEMENTATION PLAN

### **Phase 1: Quick Fix (1 ngày) - KHUYẾN NGHỊ NGAY**

#### **Bước 1: Verify Intel QSV support**

```bash
# Check QSV availability
ffmpeg -hwaccels | grep qsv

# Test QSV encoding
ffmpeg -hwaccel qsv -c:v h264_qsv \
  -i test.mp4 \
  -c:v h264_qsv -preset veryfast \
  -f null -

# Expected: Should work without errors
```

#### **Bước 2: Update camera_recorder.hpp**

Thay đổi từ:
```cpp
// OLD: 3 separate processes
ffmpegProcess = new FFmpegProcess(...);
liveTranscoderLow = new LiveTranscoder(...);
liveTranscoderHigh = new LiveTranscoder(...);
```

Sang:
```cpp
// NEW: Single process with multi-output
ffmpegProcess = new FFmpegMultiOutput(...);
// Handles recording + 2 live streams in one process
```

#### **Bước 3: Create new FFmpegMultiOutput class**

```cpp
// services/recorder/src/ffmpeg_multi_output.hpp
class FFmpegMultiOutput {
private:
    std::string buildCommand() {
        return "ffmpeg "
               "-hwaccel qsv -c:v h264_qsv "
               "-rtsp_transport tcp -i " + rtspUrl + " "
               
               // Recording output (copy)
               "-map 0 -c copy "
               "-f segment -segment_time 180 "
               + recordingPath + " "
               
               // Live LOW (QSV)
               "-map 0:v -c:v h264_qsv "
               "-s 1280x720 -b:v 2M "
               "-f rtsp " + mediamtxUrlLow + " "
               
               // Live HIGH (QSV)
               "-map 0:v -c:v h264_qsv "
               "-s 2560x1440 -b:v 5M "
               "-f rtsp " + mediamtxUrlHigh;
    }
};
```

#### **Bước 4: Test với 1 camera**

```bash
# Stop current recorder
pm2 stop vms-recorder

# Rebuild with new code
cd services/recorder/build
cmake .. && make

# Start and test
pm2 start vms-recorder

# Monitor CPU
htop
# Expected: ~30% CPU per camera (vs 126% hiện tại)
```

#### **Bước 5: Rollout to all cameras**

```bash
# If test successful, deploy to all cameras
pm2 restart vms-recorder

# Monitor for 1 hour
pm2 logs vms-recorder --lines 100
```

**Timeline:** 4-6 hours  
**Risk:** Low (có thể rollback nếu có vấn đề)  
**Expected result:** CPU giảm từ 126% → 30% per camera

---

### **Phase 2: On-Demand Transcoding (1 tuần)**

#### **Architecture:**

```
┌──────────────────────────────────────────┐
│ TranscoderManager (Node.js)              │
│ - Track active transcoders               │
│ - Start/stop on demand                   │
│ - Monitor viewer count                   │
│ - Cleanup idle transcoders               │
└──────────────────────────────────────────┘
         │
         ├─> Spawn FFmpeg process khi cần
         └─> Kill FFmpeg process khi idle
```

#### **Implementation files:**

```typescript
// services/api/src/services/transcoder-manager.ts
class TranscoderManager {
  private transcoders: Map<string, Transcoder>;
  
  async start(cameraId: string, quality: string): Promise<void> {
    // Spawn FFmpeg process
  }
  
  async stop(cameraId: string, quality: string): Promise<void> {
    // Kill FFmpeg process
  }
  
  addViewer(cameraId: string, quality: string): void {
    // Increment viewer count
  }
  
  removeViewer(cameraId: string, quality: string): void {
    // Decrement viewer count
    // Schedule cleanup if viewers = 0
  }
  
  cleanupIdle(timeoutSeconds: number): void {
    // Stop transcoders with 0 viewers for > timeout
  }
}
```

**Timeline:** 5-7 days  
**Risk:** Medium (cần testing kỹ)  
**Expected result:** CPU = 0% khi không có viewers

---

## 📈 EXPECTED RESULTS

### **Sau khi implement Giải pháp 2 (Single FFmpeg + QSV):**

```yaml
Current (2 cameras):
  CPU: 252% (2.5 cores)
  RAM: 4.5GB
  GPU: 5%

After Optimization (2 cameras):
  CPU: 60% (0.6 cores) ✅ 76% reduction
  RAM: 2.4GB ✅ 47% reduction
  GPU: 0% ✅ Free for AI

Scaling to 5 cameras:
  Current: 630% (6.3 cores) ❌ Not sustainable
  After: 150% (1.5 cores) ✅ Sustainable!
  
Headroom:
  CPU: 12.5 cores free (89%)
  RAM: 13.6GB free (85%)
  GPU: 100% free for Phase 3 AI
```

### **Sau khi implement Giải pháp 3 (On-Demand):**

```yaml
5 cameras, 2 có viewers:
  Recording: 0% CPU (5 cameras)
  Transcoding: 60% CPU (2 cameras)
  Total: 60% CPU ✅
  
5 cameras, 0 viewers (night time):
  Recording: 0% CPU
  Transcoding: 0% CPU
  Total: 0% CPU ✅✅
  
Average (assume 40% viewing time):
  CPU: 60% × 0.4 = 24% average ✅✅✅
```

---

## ✅ KHUYẾN NGHỊ HÀNH ĐỘNG

### **Ngay lập tức (Hôm nay):**

1. ✅ **Verify Intel QSV support** (30 phút)
2. ✅ **Implement Single FFmpeg + QSV** (4 hours)
3. ✅ **Test với 1 camera** (1 hour)
4. ✅ **Deploy to all cameras** (1 hour)

**Total:** 6-7 hours  
**Expected:** CPU giảm 76% (126% → 30% per camera)

### **Tuần tới (Phase 2 prep):**

1. 🔄 **Design On-Demand architecture** (1 day)
2. 🔄 **Implement TranscoderManager** (2 days)
3. 🔄 **Testing & validation** (2 days)

**Total:** 5 days  
**Expected:** CPU = 0% khi không có viewers

---

## 🎯 KẾT LUẬN

**Vấn đề:** CPU usage 126% per camera không bền vững cho 5+ cameras

**Giải pháp ngắn hạn:** Single FFmpeg + Intel QSV
- ✅ Giảm 76% CPU (126% → 30%)
- ✅ Implement trong 1 ngày
- ✅ Low risk, có thể rollback

**Giải pháp dài hạn:** On-Demand Transcoding
- ✅ Giảm 100% CPU khi không có viewers
- ✅ Scale tốt cho 200 cameras
- ✅ Production-ready

**Timeline:**
- Hôm nay: Implement Giải pháp 2 (6 hours)
- Tuần tới: Implement Giải pháp 3 (5 days)

**Ưu tiên:** 🔴 **CAO** - Cần làm trước khi scale lên 5 cameras

---

**Người đề xuất:** AI Assistant  
**Ngày:** 20 Tháng 10, 2025  
**Status:** Chờ phê duyệt & implement

