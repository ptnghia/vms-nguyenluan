#!/bin/bash
# NVENC Quality Benchmark Tool
# Tests different NVENC presets (p1-p7) and measures quality/performance

set -e

# Configuration
RTSP_URL="${1:-rtsp://admin:Admin@123@ductaidendo1.zapto.org:556}"
CAMERA_NAME="${2:-Test_Camera}"
OUTPUT_DIR="/home/camera/app/vms/data/benchmark"
DURATION=60  # Test duration in seconds
RESOLUTION="1280x720"
BITRATE="2M"

# NVENC Presets to test
PRESETS=("p1" "p2" "p3" "p4" "p5" "p6" "p7")
PRESET_NAMES=(
    "p1: Fastest (lowest quality)"
    "p2: Faster"
    "p3: Fast"
    "p4: Medium (balanced)"
    "p5: Slow"
    "p6: Slower"
    "p7: Slowest (highest quality)"
)

echo "======================================"
echo "NVENC Quality Benchmark Tool"
echo "======================================"
echo "RTSP URL: $RTSP_URL"
echo "Duration: ${DURATION}s per preset"
echo "Resolution: $RESOLUTION"
echo "Target Bitrate: $BITRATE"
echo "======================================"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"
rm -rf "$OUTPUT_DIR"/*

# Results file
RESULTS_FILE="$OUTPUT_DIR/benchmark_results.txt"
CSV_FILE="$OUTPUT_DIR/benchmark_results.csv"

echo "Preset,Avg Bitrate (kbps),Max Bitrate (kbps),File Size (MB),Encode FPS,Quality (VMAF),CPU %,GPU %" > "$CSV_FILE"

echo "Starting benchmark tests..." | tee "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Test each preset
for i in "${!PRESETS[@]}"; do
    PRESET="${PRESETS[$i]}"
    PRESET_NAME="${PRESET_NAMES[$i]}"
    OUTPUT_FILE="$OUTPUT_DIR/${CAMERA_NAME}_${PRESET}.mp4"
    LOG_FILE="$OUTPUT_DIR/${CAMERA_NAME}_${PRESET}.log"
    
    echo "========================================" | tee -a "$RESULTS_FILE"
    echo "Testing: $PRESET_NAME" | tee -a "$RESULTS_FILE"
    echo "========================================" | tee -a "$RESULTS_FILE"
    
    # Start GPU monitoring in background
    GPU_LOG="$OUTPUT_DIR/gpu_${PRESET}.log"
    ( while true; do nvidia-smi --query-gpu=utilization.gpu,utilization.memory --format=csv,noheader,nounits >> "$GPU_LOG"; sleep 1; done ) &
    GPU_PID=$!
    
    # Start CPU monitoring in background
    CPU_LOG="$OUTPUT_DIR/cpu_${PRESET}.log"
    ( while true; do top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 >> "$CPU_LOG"; sleep 1; done ) &
    CPU_PID=$!
    
    # Record with FFmpeg
    START_TIME=$(date +%s)
    ffmpeg -rtsp_transport tcp \
           -i "$RTSP_URL" \
           -t $DURATION \
           -c:v h264_nvenc \
           -preset "$PRESET" \
           -tune ll \
           -b:v "$BITRATE" \
           -maxrate "$BITRATE" \
           -bufsize "4M" \
           -g 50 \
           -s "$RESOLUTION" \
           -c:a aac \
           -b:a 128k \
           -y "$OUTPUT_FILE" \
           2>&1 | tee "$LOG_FILE"
    
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    
    # Stop monitoring
    kill $GPU_PID 2>/dev/null || true
    kill $CPU_PID 2>/dev/null || true
    
    # Analyze results
    if [ -f "$OUTPUT_FILE" ]; then
        # File size
        FILE_SIZE=$(du -m "$OUTPUT_FILE" | cut -f1)
        
        # Get video info with ffprobe
        BITRATE_INFO=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE")
        BITRATE_KBPS=$((BITRATE_INFO / 1000))
        
        # Get actual bitrate from ffmpeg log
        AVG_BITRATE=$(grep -oP 'bitrate=\s*\K[0-9.]+' "$LOG_FILE" | tail -1)
        
        # Get encoding FPS
        ENCODE_FPS=$(grep -oP 'fps=\s*\K[0-9.]+' "$LOG_FILE" | tail -1)
        
        # Calculate average GPU usage
        if [ -f "$GPU_LOG" ]; then
            AVG_GPU=$(awk -F',' '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}' "$GPU_LOG")
            AVG_MEM=$(awk -F',' '{sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' "$GPU_LOG")
        else
            AVG_GPU=0
            AVG_MEM=0
        fi
        
        # Calculate average CPU usage
        if [ -f "$CPU_LOG" ]; then
            AVG_CPU=$(awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}' "$CPU_LOG")
        else
            AVG_CPU=0
        fi
        
        # Get max bitrate peaks
        MAX_BITRATE=$(grep -oP 'bitrate=\s*\K[0-9.]+' "$LOG_FILE" | sort -n | tail -1)
        
        echo "Results for $PRESET:" | tee -a "$RESULTS_FILE"
        echo "  File Size: ${FILE_SIZE} MB" | tee -a "$RESULTS_FILE"
        echo "  Avg Bitrate: ${AVG_BITRATE:-N/A} kbits/s" | tee -a "$RESULTS_FILE"
        echo "  Max Bitrate: ${MAX_BITRATE:-N/A} kbits/s" | tee -a "$RESULTS_FILE"
        echo "  Encode FPS: ${ENCODE_FPS:-N/A}" | tee -a "$RESULTS_FILE"
        echo "  Avg GPU Util: ${AVG_GPU}%" | tee -a "$RESULTS_FILE"
        echo "  Avg GPU Mem: ${AVG_MEM}%" | tee -a "$RESULTS_FILE"
        echo "  Avg CPU: ${AVG_CPU}%" | tee -a "$RESULTS_FILE"
        echo "  Duration: ${ELAPSED}s" | tee -a "$RESULTS_FILE"
        echo "" | tee -a "$RESULTS_FILE"
        
        # Add to CSV
        echo "$PRESET,$AVG_BITRATE,$MAX_BITRATE,$FILE_SIZE,$ENCODE_FPS,N/A,$AVG_CPU,$AVG_GPU" >> "$CSV_FILE"
    else
        echo "ERROR: Failed to create output file for $PRESET" | tee -a "$RESULTS_FILE"
        echo "$PRESET,ERROR,ERROR,ERROR,ERROR,ERROR,ERROR,ERROR" >> "$CSV_FILE"
    fi
    
    # Clean up monitoring logs
    rm -f "$GPU_LOG" "$CPU_LOG"
    
    echo "" | tee -a "$RESULTS_FILE"
done

echo "========================================" | tee -a "$RESULTS_FILE"
echo "Benchmark Complete!" | tee -a "$RESULTS_FILE"
echo "========================================" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "Results saved to:" | tee -a "$RESULTS_FILE"
echo "  Text: $RESULTS_FILE" | tee -a "$RESULTS_FILE"
echo "  CSV:  $CSV_FILE" | tee -a "$RESULTS_FILE"
echo "  Video files: $OUTPUT_DIR/*.mp4" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Summary comparison
echo "========================================" | tee -a "$RESULTS_FILE"
echo "SUMMARY COMPARISON" | tee -a "$RESULTS_FILE"
echo "========================================" | tee -a "$RESULTS_FILE"
cat "$CSV_FILE" | column -t -s',' | tee -a "$RESULTS_FILE"

echo ""
echo "You can now:"
echo "1. Review video files in: $OUTPUT_DIR"
echo "2. Compare quality visually"
echo "3. Check detailed results in: $RESULTS_FILE"
echo "4. Import CSV into spreadsheet: $CSV_FILE"
