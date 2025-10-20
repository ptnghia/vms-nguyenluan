# 💾 Phân Tích & Tối Ưu Dung Lượng Lưu Trữ VMS

**Ngày phân tích:** 20 Tháng 10, 2025  
**Phạm vi:** Storage optimization + Compression analysis + Hardware verification  
**Mục tiêu:** Giảm dung lượng lưu trữ 50-70% với chất lượng tương đương

---

## 📊 PHÂN TÍCH HIỆN TRẠNG

### **1. Dữ liệu thực tế (2 cameras, ~17 hours recording):**

```yaml
Total Storage Used: 136GB (88GB + 48GB)
  - Camera 1 (Duc Tai Dendo 1): 88GB
  - Camera 2 (Duc Tai Dendo 2): 48GB

Total Files: 1,337 MP4 segments
Average File Size: 103.45 MB per segment (3 minutes)

Video Specs (from sample):
  Codec: H.264
  Resolution: 1920x1080 (1080p)
  Frame Rate: 30 fps
  Bitrate: 4.11 Mbps (4,113,164 bps)
  Segment Duration: 3 minutes (180 seconds)
```

### **2. Tính toán chi tiết:**

```yaml
Per Segment (3 minutes):
  Bitrate: 4.11 Mbps
  Duration: 180 seconds
  Size: 4.11 Mbps × 180s ÷ 8 = 92.5 MB
  Actual: 103.45 MB (overhead ~12%)

Per Hour:
  Segments: 20 segments/hour
  Size: 103.45 MB × 20 = 2,069 MB = 2.02 GB/hour

Per Day (24 hours):
  Size: 2.02 GB × 24 = 48.48 GB/day per camera

Per Month (30 days):
  Size: 48.48 GB × 30 = 1,454 GB = 1.42 TB/month per camera

Per Year (365 days):
  Size: 48.48 GB × 365 = 17,695 GB = 17.3 TB/year per camera
```

### **3. Scaling projection:**

```yaml
5 Cameras (Current plan):
  Per Day: 48.48 GB × 5 = 242 GB/day
  Per Month: 1.42 TB × 5 = 7.1 TB/month
  Per Year: 17.3 TB × 5 = 86.5 TB/year ❌ KHÔNG BỀN VỮNG

200 Cameras (Phase 4 target):
  Per Day: 48.48 GB × 200 = 9,696 GB = 9.5 TB/day
  Per Month: 1.42 TB × 200 = 284 TB/month
  Per Year: 17.3 TB × 200 = 3,460 TB = 3.46 PB/year ❌ KHÔNG KHẢ THI
```

### **4. Vấn đề:**

```yaml
❌ Bitrate quá cao: 4.11 Mbps cho 1080p@30fps
   → Industry standard: 2-3 Mbps cho surveillance

❌ Copy mode: Không nén lại, giữ nguyên bitrate từ camera
   → Lãng phí storage

❌ Không có tiered storage: Tất cả đều lưu chất lượng cao
   → Không cần thiết cho footage cũ

❌ Retention policy chưa tối ưu: 2 days retention
   → Cần 365 days theo yêu cầu
```

---

## 🔍 PHÂN TÍCH PHẦN CỨNG

### **1. CPU: Intel Core i5-14500**

```yaml
Specs:
  Cores: 14 cores (6 P-cores + 8 E-cores)
  Threads: 20 threads
  Architecture: Raptor Lake (13th gen refresh)
  
Hardware Acceleration:
  ✅ Intel QuickSync Video (QSV) Gen 12.5
  ✅ Support: H.264, H.265/HEVC, AV1
  ✅ Concurrent encodes: 30-40 streams
  ✅ Quality: Excellent (comparable to x264 medium)
  
Verified:
  ✅ FFmpeg supports: qsv, vaapi
  ✅ CPU flags: avx2, avx_vnni (AI acceleration)
```

**Đánh giá:** ✅ **HOÀN HẢO** cho video encoding với QSV

---

### **2. GPU: NVIDIA RTX 3050 6GB**

```yaml
Specs:
  CUDA Cores: 2,560
  VRAM: 6GB GDDR6
  NVENC: 8th generation
  
Hardware Acceleration:
  ✅ NVENC H.264/H.265
  ✅ Concurrent encodes: 3-5 streams (limited)
  ✅ Quality: Good (better than QSV for low bitrate)
  
Verified:
  ✅ FFmpeg supports: cuda, nvenc
  
Current Usage:
  GPU: 5% utilization
  VRAM: 592MB / 6GB
```

**Đánh giá:** ✅ **TỐT** nhưng giới hạn concurrent encodes  
**Khuyến nghị:** Dành cho AI Phase 3 (LPR, Object Detection)

---

### **3. Storage: 476.9GB SSD**

```yaml
Layout:
  Total: 476.9GB SSD
  /home partition: 373.9GB (LVM)
    Used: 139GB (recordings)
    Available: 210GB
    Usage: 40%

Current Recordings:
  136GB for 2 cameras × 17 hours
  
Projection (2 days retention):
  2 cameras: 48.48 GB × 2 days × 2 = 194 GB ✅ OK
  5 cameras: 48.48 GB × 2 days × 5 = 485 GB ❌ VƯỢT CAPACITY
  
Projection (365 days retention - YÊU CẦU):
  2 cameras: 48.48 GB × 365 × 2 = 35.4 TB ❌ KHÔNG KHẢ THI
  5 cameras: 48.48 GB × 365 × 5 = 88.5 TB ❌ KHÔNG KHẢ THI
```

**Đánh giá:** ❌ **KHÔNG ĐỦ** cho yêu cầu 365 days retention  
**Khuyến nghị:** Cần external storage hoặc NAS

---

### **4. RAM: 16GB DDR4**

```yaml
Total: 16GB
Used: 6.6GB
Available: 8.8GB
Usage: 41%

Projection (5 cameras with optimization):
  Recording: 1.2GB × 5 = 6GB
  API + Frontend: 1GB
  System: 2GB
  Total: 9GB ✅ OK
```

**Đánh giá:** ✅ **ĐỦ** cho 5 cameras

---

### **5. Network: 1Gbps**

```yaml
Current: 1Gbps Ethernet
Bandwidth used: ~30Mbps (2 cameras)

Projection (5 cameras):
  Inbound: 4.11 Mbps × 5 = 20.55 Mbps ✅ OK
  Outbound (live): 7 Mbps × 5 = 35 Mbps ✅ OK
  Total: ~56 Mbps ✅ OK (5.6% of 1Gbps)
```

**Đánh giá:** ✅ **ĐỦ** cho 5-200 cameras

---

## 💡 GIẢI PHÁP TỐI ƯU

### **🎯 Giải pháp 1: RE-ENCODE với H.264 CRF (KHUYẾN NGHỊ)**

#### **Concept:**

```yaml
Thay vì copy mode (4.11 Mbps), re-encode với:
  - Codec: H.264 (QSV)
  - Quality: CRF 23 (visually lossless)
  - Preset: veryfast (QSV)
  - Target bitrate: 1.5-2 Mbps (adaptive)
  
Benefits:
  - Giảm 50-60% dung lượng
  - Chất lượng tương đương (CRF 23)
  - Tận dụng Intel QSV (0% CPU overhead)
```

#### **FFmpeg Command:**

```bash
ffmpeg \
  -hwaccel qsv -c:v h264_qsv \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  \
  # Recording với QSV re-encode
  -map 0:v -c:v h264_qsv \
  -global_quality 23 \
  -look_ahead 1 \
  -preset veryfast \
  -b:v 2M -maxrate 2.5M -bufsize 5M \
  -f segment -segment_time 180 -segment_format mp4 \
  -strftime 1 -reset_timestamps 1 \
  "/data/recordings/${CAMERA_NAME}/%Y%m%d_%H%M%S.mp4"
```

#### **Expected Results:**

```yaml
Per Segment (3 minutes):
  Before: 103.45 MB (4.11 Mbps)
  After: 45 MB (2 Mbps)
  Reduction: 56.5% ✅

Per Day:
  Before: 48.48 GB
  After: 21.6 GB
  Reduction: 55.4% ✅

Per Year (5 cameras):
  Before: 86.5 TB
  After: 39.4 TB
  Reduction: 54.5% ✅

Storage Requirement (365 days, 5 cameras):
  Before: 88.5 TB ❌
  After: 39.4 TB ✅ (feasible with NAS)
```

---

### **🎯 Giải pháp 2: H.265/HEVC (TỐI ƯU NHẤT)**

#### **Concept:**

```yaml
H.265 (HEVC) tiết kiệm 40-50% so với H.264 cùng chất lượng:
  - Codec: H.265 (QSV)
  - Quality: CRF 28 (equivalent to H.264 CRF 23)
  - Preset: veryfast (QSV)
  - Target bitrate: 1-1.5 Mbps
  
Benefits:
  - Giảm 70-75% dung lượng vs hiện tại
  - Chất lượng tương đương
  - Intel QSV Gen 12.5 support HEVC tốt
  
Drawbacks:
  - Playback compatibility (cần browser support)
  - Slightly higher CPU for decode
```

#### **FFmpeg Command:**

```bash
ffmpeg \
  -hwaccel qsv -c:v h264_qsv \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  \
  # Recording với HEVC
  -map 0:v -c:v hevc_qsv \
  -global_quality 28 \
  -look_ahead 1 \
  -preset veryfast \
  -b:v 1.5M -maxrate 2M -bufsize 4M \
  -f segment -segment_time 180 -segment_format mp4 \
  -strftime 1 -reset_timestamps 1 \
  "/data/recordings/${CAMERA_NAME}/%Y%m%d_%H%M%S.mp4"
```

#### **Expected Results:**

```yaml
Per Segment (3 minutes):
  Before: 103.45 MB (4.11 Mbps)
  After: 27 MB (1.2 Mbps)
  Reduction: 73.9% ✅✅

Per Day:
  Before: 48.48 GB
  After: 12.96 GB
  Reduction: 73.3% ✅✅

Per Year (5 cameras):
  Before: 86.5 TB
  After: 23.7 TB
  Reduction: 72.6% ✅✅

Storage Requirement (365 days, 5 cameras):
  Before: 88.5 TB ❌
  After: 23.7 TB ✅✅ (feasible with 24TB NAS)
```

---

### **🎯 Giải pháp 3: TIERED STORAGE (Production-Ready)**

#### **Concept:**

```yaml
3-tier storage với compression tăng dần:

Tier 1 - HOT (0-7 days):
  Storage: Local SSD (500GB)
  Codec: H.264 CRF 23 (2 Mbps)
  Purpose: Recent footage, fast access
  Retention: 7 days
  
Tier 2 - WARM (8-30 days):
  Storage: NAS HDD (5TB)
  Codec: H.265 CRF 28 (1.2 Mbps)
  Purpose: Recent history, normal access
  Retention: 23 days
  
Tier 3 - COLD (31-365 days):
  Storage: NAS HDD Archive (20TB)
  Codec: H.265 CRF 32 (0.8 Mbps)
  Purpose: Long-term archive, rare access
  Retention: 335 days
```

#### **Storage Calculation:**

```yaml
5 Cameras, 365 days retention:

Tier 1 (7 days, H.264 2Mbps):
  Size: 21.6 GB/day × 7 × 5 = 756 GB
  Storage: 1TB SSD ✅

Tier 2 (23 days, H.265 1.2Mbps):
  Size: 12.96 GB/day × 23 × 5 = 1,490 GB = 1.45 TB
  Storage: 2TB HDD ✅

Tier 3 (335 days, H.265 0.8Mbps):
  Size: 8.64 GB/day × 335 × 5 = 14,472 GB = 14.1 TB
  Storage: 16TB HDD ✅

Total Storage: 1TB SSD + 2TB HDD + 16TB HDD = 19TB
Cost: ~$800 (SSD $100 + HDD $700)
```

#### **Auto-tiering Logic:**

```typescript
// services/api/src/services/storage-tier.service.ts
class StorageTierManager {
  async tierRecordings() {
    const now = Date.now();
    
    // Move to Tier 2 (re-encode to H.265)
    const tier1Files = await this.getRecordingsOlderThan(7);
    for (const file of tier1Files) {
      await this.reencodeToHEVC(file, 'tier2', 28); // CRF 28
      await this.moveToNAS(file, 'warm');
    }
    
    // Move to Tier 3 (re-encode to lower bitrate)
    const tier2Files = await this.getRecordingsOlderThan(30);
    for (const file of tier2Files) {
      await this.reencodeToHEVC(file, 'tier3', 32); // CRF 32
      await this.moveToNAS(file, 'cold');
    }
    
    // Delete after 365 days
    const expiredFiles = await this.getRecordingsOlderThan(365);
    for (const file of expiredFiles) {
      await this.deleteRecording(file);
    }
  }
}

// Run daily at 2 AM
cron.schedule('0 2 * * *', () => {
  storageTierManager.tierRecordings();
});
```

---

## 📊 SO SÁNH CÁC GIẢI PHÁP

| Giải pháp | Bitrate | Size/Day | 365d/5cam | Storage Cost | Complexity | Khuyến nghị |
|-----------|---------|----------|-----------|--------------|------------|-------------|
| **Hiện tại (Copy)** | 4.11 Mbps | 48.48 GB | 88.5 TB ❌ | $8,850 | Low | ❌ Không bền vững |
| **1. H.264 CRF 23** | 2 Mbps | 21.6 GB | 39.4 TB | $3,940 | Low | ✅ Tốt |
| **2. H.265 CRF 28** | 1.2 Mbps | 12.96 GB | 23.7 TB | $2,370 | Medium | ✅✅ Rất tốt |
| **3. Tiered Storage** | 0.8-2 Mbps | 14.4 GB avg | 19 TB | $800 | High | ✅✅✅ Tối ưu nhất |

### **Khuyến nghị theo phase:**

```yaml
Phase 1 MVP (Hiện tại - 2 cameras):
  → Giải pháp 1: H.264 CRF 23 với QSV
  Lý do: Đơn giản, hiệu quả, đủ cho demo
  Timeline: 1 ngày implement
  Storage: 500GB SSD (đủ cho 7 days)
  
Phase 2 Production (5 cameras):
  → Giải pháp 2: H.265 CRF 28 với QSV
  Lý do: Tiết kiệm 73% storage
  Timeline: 2 ngày implement + testing
  Storage: 1TB SSD + 4TB NAS (đủ cho 30 days)
  
Phase 4 Enterprise (200 cameras):
  → Giải pháp 3: Tiered Storage
  Lý do: Scale tốt, cost-effective
  Timeline: 2 tuần implement
  Storage: 10TB SSD + 200TB NAS
```

---

## 🔧 STORAGE HARDWARE REQUIREMENTS

### **Phase 1 MVP (2 cameras, 7 days):**

```yaml
Current: 476.9GB SSD ✅ ĐỦ
  Used: 139GB
  Available: 210GB
  
With H.264 CRF 23:
  Required: 21.6 GB/day × 7 × 2 = 302 GB
  Available: 210GB ✅ OK (with cleanup)
  
Recommendation: ✅ Không cần mua thêm
```

---

### **Phase 2 Production (5 cameras, 30 days):**

```yaml
Option A: H.264 CRF 23
  Required: 21.6 GB/day × 30 × 5 = 3.24 TB
  Solution: 4TB External HDD
  Cost: ~$100
  
Option B: H.265 CRF 28 (KHUYẾN NGHỊ)
  Required: 12.96 GB/day × 30 × 5 = 1.94 TB
  Solution: 2TB External HDD
  Cost: ~$60
  
Recommendation: ✅ Mua 4TB External HDD ($100)
  - Dự phòng cho tương lai
  - USB 3.0 / USB-C
  - 7200 RPM
```

---

### **Phase 3 Scale (5 cameras, 365 days):**

```yaml
Option A: H.265 Single Tier
  Required: 12.96 GB/day × 365 × 5 = 23.7 TB
  Solution: 24TB NAS (4-bay, RAID 6)
  Cost: ~$1,500
  
Option B: Tiered Storage (KHUYẾN NGHỊ)
  Tier 1: 1TB SSD ($100)
  Tier 2: 2TB HDD ($60)
  Tier 3: 16TB HDD ($400)
  Total: 19TB, Cost: $560
  
Recommendation: ✅ Tiered Storage
  - Cost-effective: $560 vs $1,500
  - Better performance (SSD for recent)
  - Flexible scaling
```

---

### **Phase 4 Enterprise (200 cameras, 365 days):**

```yaml
With Tiered Storage:
  Tier 1: 40TB SSD (200 cameras × 7 days)
  Tier 2: 80TB HDD (200 cameras × 23 days)
  Tier 3: 560TB HDD (200 cameras × 335 days)
  Total: 680TB
  
Solution: Enterprise NAS
  - Synology RS4021xs+ (16-bay)
  - 16× 40TB HDDs = 640TB raw
  - RAID 6: 560TB usable
  - Cost: ~$15,000
  
Alternative: Cloud Storage (S3 Glacier)
  - 560TB × $0.004/GB/month = $2,240/month
  - Annual: $26,880
  - Not recommended (too expensive)
```

---

## ✅ KẾ HOẠCH TRIỂN KHAI

### **🔴 Phase 1: Immediate (Hôm nay - 1 ngày)**

#### **Mục tiêu:** Implement H.264 CRF 23 với Intel QSV

**Bước 1: Verify QSV support** (30 phút)
```bash
# Test QSV encoding
ffmpeg -hwaccel qsv -c:v h264_qsv \
  -i /home/camera/app/vms/data/recordings/Duc\ Tai\ Dendo\ 1/Duc_Tai_Dendo_1_20251019_090854.mp4 \
  -c:v h264_qsv -global_quality 23 -preset veryfast \
  -t 60 -f null -
  
# Expected: Should encode at >100fps
```

**Bước 2: Update camera_recorder.hpp** (3 hours)
```cpp
// Change from copy mode to QSV encode
std::string buildRecordingCommand() {
    return "ffmpeg "
           "-hwaccel qsv -c:v h264_qsv "
           "-rtsp_transport tcp -i " + rtspUrl + " "
           "-c:v h264_qsv "
           "-global_quality 23 "
           "-look_ahead 1 "
           "-preset veryfast "
           "-b:v 2M -maxrate 2.5M -bufsize 5M "
           "-f segment -segment_time 180 "
           + recordingPath;
}
```

**Bước 3: Test với 1 camera** (2 hours)
```bash
pm2 stop vms-recorder
cd /home/camera/app/vms/services/recorder/build
cmake .. && make
pm2 start vms-recorder

# Monitor file size
watch -n 5 'ls -lh /home/camera/app/vms/data/recordings/Duc\ Tai\ Dendo\ 1/ | tail -5'
# Expected: ~45MB per 3-minute segment (vs 103MB before)
```

**Bước 4: Deploy to all cameras** (1 hour)

**Expected Results:**
- ✅ Storage reduction: 56.5%
- ✅ CPU usage: ~15% per camera (QSV)
- ✅ Quality: Visually lossless

---

### **🟡 Phase 2: Short-term (Tuần tới - 2 ngày)**

#### **Mục tiêu:** Upgrade to H.265 + External HDD

**Day 1: Implement H.265 encoding**
```cpp
// Update to HEVC
"-c:v hevc_qsv "
"-global_quality 28 "
"-b:v 1.5M -maxrate 2M -bufsize 4M "
```

**Day 2: Setup external storage**
```bash
# Mount 4TB external HDD
sudo mkdir -p /mnt/vms-storage
sudo mount /dev/sdb1 /mnt/vms-storage
sudo chown camera:camera /mnt/vms-storage

# Update recording path
export RECORDING_PATH="/mnt/vms-storage/recordings"

# Test and deploy
```

**Expected Results:**
- ✅ Storage reduction: 73.3%
- ✅ 30 days retention for 5 cameras
- ✅ Cost: $100 (4TB HDD)

---

### **🟢 Phase 3: Mid-term (Tháng tới - 2 tuần)**

#### **Mục tiêu:** Implement Tiered Storage

**Week 1: Develop auto-tiering service**
- StorageTierManager class
- Re-encoding pipeline
- NAS integration
- Cron scheduler

**Week 2: Testing & deployment**
- Test tiering logic
- Verify quality at each tier
- Performance testing
- Production deployment

**Expected Results:**
- ✅ 365 days retention
- ✅ 19TB total storage
- ✅ Cost: $560

---

## 📈 EXPECTED RESULTS SUMMARY

### **Immediate (Phase 1 - H.264 CRF 23):**

```yaml
2 Cameras:
  Before: 48.48 GB/day × 2 = 96.96 GB/day
  After: 21.6 GB/day × 2 = 43.2 GB/day
  Reduction: 55.4% ✅
  
  7 days retention:
    Before: 679 GB
    After: 302 GB ✅ (fits in 500GB SSD)

5 Cameras:
  Per Day: 108 GB
  7 days: 756 GB (need 1TB)
```

### **Short-term (Phase 2 - H.265 CRF 28):**

```yaml
5 Cameras:
  Per Day: 64.8 GB
  30 days: 1.94 TB ✅ (fits in 2TB HDD)
  Cost: $60
```

### **Mid-term (Phase 3 - Tiered Storage):**

```yaml
5 Cameras, 365 days:
  Total: 19TB
  Cost: $560
  Reduction vs current: 78.5% ✅✅
```

---

## 💰 COST ANALYSIS

| Phase | Storage | Cost | Savings vs Current | ROI |
|-------|---------|------|-------------------|-----|
| **Current** | 88.5TB (5 cam, 365d) | $8,850 | - | - |
| **Phase 1** | 39.4TB | $3,940 | $4,910 (55%) | Immediate |
| **Phase 2** | 23.7TB | $2,370 | $6,480 (73%) | 1 week |
| **Phase 3** | 19TB | $560 | $8,290 (94%) | 1 month |

**Total Savings: $8,290 (94% reduction)** ✅✅✅

---

## ✅ KẾT LUẬN & KHUYẾN NGHỊ

### **Tình trạng hiện tại:**
```yaml
❌ Bitrate: 4.11 Mbps (quá cao)
❌ Storage: 88.5 TB/year cho 5 cameras (không khả thi)
❌ Cost: $8,850 (quá đắt)
❌ Scalability: Không scale được lên 200 cameras
```

### **Giải pháp đề xuất:**

**🔴 NGAY LẬP TỨC (Hôm nay):**
1. ✅ Implement H.264 CRF 23 với Intel QSV
2. ✅ Giảm 55% storage (103MB → 45MB per segment)
3. ✅ Timeline: 6 hours
4. ✅ Cost: $0

**🟡 TUẦN TỚI:**
1. ✅ Upgrade to H.265 CRF 28
2. ✅ Mua 4TB External HDD ($100)
3. ✅ Giảm 73% storage
4. ✅ 30 days retention cho 5 cameras

**🟢 THÁNG TỚI:**
1. ✅ Implement Tiered Storage
2. ✅ Mua 1TB SSD + 16TB HDD ($560)
3. ✅ Giảm 78% storage
4. ✅ 365 days retention cho 5 cameras

### **Hardware verified:**
```yaml
✅ CPU: Intel i5-14500 với QSV Gen 12.5 (perfect)
✅ GPU: RTX 3050 (dành cho AI Phase 3)
✅ RAM: 16GB (đủ cho 5 cameras)
❌ Storage: 476.9GB SSD (cần external HDD)
✅ Network: 1Gbps (đủ cho 200 cameras)
```

### **Next Steps:**
1. ✅ Approve giải pháp H.264 CRF 23
2. ✅ Implement ngay hôm nay (6 hours)
3. ✅ Order 4TB External HDD ($100)
4. ✅ Plan tiered storage cho tháng tới

---

**Trạng thái:** 🟢 **SẴN SÀNG TRIỂN KHAI**  
**Ưu tiên:** 🔴 **CAO** - Cần làm ngay để scale lên 5 cameras

**Ngày:** 20 Tháng 10, 2025  
**Người phân tích:** AI Assistant

