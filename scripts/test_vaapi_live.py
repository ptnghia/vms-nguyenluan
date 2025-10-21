#!/usr/bin/env python3
"""
Test VAAPI H.264 encoding for live streaming
Phase 2 optimization - Compare NVENC vs VAAPI
"""

import subprocess
import time
import psutil
import sys

def test_vaapi_encoding():
    """Test VAAPI H.264 encoding with 1080p @ 3Mbps"""
    
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║         🧪 PHASE 2 - TEST VAAPI H.264 ENCODING              ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
    
    # Camera 1 RTSP URL
    rtsp_url = "rtsp://admin:Admin@123@ductaidendo1.zapto.org:556/Streaming/Channels/102"
    
    # FFmpeg command for VAAPI encoding
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "error",
        "-vaapi_device", "/dev/dri/renderD128",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-vf", "format=nv12,hwupload",
        "-c:v", "h264_vaapi",
        "-b:v", "3M",
        "-maxrate", "3M",
        "-bufsize", "6M",
        "-s", "1920x1080",
        "-r", "25",
        "-c:a", "aac",
        "-b:a", "128k",
        "-f", "null",
        "-"
    ]
    
    print("=== 1. STARTING VAAPI ENCODING TEST ===")
    print()
    print("Configuration:")
    print("  Encoder: h264_vaapi (Intel UHD 770)")
    print("  Resolution: 1920x1080")
    print("  Bitrate: 3 Mbps")
    print("  Frame rate: 25 fps")
    print("  Duration: 30 seconds")
    print()
    
    # Start FFmpeg process
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        print(f"FFmpeg PID: {process.pid}")
        print()
        print("=== 2. MONITORING CPU USAGE ===")
        print()
        
        # Monitor CPU for 30 seconds
        cpu_samples = []
        
        time.sleep(2)  # Wait for process to stabilize
        
        for i in range(6):
            try:
                p = psutil.Process(process.pid)
                cpu_percent = p.cpu_percent(interval=1.0)
                cpu_samples.append(cpu_percent)
                print(f"Sample {i+1}/6: CPU = {cpu_percent:.1f}%")
                time.sleep(4)
            except psutil.NoSuchProcess:
                print(f"Sample {i+1}/6: Process ended")
                break
        
        # Terminate process
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        
        print()
        print("=== 3. RESULTS ===")
        print()
        
        if cpu_samples:
            avg_cpu = sum(cpu_samples) / len(cpu_samples)
            min_cpu = min(cpu_samples)
            max_cpu = max(cpu_samples)
            
            print(f"CPU Usage:")
            print(f"  Average: {avg_cpu:.1f}%")
            print(f"  Min: {min_cpu:.1f}%")
            print(f"  Max: {max_cpu:.1f}%")
            print()
            
            # Compare with current NVENC
            nvenc_cpu = 20.4  # From Phase 1 results
            
            print("Comparison with NVENC:")
            print(f"  NVENC (current): {nvenc_cpu:.1f}% per camera")
            print(f"  VAAPI (test): {avg_cpu:.1f}% per camera")
            
            if avg_cpu < nvenc_cpu:
                savings = nvenc_cpu - avg_cpu
                savings_pct = (savings / nvenc_cpu) * 100
                print(f"  Savings: {savings:.1f}% ({savings_pct:.0f}%)")
                print()
                print(f"✅ VAAPI is {savings_pct:.0f}% more efficient!")
                
                # Calculate total savings for 2 cameras
                total_savings = savings * 2
                print()
                print(f"Total savings for 2 cameras: {total_savings:.1f}%")
                print(f"  Current (NVENC): {nvenc_cpu * 2:.1f}%")
                print(f"  With VAAPI: {avg_cpu * 2:.1f}%")
            else:
                print(f"  ⚠️  VAAPI uses MORE CPU than NVENC")
            
            print()
            print("✅ TEST SUCCESSFUL")
            return True
        else:
            print("❌ No CPU samples collected")
            return False
            
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        return False

if __name__ == "__main__":
    success = test_vaapi_encoding()
    sys.exit(0 if success else 1)

