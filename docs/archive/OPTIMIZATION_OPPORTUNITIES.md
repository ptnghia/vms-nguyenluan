# 🔍 Phân Tích Các Điểm Có Thể Tối Ưu Thêm

**Date:** October 20, 2025  
**Current System:** 2 cameras, H.265 NVENC recording + H.264 NVENC live streaming  
**Total CPU:** 187.1% (11.7% of 1600% max)

---

## 📊 HIỆN TRẠNG HỆ THỐNG

### **CPU Usage Breakdown:**

```yaml
Recording (H.265 NVENC):
  Total: 46.2% CPU
  Per camera: 23.1% CPU
  Processes: 2
  Percentage of total: 25%

Live Streaming (H.264 NVENC):
  Total: 140.9% CPU
  Per camera: 70.5% CPU
  Processes: 2
  Percentage of total: 75%

TOTAL: 187.1% CPU (11.7% of 1600% max)
```

### **⚠️ PHÁT HIỆN QUAN TRỌNG:**

**Live streaming chiếm 75% CPU** (140.9% / 187.1%)  
**Recording chỉ chiếm 25% CPU** (46.2% / 187.1%)

→ **Live streaming là bottleneck chính!**

---

### **Kiến Trúc Hiện Tại:**

```yaml
Mỗi camera có 2 FFmpeg processes riêng biệt:

Camera 1:
  Process 1 (PID 72145): Recording
    - Input: RTSP decode (1080p)
    - Output: MP4 segments (H.265 NVENC)
    - CPU: 25.2%
  
  Process 2 (PID 72146): Live High
    - Input: RTSP decode (1080p)
    - Output: RTSP stream (H.264 NVENC, 1440p)
    - CPU: 70.0%

Camera 2:
  Process 3 (PID 72147): Recording
    - Input: RTSP decode (1080p)
    - Output: MP4 segments (H.265 NVENC)
    - CPU: 21.0%
  
  Process 4 (PID 72148): Live High
    - Input: RTSP decode (1080p)
    - Output: RTSP stream (H.264 NVENC, 1440p)
    - CPU: 70.9%

Total: 4 processes, 4 RTSP decodes
```

### **⚠️ VẤN ĐỀ:**

**Mỗi camera decode RTSP stream 2 lần:**
- 1 lần cho recording
- 1 lần cho live streaming

→ **Lãng phí CPU cho việc decode trùng lặp!**

---

### **GPU Utilization:**

```yaml
NVIDIA RTX 3050:
  GPU Usage: 6%
  Memory Usage: 5%
  Memory Used: 761 MB / 6144 MB
  Temperature: 52°C

Intel UHD 770 (iGPU):
  Status: Available (/dev/dri/renderD128)
  Usage: NOT BEING USED ⚠️
```

→ **GPU đang bị underutilized!**

---

### **Storage:**

```yaml
Disk: 367 GB total, 8.8 GB used (3%)
Camera 1 recordings: 2.7 GB
Camera 2 recordings: 2.7 GB
Total recordings: 5.4 GB

Storage rate: ~22 GB/day per camera
```

---

## 💡 CÁC ĐIỂM CÓ THỂ TỐI ƯU

### **1. ⭐ TỐI ƯU QUAN TRỌNG NHẤT: GIẢM DECODE REDUNDANCY**

#### **Vấn đề:**
- Mỗi camera có 2 processes riêng biệt
- Mỗi process decode RTSP stream 1 lần
- **Tổng: Decode 2 lần cho mỗi camera = lãng phí CPU**

#### **Giải pháp:**
**Single FFmpeg process với multiple outputs**

```yaml
Kiến trúc mới:
  1 FFmpeg process per camera:
    - Input: RTSP decode (1 lần duy nhất)
    - Output 1: MP4 segments (H.265 NVENC, 1080p)
    - Output 2: RTSP stream (H.264 NVENC, 1440p)
```

#### **Lợi ích dự kiến:**

```yaml
Hiện tại:
  - 2 processes × 2 cameras = 4 processes
  - 4 RTSP decodes
  - CPU: 187.1%

Sau tối ưu:
  - 1 process × 2 cameras = 2 processes
  - 2 RTSP decodes (giảm 50%)
  - CPU dự kiến: ~150-160% (giảm 15-20%)
```

#### **Ước tính tiết kiệm:**
- **CPU: -15-20%** (từ 187.1% → ~150-160%)
- **Processes: -50%** (từ 4 → 2)
- **Memory: -30-40%** (ít processes hơn)

#### **Implementation:**

Cần modify `camera_recorder.hpp`:

```cpp
// Thay vì:
FFmpegMultiOutput* recordingProcess;  // Recording only
LiveTranscoder* liveTranscoderHigh;   // Live High only

// Sử dụng:
FFmpegMultiOutput* multiOutputProcess;  // Recording + Live High
```

FFmpegMultiOutput command:
```bash
ffmpeg -hwaccel cuda -i rtsp://... \
  -map 0:v -map 0:a \
  # Output 1: Recording (H.265 NVENC, 1080p)
  -c:v hevc_nvenc -preset p4 -b:v 2M \
  -c:a aac -b:a 128k \
  -f segment -segment_time 180 ... recording.mp4 \
  # Output 2: Live High (H.264 NVENC, 1440p)
  -c:v h264_nvenc -preset p4 -tune ll -s 2560x1440 -b:v 5M \
  -c:a aac -b:a 128k \
  -f rtsp rtsp://localhost:8554/live/.../high
```

#### **Độ ưu tiên:** ⭐⭐⭐⭐⭐ (CAO NHẤT)
#### **Độ khó:** ⚠️⚠️⚠️ (Trung bình - cần modify code)
#### **Impact:** 🎯 Giảm 15-20% CPU

---

### **2. ⭐ TỐI ƯU QUAN TRỌNG: GIẢM RESOLUTION LIVE STREAMING**

#### **Vấn đề:**
- Live High đang encode 1440p (2560×1440)
- **1440p chiếm 70% CPU per camera**
- Có thể không cần thiết cho surveillance

#### **Giải pháp:**
**Giảm Live High xuống 1080p**

```yaml
Hiện tại:
  Live High: 1440p @ 5 Mbps
  CPU: 70.5% per camera

Sau tối ưu:
  Live High: 1080p @ 3 Mbps
  CPU dự kiến: ~40-45% per camera (giảm 35-40%)
```

#### **Lợi ích dự kiến:**

```yaml
Hiện tại:
  Live streaming: 140.9% CPU (2 cameras)
  Per camera: 70.5% CPU

Sau tối ưu:
  Live streaming: ~80-90% CPU (2 cameras)
  Per camera: ~40-45% CPU
  
Tiết kiệm: -50-60% CPU cho live streaming
```

#### **Trade-off:**
- ⚠️ **Quality:** 1440p → 1080p (giảm 44% pixels)
- ✅ **CPU:** Giảm 35-40%
- ✅ **Bandwidth:** Giảm 40% (5 Mbps → 3 Mbps)

#### **Câu hỏi cần trả lời:**
- Có thực sự cần 1440p cho live view không?
- 1080p có đủ cho surveillance không?
- Có bao nhiêu người xem live đồng thời?

#### **Implementation:**

Modify `live_transcoder.hpp`:
```cpp
// Thay vì:
execArgs.push_back("-s");
execArgs.push_back("2560x1440");  // 1440p
execArgs.push_back("-b:v");
execArgs.push_back("5M");

// Sử dụng:
execArgs.push_back("-s");
execArgs.push_back("1920x1080");  // 1080p
execArgs.push_back("-b:v");
execArgs.push_back("3M");
```

#### **Độ ưu tiên:** ⭐⭐⭐⭐ (CAO)
#### **Độ khó:** ⚠️ (Dễ - chỉ cần thay đổi config)
#### **Impact:** 🎯 Giảm 25-30% CPU

---

### **3. ⭐ TỐI ƯU: SỬ DỤNG INTEL iGPU (VAAPI) CHO LIVE STREAMING**

#### **Vấn đề:**
- Intel UHD 770 iGPU đang không được sử dụng
- Tất cả encoding đều dùng NVENC (RTX 3050)
- **GPU underutilized:** 6% usage

#### **Giải pháp:**
**Hybrid encoding: NVENC cho recording + VAAPI cho live**

```yaml
Hiện tại:
  Recording: NVENC H.265 (23.1% CPU per camera)
  Live High: NVENC H.264 (70.5% CPU per camera)
  Intel iGPU: Không dùng

Sau tối ưu:
  Recording: NVENC H.265 (23.1% CPU per camera)
  Live High: VAAPI H.264 (15-20% CPU per camera)
  Intel iGPU: Được sử dụng
```

#### **Lợi ích dự kiến:**

```yaml
Live streaming CPU:
  NVENC: 70.5% per camera
  VAAPI: 15-20% per camera (dự kiến)
  
Tiết kiệm: -50-55% CPU cho live streaming
```

#### **Lý do VAAPI hiệu quả hơn:**
- Intel QuickSync Gen 12.5 rất tốt cho H.264
- Dedicated hardware encoder trên iGPU
- Không cạnh tranh tài nguyên với NVENC

#### **Implementation:**

Modify `live_transcoder.hpp`:
```cpp
// Thay vì:
execArgs.push_back("-c:v");
execArgs.push_back("h264_nvenc");

// Sử dụng:
execArgs.push_back("-vaapi_device");
execArgs.push_back("/dev/dri/renderD128");
execArgs.push_back("-vf");
execArgs.push_back("format=nv12,hwupload");
execArgs.push_back("-c:v");
execArgs.push_back("h264_vaapi");
```

#### **Độ ưu tiên:** ⭐⭐⭐⭐ (CAO)
#### **Độ khó:** ⚠️⚠️ (Trung bình - cần test VAAPI)
#### **Impact:** 🎯 Giảm 25-30% CPU

---

### **4. TỐI ƯU: GIẢM BITRATE RECORDING**

#### **Vấn đề:**
- Recording đang dùng 2 Mbps (bitrate mode)
- File size: 45.74 MB per 3 minutes
- Có thể giảm bitrate mà vẫn giữ quality

#### **Giải pháp:**
**Giảm bitrate xuống 1.5 Mbps hoặc dùng CRF mode**

```yaml
Hiện tại:
  Bitrate: 2 Mbps
  File size: 45.74 MB per 3 min
  Storage: 21.96 GB/day per camera

Option 1 - Bitrate 1.5 Mbps:
  File size: ~34 MB per 3 min
  Storage: ~16.3 GB/day per camera
  Tiết kiệm: 26% storage

Option 2 - CRF 28:
  File size: ~30-35 MB per 3 min
  Storage: ~14-17 GB/day per camera
  Tiết kiệm: 25-35% storage
```

#### **Lợi ích:**
- ✅ **Storage:** Giảm 25-35%
- ✅ **CPU:** Có thể giảm nhẹ (1-2%)
- ⚠️ **Quality:** Giảm nhẹ (cần test)

#### **Implementation:**

Modify `ffmpeg_multi_output.hpp`:
```cpp
// Option 1: Giảm bitrate
args.push_back("-b:v");
args.push_back("1500k");  // Thay vì 2M

// Option 2: Dùng CRF
args.push_back("-rc");
args.push_back("vbr");
args.push_back("-cq");
args.push_back("28");  // CRF 28 (23-28 là tốt)
```

#### **Độ ưu tiên:** ⭐⭐⭐ (Trung bình)
#### **Độ khó:** ⚠️ (Dễ)
#### **Impact:** 💾 Giảm 25-35% storage

---

### **5. TỐI ƯU: GIẢM FRAME RATE LIVE STREAMING**

#### **Vấn đề:**
- Live High đang encode 25 fps
- Có thể không cần 25 fps cho surveillance

#### **Giải pháp:**
**Giảm frame rate xuống 15-20 fps**

```yaml
Hiện tại:
  Frame rate: 25 fps
  CPU: 70.5% per camera

Sau tối ưu:
  Frame rate: 15 fps
  CPU dự kiến: ~50-55% per camera (giảm 20-25%)
```

#### **Lợi ích:**
- ✅ **CPU:** Giảm 20-25%
- ✅ **Bandwidth:** Giảm 20-30%
- ⚠️ **Smoothness:** Giảm nhẹ (vẫn đủ cho surveillance)

#### **Implementation:**

Modify `live_transcoder.hpp`:
```cpp
// Thay vì:
execArgs.push_back("-r");
execArgs.push_back("25");

// Sử dụng:
execArgs.push_back("-r");
execArgs.push_back("15");  // Hoặc 20
```

#### **Độ ưu tiên:** ⭐⭐⭐ (Trung bình)
#### **Độ khó:** ⚠️ (Dễ)
#### **Impact:** 🎯 Giảm 20-25% CPU

---

## 📊 TỔNG HỢP CÁC TỐI ƯU

### **Bảng So Sánh:**

| # | Tối ưu | CPU Savings | Độ khó | Độ ưu tiên | Impact |
|---|--------|-------------|--------|------------|--------|
| 1 | Single process (giảm decode redundancy) | -15-20% | ⚠️⚠️⚠️ | ⭐⭐⭐⭐⭐ | 🎯 Cao |
| 2 | Giảm resolution live (1440p → 1080p) | -25-30% | ⚠️ | ⭐⭐⭐⭐ | 🎯 Cao |
| 3 | Dùng VAAPI cho live streaming | -25-30% | ⚠️⚠️ | ⭐⭐⭐⭐ | 🎯 Cao |
| 4 | Giảm bitrate recording | -1-2% | ⚠️ | ⭐⭐⭐ | 💾 Storage |
| 5 | Giảm frame rate live (25 → 15 fps) | -20-25% | ⚠️ | ⭐⭐⭐ | 🎯 Trung bình |

---

### **Kịch Bản Tối Ưu:**

#### **Kịch Bản 1: TỐI ƯU TOÀN DIỆN (Khuyến nghị)**

**Áp dụng:** Tối ưu #1 + #2 + #3

```yaml
Changes:
  1. Single process với multiple outputs
  2. Giảm live resolution: 1440p → 1080p
  3. Dùng VAAPI cho live streaming

CPU dự kiến:
  Recording (NVENC H.265): 46.2% (không đổi)
  Live (VAAPI H.264, 1080p): 30-40% (giảm 70%)
  Total: ~76-86% (giảm 54-59%)

Kết quả:
  Hiện tại: 187.1% CPU
  Sau tối ưu: ~76-86% CPU
  Tiết kiệm: -54-59% CPU ✅
  
Scalability:
  Hiện tại: 2 cameras = 187.1% CPU
  Sau tối ưu: 2 cameras = ~80 CPU
  → Có thể scale lên 4-5 cameras với cùng CPU!
```

---

#### **Kịch Bản 2: TỐI ƯU NHANH (Dễ nhất)**

**Áp dụng:** Tối ưu #2 + #5

```yaml
Changes:
  1. Giảm live resolution: 1440p → 1080p
  2. Giảm frame rate: 25 → 15 fps

CPU dự kiến:
  Recording: 46.2% (không đổi)
  Live: ~50-60% (giảm 57%)
  Total: ~96-106% (giảm 43-49%)

Kết quả:
  Hiện tại: 187.1% CPU
  Sau tối ưu: ~96-106% CPU
  Tiết kiệm: -43-49% CPU ✅
  
Ưu điểm:
  - Dễ implement (chỉ thay config)
  - Không cần modify code nhiều
  - Risk thấp
```

---

#### **Kịch Bản 3: TỐI ƯU STORAGE**

**Áp dụng:** Tối ưu #4

```yaml
Changes:
  1. Giảm bitrate recording: 2 Mbps → 1.5 Mbps

Storage dự kiến:
  Hiện tại: 21.96 GB/day per camera
  Sau tối ưu: ~16.3 GB/day per camera
  Tiết kiệm: -26% storage ✅

Kết quả:
  2 cameras × 30 days:
    Hiện tại: 1.32 TB
    Sau tối ưu: 0.98 TB
    Tiết kiệm: 340 GB
```

---

## 🎯 KHUYẾN NGHỊ

### **Ưu tiên cao nhất:**

**1. Áp dụng Kịch Bản 1 (Tối ưu toàn diện):**

```yaml
Step 1: Giảm live resolution (1440p → 1080p)
  - Dễ implement
  - Tiết kiệm 25-30% CPU ngay lập tức
  - Test và verify

Step 2: Chuyển live sang VAAPI
  - Test VAAPI H.264 encoding
  - Verify quality và stability
  - Tiết kiệm thêm 25-30% CPU

Step 3: Single process với multiple outputs
  - Modify camera_recorder.hpp
  - Implement FFmpegMultiOutput với 2 outputs
  - Tiết kiệm thêm 15-20% CPU

Tổng tiết kiệm: -54-59% CPU
```

---

### **Timeline dự kiến:**

```yaml
Week 1: Tối ưu #2 (Giảm resolution)
  - 2 hours implementation
  - 1 day testing
  - Impact: -25-30% CPU

Week 2: Tối ưu #3 (VAAPI cho live)
  - 4 hours implementation
  - 2 days testing
  - Impact: -25-30% CPU

Week 3: Tối ưu #1 (Single process)
  - 8 hours implementation
  - 3 days testing
  - Impact: -15-20% CPU

Total: 3 weeks, -54-59% CPU savings
```

---

## ✅ KẾT LUẬN

**Hệ thống hiện tại đã tốt (187.1% CPU cho 2 cameras), nhưng còn nhiều điểm có thể tối ưu:**

1. ⭐⭐⭐⭐⭐ **Single process** - Giảm decode redundancy (-15-20% CPU)
2. ⭐⭐⭐⭐ **Giảm resolution live** - 1440p → 1080p (-25-30% CPU)
3. ⭐⭐⭐⭐ **Dùng VAAPI cho live** - Tận dụng iGPU (-25-30% CPU)
4. ⭐⭐⭐ **Giảm bitrate recording** - Tiết kiệm storage (-26%)
5. ⭐⭐⭐ **Giảm frame rate live** - 25 → 15 fps (-20-25% CPU)

**Nếu áp dụng tất cả:**
- **CPU:** 187.1% → ~76-86% (-54-59%)
- **Scalability:** 2 cameras → 4-5 cameras
- **Storage:** Có thể giảm thêm 26%

**Khuyến nghị:** Bắt đầu với Kịch Bản 1 (Tối ưu toàn diện) để đạt hiệu quả cao nhất.

---

**Last Updated:** October 20, 2025  
**Status:** ✅ ANALYSIS COMPLETE  
**Next Steps:** Implement optimizations theo priority

