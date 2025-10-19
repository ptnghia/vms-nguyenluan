#!/bin/bash
# Start MediaMTX RTSP/HLS/WebRTC Server

cd /home/camera/app/vms/services/streaming

echo "=== Starting MediaMTX Streaming Server ==="
echo "RTSP: rtsp://localhost:8554"
echo "HLS:  http://localhost:8888"
echo "WebRTC: http://localhost:8889"
echo "API: http://localhost:9997"
echo "Metrics: http://localhost:9998"
echo ""

exec ./mediamtx vms-mediamtx.yml
