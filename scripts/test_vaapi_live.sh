#!/bin/bash
# Test VAAPI H.264 encoding for live streaming
# Phase 2 optimization - Compare NVENC vs VAAPI

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         🧪 PHASE 2 - TEST VAAPI H.264 ENCODING              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

RTSP_URL="rtsp://admin:Admin@123@ductaidendo1.zapto.org:556/Streaming/Channels/102"

echo "=== 1. VERIFY INTEL iGPU ==="
echo ""
if [ -e /dev/dri/renderD128 ]; then
    echo "✅ Intel iGPU available: /dev/dri/renderD128"
else
    echo "❌ Intel iGPU not found"
    exit 1
fi
echo ""

echo "=== 2. STARTING VAAPI ENCODING TEST ==="
echo ""
echo "Configuration:"
echo "  Encoder: h264_vaapi (Intel UHD 770)"
echo "  Resolution: 1920x1080"
echo "  Bitrate: 3 Mbps"
echo "  Frame rate: 25 fps"
echo "  Duration: 30 seconds"
echo ""

# Start FFmpeg in background
ffmpeg -hide_banner -loglevel error \
  -vaapi_device /dev/dri/renderD128 \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  -vf 'scale=1920:1080,format=nv12,hwupload' \
  -c:v h264_vaapi \
  -b:v 3M \
  -r 25 \
  -c:a aac \
  -b:a 128k \
  -f null - 2>&1 &

FFMPEG_PID=$!
echo "FFmpeg PID: $FFMPEG_PID"
echo ""

# Wait for process to start
sleep 3

# Check if process is running
if ! ps -p $FFMPEG_PID > /dev/null 2>&1; then
    echo "❌ FFmpeg process failed to start"
    exit 1
fi

echo "=== 3. MONITORING CPU USAGE (30 seconds) ==="
echo ""

# Monitor CPU for 30 seconds
CPU_SAMPLES=()
for i in {1..6}; do
    if ps -p $FFMPEG_PID > /dev/null 2>&1; then
        CPU=$(ps -p $FFMPEG_PID -o %cpu= | tr -d ' ')
        CPU_SAMPLES+=($CPU)
        echo "Sample $i/6: CPU = ${CPU}%"
        sleep 5
    else
        echo "Sample $i/6: Process ended"
        break
    fi
done

# Kill FFmpeg if still running
if ps -p $FFMPEG_PID > /dev/null 2>&1; then
    kill $FFMPEG_PID 2>/dev/null
    wait $FFMPEG_PID 2>/dev/null
fi

echo ""
echo "=== 4. RESULTS ==="
echo ""

# Calculate average
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
    
    echo "CPU Usage:"
    echo "  Average: ${AVG}%"
    echo "  Min: ${MIN}%"
    echo "  Max: ${MAX}%"
    echo ""
    
    # Compare with NVENC
    NVENC_CPU=20.4
    
    echo "Comparison with NVENC:"
    echo "  NVENC (current): ${NVENC_CPU}% per camera"
    echo "  VAAPI (test): ${AVG}% per camera"
    
    SAVINGS=$(echo "scale=1; $NVENC_CPU - $AVG" | bc)
    SAVINGS_PCT=$(echo "scale=0; ($SAVINGS / $NVENC_CPU) * 100" | bc)
    
    if (( $(echo "$AVG < $NVENC_CPU" | bc -l) )); then
        echo "  Savings: ${SAVINGS}% (${SAVINGS_PCT}%)"
        echo ""
        echo "✅ VAAPI is ${SAVINGS_PCT}% more efficient!"
        
        # Calculate total savings for 2 cameras
        TOTAL_SAVINGS=$(echo "scale=1; $SAVINGS * 2" | bc)
        NVENC_TOTAL=$(echo "scale=1; $NVENC_CPU * 2" | bc)
        VAAPI_TOTAL=$(echo "scale=1; $AVG * 2" | bc)
        
        echo ""
        echo "Total savings for 2 cameras: ${TOTAL_SAVINGS}%"
        echo "  Current (NVENC): ${NVENC_TOTAL}%"
        echo "  With VAAPI: ${VAAPI_TOTAL}%"
    else
        echo "  ⚠️  VAAPI uses MORE CPU than NVENC"
    fi
    
    echo ""
    echo "✅ TEST SUCCESSFUL"
else
    echo "❌ No CPU samples collected"
    exit 1
fi

