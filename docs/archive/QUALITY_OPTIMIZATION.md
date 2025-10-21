# Quality Assessment & Optimization Tools

## Tổng Quan

VMS cung cấp 2 công cụ để đánh giá và tối ưu hóa chất lượng video:

1. **Quality Benchmark** - So sánh các NVENC presets (p1-p7)
2. **Bitrate Verification** - Kiểm tra bitrate thực tế vs mục tiêu

---

## 1. Quality Benchmark Tool

### Mục Đích
Test tất cả 7 NVENC presets để tìm cài đặt tối ưu giữa chất lượng và hiệu năng.

### Vị Trí
```bash
/home/camera/app/vms/tools/quality_benchmark.sh
```

### Cách Sử Dụng

#### Basic Usage
```bash
cd /home/camera/app/vms/tools
./quality_benchmark.sh
```

#### Custom Camera
```bash
./quality_benchmark.sh "rtsp://admin:password@camera.local:554" "Camera_Name"
```

### Các NVENC Presets Test

| Preset | Mô Tả | Chất Lượng | Tốc Độ |
|--------|-------|------------|---------|
| p1 | Fastest | Thấp nhất | Nhanh nhất |
| p2 | Faster | Thấp | Rất nhanh |
| p3 | Fast | Trung bình thấp | Nhanh |
| p4 | Medium (default) | Trung bình | Cân bằng |
| p5 | Slow | Trung bình cao | Chậm |
| p6 | Slower | Cao | Rất chậm |
| p7 | Slowest | Cao nhất | Chậm nhất |

### Output

Tool sẽ tạo các file trong `/home/camera/app/vms/data/benchmark/`:

```
benchmark/
├── Test_Camera_p1.mp4         # Video test với preset p1
├── Test_Camera_p2.mp4         # Video test với preset p2
├── ...
├── Test_Camera_p7.mp4         # Video test với preset p7
├── benchmark_results.txt      # Báo cáo chi tiết
└── benchmark_results.csv      # Dữ liệu CSV cho Excel
```

### Thông Số Đo

Mỗi preset được test với:
- **Duration**: 60 giây
- **Resolution**: 1280x720
- **Target Bitrate**: 2Mbps
- **GOP Size**: 50 frames

Metrics thu thập:
- Average Bitrate (kbps)
- Max Bitrate (kbps)
- File Size (MB)
- Encode FPS
- Avg GPU Utilization (%)
- Avg GPU Memory (%)
- Avg CPU (%)

### Example Results

```
========================================
Testing: p4: Medium (balanced)
========================================
Results for p4:
  File Size: 15 MB
  Avg Bitrate: 2048 kbits/s
  Max Bitrate: 2300 kbits/s
  Encode FPS: 25.0
  Avg GPU Util: 5.2%
  Avg GPU Mem: 12.8%
  Avg CPU: 8.5%
  Duration: 60s
```

### So Sánh Kết Quả

#### Xem trong Terminal
```bash
cat /home/camera/app/vms/data/benchmark/benchmark_results.txt
```

#### Import vào Excel
```bash
# Mở file CSV
libreoffice /home/camera/app/vms/data/benchmark/benchmark_results.csv
```

### Khuyến Nghị

**Để chọn preset tối ưu:**

1. **Ưu tiên chất lượng** → Chọn p6 hoặc p7
   - Phù hợp: Camera quan trọng, băng thông cao
   - Nhược điểm: CPU/GPU cao hơn

2. **Cân bằng** → Chọn p4 hoặc p5 (mặc định p4)
   - Phù hợp: Đa số trường hợp
   - Tốt cho: 10-50 cameras

3. **Ưu tiên hiệu năng** → Chọn p1, p2, p3
   - Phù hợp: Hệ thống lớn (100+ cameras)
   - Nhược điểm: Chất lượng giảm nhẹ

---

## 2. Bitrate Verification Tool

### Mục Đích
Kiểm tra xem bitrate thực tế của các file đã record có đúng với mục tiêu (2Mbps cho 720p, 5Mbps cho 1440p) không.

### Vị Trí
```bash
/home/camera/app/vms/tools/verify_bitrate.sh
```

### Cách Sử Dụng

#### Default (analyze all recordings)
```bash
cd /home/camera/app/vms/tools
./verify_bitrate.sh
```

#### Custom Directory
```bash
./verify_bitrate.sh /path/to/recordings /path/to/output.txt /path/to/output.csv
```

### Target Bitrates

| Resolution | Quality | Target Bitrate |
|------------|---------|----------------|
| 1280x720 | Low | 2000 kbps (2 Mbps) |
| 2560x1440 | High | 5000 kbps (5 Mbps) |

### Tolerance Levels

| Deviation | Status | Color | Action |
|-----------|--------|-------|--------|
| ≤10% | ✓ GOOD | Green | Không cần thay đổi |
| 10-20% | ⚠ WARNING | Yellow | Monitor tiếp |
| >20% | ✗ BAD | Red | Cần điều chỉnh |

### Output

Tool tạo 2 file:
```
data/
├── bitrate_analysis.txt    # Báo cáo text
└── bitrate_analysis.csv    # Dữ liệu CSV
```

### Example Output

```
[✓ GOOD] Duc Tai Dendo 1 / Camera_20251019_120000.mp4
  Resolution: 1280x720 (Low quality)
  Target: 2000 kbps | Actual: 2048 kbps | Deviation: +2.4%

[⚠ WARNING] Duc Tai Dendo 2 / Camera_20251019_120000.mp4
  Resolution: 2560x1440 (High quality)
  Target: 5000 kbps | Actual: 4600 kbps | Deviation: -8.0%

========================================
SUMMARY
========================================
Total Files Analyzed: 42
✓ Good (within 10%): 38
⚠ Warning (10-20%): 3
✗ Bad (>20%): 1

Quality Distribution:
  Good: 90.5%
  Warning: 7.1%
  Bad: 2.4%
```

### Recommendations

Tool tự động đưa ra khuyến nghị:

#### Khi có files BAD (>20% deviation)
```
⚠ Action Required:
  - 5 files have bitrate deviation >20%
  - Check NVENC settings in live_transcoder.hpp
  - Verify network bandwidth is sufficient
  - Consider adjusting -maxrate and -bufsize parameters
```

#### Khi tất cả files GOOD
```
✓ Excellent:
  - All files within 10% of target bitrate
  - No action needed
```

---

## Workflow Optimization

### Bước 1: Benchmark Presets
```bash
cd /home/camera/app/vms/tools
./quality_benchmark.sh
```

### Bước 2: Phân Tích Kết Quả
```bash
cat /home/camera/app/vms/data/benchmark/benchmark_results.txt
```

### Bước 3: Chọn Preset Tối Ưu
So sánh các preset dựa trên:
- GPU usage (tránh >80%)
- CPU usage (tránh >70%)
- File size vs quality
- Encoding FPS (phải ≥25)

### Bước 4: Update Config
Edit `/home/camera/app/vms/services/recorder/src/live_transcoder.hpp`:

```cpp
// Thay đổi dòng này:
cmd += " -preset p4";  // Mặc định

// Thành preset tối ưu (ví dụ p5):
cmd += " -preset p5";  // Chất lượng cao hơn
```

### Bước 5: Rebuild
```bash
cd /home/camera/app/vms/services/recorder/build
cmake .. && make -j$(nproc)
```

### Bước 6: Restart Service
```bash
pm2 restart vms-recorder
```

### Bước 7: Verify Bitrate
Sau 30 phút recording:
```bash
cd /home/camera/app/vms/tools
./verify_bitrate.sh
```

### Bước 8: Điều Chỉnh Nếu Cần

**Nếu bitrate quá cao (>10%):**
```cpp
// Giảm maxrate
cmd += " -maxrate 1.8M";  // Thay vì 2M
```

**Nếu bitrate quá thấp (<10%):**
```cpp
// Tăng maxrate
cmd += " -maxrate 2.2M";  // Thay vì 2M
```

---

## Automated Testing Script

### Tạo script test tự động:

```bash
#!/bin/bash
# /home/camera/app/vms/tools/auto_optimize.sh

echo "=== VMS Quality Optimization ==="
echo ""

# 1. Run benchmark
echo "Step 1: Running NVENC benchmark..."
/home/camera/app/vms/tools/quality_benchmark.sh

# 2. Analyze results
echo ""
echo "Step 2: Benchmark results:"
cat /home/camera/app/vms/data/benchmark/benchmark_results.txt

# 3. Wait for recording
echo ""
echo "Step 3: Recording for 30 minutes..."
echo "Please wait..."
sleep 1800

# 4. Verify bitrate
echo ""
echo "Step 4: Verifying bitrate..."
/home/camera/app/vms/tools/verify_bitrate.sh

# 5. Show results
echo ""
echo "Step 5: Bitrate verification results:"
cat /home/camera/app/vms/data/bitrate_analysis.txt

echo ""
echo "=== Optimization Complete ==="
```

### Chạy automated test:
```bash
chmod +x /home/camera/app/vms/tools/auto_optimize.sh
/home/camera/app/vms/tools/auto_optimize.sh
```

---

## Troubleshooting

### Benchmark Tool Fails
```bash
# Check FFmpeg
ffmpeg -version

# Check NVENC support
ffmpeg -encoders | grep nvenc

# Check nvidia-smi
nvidia-smi
```

### Bitrate Verification Shows All BAD
```bash
# Check if files exist
ls -lh /home/camera/app/vms/data/recordings/*/*.mp4

# Manually check one file
ffprobe -v quiet -select_streams v:0 \
  -show_entries stream=bit_rate,width,height \
  /home/camera/app/vms/data/recordings/Camera/file.mp4
```

### High GPU Usage in Benchmark
- Normal: 5-15% per camera
- High: >20% per camera
- Solution: Chọn preset thấp hơn (p3 thay vì p5)

---

## Best Practices

1. **Benchmark định kỳ**: Chạy mỗi khi:
   - Thay đổi hardware
   - Thêm cameras
   - Update FFmpeg/drivers

2. **Verify bitrate hàng ngày**: 
   - Setup cron job
   - Alert nếu >20% deviation

3. **Keep benchmark history**:
   ```bash
   mkdir -p /home/camera/app/vms/data/benchmark_history
   cp -r /home/camera/app/vms/data/benchmark \
     /home/camera/app/vms/data/benchmark_history/$(date +%Y%m%d)
   ```

4. **Document changes**:
   - Ghi lại preset nào được chọn
   - Lý do chọn
   - Kết quả sau khi thay đổi

---

## Cheat Sheet

```bash
# Quick benchmark
./tools/quality_benchmark.sh

# Quick verify
./tools/verify_bitrate.sh

# View benchmark results
cat data/benchmark/benchmark_results.csv | column -t -s','

# View bitrate analysis
cat data/bitrate_analysis.txt

# Find best preset (lowest GPU with good quality)
cat data/benchmark/benchmark_results.csv | \
  sort -t',' -k8 -n | head -5

# Count files by status
grep "GOOD" data/bitrate_analysis.txt | wc -l
grep "WARNING" data/bitrate_analysis.txt | wc -l
grep "BAD" data/bitrate_analysis.txt | wc -l
```
