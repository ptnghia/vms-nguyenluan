#!/bin/bash
# Bitrate Verification Tool
# Analyzes recorded video files and verifies actual bitrate vs target

set -e

# Configuration
RECORDINGS_DIR="${1:-/home/camera/app/vms/data/recordings}"
OUTPUT_FILE="${2:-/home/camera/app/vms/data/bitrate_analysis.txt}"
CSV_FILE="${3:-/home/camera/app/vms/data/bitrate_analysis.csv}"

# Target bitrates
TARGET_BITRATE_LOW=2000  # 2 Mbps for 720p
TARGET_BITRATE_HIGH=5000 # 5 Mbps for 1440p
TOLERANCE=10  # 10% tolerance

echo "======================================"
echo "Bitrate Verification Tool"
echo "======================================"
echo "Analyzing recordings in: $RECORDINGS_DIR"
echo "Target bitrates:"
echo "  720p Low: ${TARGET_BITRATE_LOW} kbps"
echo "  1440p High: ${TARGET_BITRATE_HIGH} kbps"
echo "  Tolerance: ±${TOLERANCE}%"
echo "======================================"
echo ""

# Create output files
echo "Bitrate Analysis Report" > "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Camera,File,Resolution,Target (kbps),Actual (kbps),Deviation (%),Status" > "$CSV_FILE"

# Find all MP4 files
MP4_FILES=$(find "$RECORDINGS_DIR" -name "*.mp4" -type f | sort)

if [ -z "$MP4_FILES" ]; then
    echo "No MP4 files found in $RECORDINGS_DIR"
    exit 1
fi

TOTAL_FILES=0
GOOD_FILES=0
WARNING_FILES=0
BAD_FILES=0

echo "Analyzing files..." | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

while IFS= read -r FILE; do
    if [ ! -f "$FILE" ]; then
        continue
    fi
    
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    # Extract camera name from path
    CAMERA_NAME=$(basename "$(dirname "$FILE")")
    FILENAME=$(basename "$FILE")
    
    # Get video info
    VIDEO_INFO=$(ffprobe -v quiet -select_streams v:0 \
        -show_entries stream=bit_rate,width,height \
        -of default=noprint_wrappers=1 "$FILE")
    
    BITRATE=$(echo "$VIDEO_INFO" | grep "bit_rate=" | cut -d'=' -f2)
    WIDTH=$(echo "$VIDEO_INFO" | grep "width=" | cut -d'=' -f2)
    HEIGHT=$(echo "$VIDEO_INFO" | grep "height=" | cut -d'=' -f2)
    
    if [ -z "$BITRATE" ] || [ "$BITRATE" = "N/A" ]; then
        echo "WARNING: Could not determine bitrate for $FILENAME" | tee -a "$OUTPUT_FILE"
        continue
    fi
    
    BITRATE_KBPS=$((BITRATE / 1000))
    RESOLUTION="${WIDTH}x${HEIGHT}"
    
    # Determine target based on resolution
    if [ "$HEIGHT" -le 720 ]; then
        TARGET=$TARGET_BITRATE_LOW
        QUALITY="Low"
    else
        TARGET=$TARGET_BITRATE_HIGH
        QUALITY="High"
    fi
    
    # Calculate deviation
    DEVIATION=$(awk "BEGIN {printf \"%.2f\", (($BITRATE_KBPS - $TARGET) / $TARGET) * 100}")
    ABS_DEVIATION=$(awk "BEGIN {printf \"%.2f\", sqrt(($DEVIATION)^2)}")
    
    # Determine status
    if (( $(echo "$ABS_DEVIATION <= $TOLERANCE" | bc -l) )); then
        STATUS="✓ GOOD"
        GOOD_FILES=$((GOOD_FILES + 1))
        STATUS_COLOR="\033[32m"  # Green
    elif (( $(echo "$ABS_DEVIATION <= 20" | bc -l) )); then
        STATUS="⚠ WARNING"
        WARNING_FILES=$((WARNING_FILES + 1))
        STATUS_COLOR="\033[33m"  # Yellow
    else
        STATUS="✗ BAD"
        BAD_FILES=$((BAD_FILES + 1))
        STATUS_COLOR="\033[31m"  # Red
    fi
    RESET_COLOR="\033[0m"
    
    # Output results
    echo -e "${STATUS_COLOR}[$STATUS]${RESET_COLOR} $CAMERA_NAME / $FILENAME"
    echo "  Resolution: $RESOLUTION ($QUALITY quality)"
    echo "  Target Bitrate: ${TARGET} kbps"
    echo "  Actual Bitrate: ${BITRATE_KBPS} kbps"
    echo "  Deviation: ${DEVIATION}%"
    echo ""
    
    # Write to text file
    echo "[$STATUS] $CAMERA_NAME / $FILENAME" >> "$OUTPUT_FILE"
    echo "  Resolution: $RESOLUTION ($QUALITY quality)" >> "$OUTPUT_FILE"
    echo "  Target: ${TARGET} kbps | Actual: ${BITRATE_KBPS} kbps | Deviation: ${DEVIATION}%" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    # Write to CSV
    echo "$CAMERA_NAME,$FILENAME,$RESOLUTION,$TARGET,$BITRATE_KBPS,$DEVIATION,$STATUS" >> "$CSV_FILE"
    
done <<< "$MP4_FILES"

# Summary
echo "========================================" | tee -a "$OUTPUT_FILE"
echo "SUMMARY" | tee -a "$OUTPUT_FILE"
echo "========================================" | tee -a "$OUTPUT_FILE"
echo "Total Files Analyzed: $TOTAL_FILES" | tee -a "$OUTPUT_FILE"
echo "✓ Good (within ${TOLERANCE}%): $GOOD_FILES" | tee -a "$OUTPUT_FILE"
echo "⚠ Warning (${TOLERANCE}-20%): $WARNING_FILES" | tee -a "$OUTPUT_FILE"
echo "✗ Bad (>20%): $BAD_FILES" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

# Calculate percentages
if [ $TOTAL_FILES -gt 0 ]; then
    GOOD_PCT=$(awk "BEGIN {printf \"%.1f\", ($GOOD_FILES / $TOTAL_FILES) * 100}")
    WARNING_PCT=$(awk "BEGIN {printf \"%.1f\", ($WARNING_FILES / $TOTAL_FILES) * 100}")
    BAD_PCT=$(awk "BEGIN {printf \"%.1f\", ($BAD_FILES / $TOTAL_FILES) * 100}")
    
    echo "Quality Distribution:" | tee -a "$OUTPUT_FILE"
    echo "  Good: ${GOOD_PCT}%" | tee -a "$OUTPUT_FILE"
    echo "  Warning: ${WARNING_PCT}%" | tee -a "$OUTPUT_FILE"
    echo "  Bad: ${BAD_PCT}%" | tee -a "$OUTPUT_FILE"
    echo "" | tee -a "$OUTPUT_FILE"
fi

echo "Results saved to:" | tee -a "$OUTPUT_FILE"
echo "  Text: $OUTPUT_FILE"
echo "  CSV:  $CSV_FILE"
echo ""

# Recommendations
echo "========================================" | tee -a "$OUTPUT_FILE"
echo "RECOMMENDATIONS" | tee -a "$OUTPUT_FILE"
echo "========================================" | tee -a "$OUTPUT_FILE"

if [ $BAD_FILES -gt 0 ]; then
    echo "⚠ Action Required:" | tee -a "$OUTPUT_FILE"
    echo "  - ${BAD_FILES} files have bitrate deviation >20%" | tee -a "$OUTPUT_FILE"
    echo "  - Check NVENC settings in live_transcoder.hpp" | tee -a "$OUTPUT_FILE"
    echo "  - Verify network bandwidth is sufficient" | tee -a "$OUTPUT_FILE"
    echo "  - Consider adjusting -maxrate and -bufsize parameters" | tee -a "$OUTPUT_FILE"
elif [ $WARNING_FILES -gt 0 ]; then
    echo "ℹ Info:" | tee -a "$OUTPUT_FILE"
    echo "  - ${WARNING_FILES} files have bitrate deviation ${TOLERANCE}-20%" | tee -a "$OUTPUT_FILE"
    echo "  - Within acceptable range but could be optimized" | tee -a "$OUTPUT_FILE"
    echo "  - Monitor over longer period" | tee -a "$OUTPUT_FILE"
else
    echo "✓ Excellent:" | tee -a "$OUTPUT_FILE"
    echo "  - All files within ${TOLERANCE}% of target bitrate" | tee -a "$OUTPUT_FILE"
    echo "  - No action needed" | tee -a "$OUTPUT_FILE"
fi

echo "" | tee -a "$OUTPUT_FILE"
