#!/bin/bash
# Simple multi-output test with CPU monitoring

RTSP_URL="rtsp://admin:Admin@123@ductaidendo1.zapto.org:556/Streaming/Channels/102"

echo "Starting FFmpeg multi-output test..."
echo ""

# Start FFmpeg in background
ffmpeg -hide_banner -loglevel error \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  -map 0:v -map 0:a? \
  -c:v hevc_nvenc -preset p4 -b:v 2M \
  -c:a aac -b:a 128k \
  -f segment -segment_time 180 -segment_format mp4 \
  -strftime 1 -reset_timestamps 1 \
  /tmp/test_multi_%Y%m%d_%H%M%S.mp4 \
  -map 0:v -map 0:a? \
  -c:v h264_nvenc -preset p4 -tune ll \
  -s 1920x1080 -b:v 3M -maxrate 3M -bufsize 6M \
  -r 25 -g 50 \
  -c:a aac -b:a 128k \
  -f null - \
  > /tmp/ffmpeg_multi.log 2>&1 &

PID=$!
echo "FFmpeg PID: $PID"
echo ""

# Wait for startup
sleep 3

# Check if running
if ! ps -p $PID > /dev/null 2>&1; then
    echo "ERROR: FFmpeg failed to start"
    cat /tmp/ffmpeg_multi.log
    exit 1
fi

echo "Monitoring CPU for 30 seconds..."
echo ""

# Monitor CPU
for i in {1..6}; do
    if ps -p $PID > /dev/null 2>&1; then
        CPU=$(ps -p $PID -o %cpu= | tr -d ' ')
        echo "Sample $i/6: CPU = ${CPU}%"
        sleep 5
    else
        echo "Sample $i/6: Process ended"
        break
    fi
done

# Kill process
if ps -p $PID > /dev/null 2>&1; then
    kill $PID 2>/dev/null
    wait $PID 2>/dev/null
fi

echo ""
echo "Test complete"
echo ""

# Check output
if ls /tmp/test_multi_*.mp4 1> /dev/null 2>&1; then
    echo "Recording output:"
    ls -lh /tmp/test_multi_*.mp4 | tail -1
fi

