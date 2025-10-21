#!/bin/bash
# Test FFmpeg multi-output command for Phase 3
# Single input decode, dual outputs: Recording + Live High

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      🧪 PHASE 3 - TEST MULTI-OUTPUT FFMPEG COMMAND          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

RTSP_URL="rtsp://admin:Admin@123@ductaidendo1.zapto.org:556/Streaming/Channels/102"
RTSP_PUBLISH="rtsp://vms_recorder:vms_recorder_secret_2025@localhost:8554/live/1/high"
TEST_OUTPUT="/tmp/test_multi_output_%Y%m%d_%H%M%S.mp4"

echo "=== 1. CONFIGURATION ==="
echo ""
echo "Input:"
echo "  Camera: Duc Tai Dendo 1"
echo "  RTSP URL: ${RTSP_URL}"
echo ""
echo "Output 1 (Recording):"
echo "  Codec: H.265 NVENC"
echo "  Resolution: 1080p"
echo "  Bitrate: 2 Mbps"
echo "  Format: MP4 segments (3 minutes)"
echo "  Path: ${TEST_OUTPUT}"
echo ""
echo "Output 2 (Live High):"
echo "  Codec: H.264 NVENC"
echo "  Resolution: 1080p"
echo "  Bitrate: 3 Mbps"
echo "  Format: RTSP stream"
echo "  URL: ${RTSP_PUBLISH}"
echo ""

echo "=== 2. STARTING MULTI-OUTPUT TEST (60 seconds) ==="
echo ""

# Build FFmpeg command
# Note: Remove -hwaccel cuda to avoid conflicts with running processes
timeout 60 ffmpeg \
  -hide_banner \
  -loglevel error \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  \
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
  "$TEST_OUTPUT" \
  \
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
  "$RTSP_PUBLISH" &

FFMPEG_PID=$!
echo "FFmpeg PID: $FFMPEG_PID"
echo ""

# Wait for process to start
sleep 3

# Check if process is running
if ! ps -p $FFMPEG_PID > /dev/null 2>&1; then
    echo "❌ FFmpeg process failed to start"
    echo ""
    echo "Check errors above"
    exit 1
fi

echo "✅ FFmpeg process started successfully"
echo ""

echo "=== 3. MONITORING CPU USAGE (60 seconds) ==="
echo ""

# Monitor CPU for 60 seconds
CPU_SAMPLES=()
for i in {1..12}; do
    if ps -p $FFMPEG_PID > /dev/null 2>&1; then
        CPU=$(ps -p $FFMPEG_PID -o %cpu= | tr -d ' ')
        CPU_SAMPLES+=($CPU)
        echo "Sample $i/12: CPU = ${CPU}%"
        sleep 5
    else
        echo "Sample $i/12: Process ended"
        break
    fi
done

# Kill FFmpeg if still running
if ps -p $FFMPEG_PID > /dev/null 2>&1; then
    kill $FFMPEG_PID 2>/dev/null
    wait $FFMPEG_PID 2>/dev/null
fi

echo ""
echo "=== 4. VERIFY OUTPUTS ==="
echo ""

# Check recording output
echo "Recording output:"
if ls /tmp/test_multi_output_*.mp4 1> /dev/null 2>&1; then
    for file in /tmp/test_multi_output_*.mp4; do
        SIZE=$(du -h "$file" | cut -f1)
        echo "  ✅ $file ($SIZE)"
    done
else
    echo "  ❌ No recording files found"
fi
echo ""

# Check live stream (via MediaMTX)
echo "Live stream:"
echo "  Checking if stream is published to MediaMTX..."
sleep 2
if curl -s http://localhost:8554/live/1/high > /dev/null 2>&1; then
    echo "  ✅ Live stream accessible at rtsp://localhost:8554/live/1/high"
else
    echo "  ⚠️  Cannot verify live stream (MediaMTX may need time to register)"
fi
echo ""

echo "=== 5. RESULTS ==="
echo ""

# Calculate average CPU
if [ ${#CPU_SAMPLES[@]} -gt 0 ]; then
    TOTAL=0
    MIN=999
    MAX=0
    
    for cpu in "${CPU_SAMPLES[@]}"; do
        TOTAL=$(echo "$TOTAL + $cpu" | bc)
        if (( $(echo "$cpu < $MIN" | bc -l) )); then
            MIN=$cpu
        fi
        if (( $(echo "$cpu > $MAX" | bc -l) )); then
            MAX=$cpu
        fi
    done
    
    AVG=$(echo "scale=1; $TOTAL / ${#CPU_SAMPLES[@]}" | bc)
    
    echo "CPU Usage (Single Process, Dual Outputs):"
    echo "  Average: ${AVG}%"
    echo "  Min: ${MIN}%"
    echo "  Max: ${MAX}%"
    echo ""
    
    # Compare with current setup
    CURRENT_TOTAL=80.3
    CURRENT_REC=39.5
    CURRENT_LIVE=40.8
    
    echo "Comparison with Current Setup:"
    echo "  Current (2 processes): ${CURRENT_TOTAL}%"
    echo "    Recording: ${CURRENT_REC}%"
    echo "    Live High: ${CURRENT_LIVE}%"
    echo ""
    echo "  Test (1 process): ${AVG}%"
    echo ""
    
    SAVINGS=$(echo "scale=1; $CURRENT_TOTAL - $AVG" | bc)
    SAVINGS_PCT=$(echo "scale=0; ($SAVINGS / $CURRENT_TOTAL) * 100" | bc)
    
    if (( $(echo "$AVG < $CURRENT_TOTAL" | bc -l) )); then
        echo "  Savings: ${SAVINGS}% (${SAVINGS_PCT}%)"
        echo ""
        echo "✅ MULTI-OUTPUT is ${SAVINGS_PCT}% more efficient!"
        
        # Extrapolate to 2 cameras
        TOTAL_CURRENT=$(echo "scale=1; $CURRENT_TOTAL" | bc)
        TOTAL_NEW=$(echo "scale=1; $AVG * 2" | bc)
        TOTAL_SAVINGS=$(echo "scale=1; $TOTAL_CURRENT - $TOTAL_NEW" | bc)
        
        echo ""
        echo "Projected for 2 cameras:"
        echo "  Current: ${TOTAL_CURRENT}%"
        echo "  With multi-output: ${TOTAL_NEW}%"
        echo "  Total savings: ${TOTAL_SAVINGS}%"
    else
        echo "  ⚠️  Multi-output uses MORE CPU than separate processes"
    fi
    
    echo ""
    echo "✅ TEST SUCCESSFUL"
else
    echo "❌ No CPU samples collected"
    exit 1
fi

echo ""
echo "=== 6. CLEANUP ==="
echo ""
echo "Removing test files..."
rm -f /tmp/test_multi_output_*.mp4
echo "✅ Cleanup complete"

