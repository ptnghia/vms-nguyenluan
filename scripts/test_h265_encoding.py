#!/usr/bin/env python3
"""
Test H.265 vs H.264 encoding performance
"""

import subprocess
import time
import os
import json
import threading
from datetime import datetime

# Test configurations
TESTS = [
    {
        "name": "TEST 1: H.264 VAAPI (Baseline)",
        "output": "/tmp/encoding_test/test1_h264_vaapi.mp4",
        "cmd": [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-vaapi_device", "/dev/dri/renderD128",
            "-rtsp_transport", "tcp",
            "-i", "rtsp://admin:Admin@123@ductaidendo1.zapto.org:556/Streaming/Channels/102",
            "-vf", "format=nv12,hwupload",
            "-c:v", "h264_vaapi",
            "-b:v", "2M",
            "-c:a", "aac", "-b:a", "128k",
            "-t", "180",
            "/tmp/encoding_test/test1_h264_vaapi.mp4"
        ]
    },
    {
        "name": "TEST 2: H.265 VAAPI (Target)",
        "output": "/tmp/encoding_test/test2_h265_vaapi.mp4",
        "cmd": [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-vaapi_device", "/dev/dri/renderD128",
            "-rtsp_transport", "tcp",
            "-i", "rtsp://admin:Admin@123@ductaidendo1.zapto.org:556/Streaming/Channels/102",
            "-vf", "format=nv12,hwupload",
            "-c:v", "hevc_vaapi",
            "-b:v", "2M",
            "-c:a", "aac", "-b:a", "128k",
            "-t", "180",
            "/tmp/encoding_test/test2_h265_vaapi.mp4"
        ]
    },
    {
        "name": "TEST 3: H.265 NVENC (Alternative)",
        "output": "/tmp/encoding_test/test3_h265_nvenc.mp4",
        "cmd": [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-hwaccel", "cuda",
            "-rtsp_transport", "tcp",
            "-i", "rtsp://admin:Admin@123@ductaidendo1.zapto.org:556/Streaming/Channels/102",
            "-c:v", "hevc_nvenc",
            "-preset", "p4",
            "-b:v", "2M",
            "-c:a", "aac", "-b:a", "128k",
            "-t", "180",
            "/tmp/encoding_test/test3_h265_nvenc.mp4"
        ]
    }
]

def monitor_cpu(pid, cpu_samples, stop_event):
    """Monitor CPU usage in background thread"""
    sample_count = 0
    while not stop_event.is_set():
        try:
            # Get CPU usage using ps command
            result = subprocess.run(
                ["ps", "-p", str(pid), "-o", "%cpu="],
                capture_output=True,
                text=True,
                timeout=2
            )

            if result.returncode == 0:
                cpu_str = result.stdout.strip()
                if cpu_str:
                    cpu_percent = float(cpu_str)
                    cpu_samples.append(cpu_percent)
                    sample_count += 1
                    elapsed = sample_count * 5
                    print(f"  [{sample_count:02d}/36] Time: {elapsed:3d}s | CPU: {cpu_percent:6.2f}%")

            time.sleep(5)
        except (subprocess.TimeoutExpired, ValueError):
            pass
        except Exception:
            break

def run_test(test_config):
    """Run encoding test and monitor CPU usage"""
    print(f"\n{'='*80}")
    print(f"  {test_config['name']}")
    print(f"{'='*80}")
    print(f"Start time: {datetime.now().strftime('%H:%M:%S')}")
    print(f"Output: {test_config['output']}")
    print()

    # Remove old file if exists
    if os.path.exists(test_config['output']):
        os.remove(test_config['output'])

    # Start FFmpeg process
    process = subprocess.Popen(
        test_config['cmd'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Monitor CPU usage in background thread
    cpu_samples = []
    stop_event = threading.Event()

    print("Monitoring CPU usage (sampling every 5 seconds):")
    print()

    monitor_thread = threading.Thread(
        target=monitor_cpu,
        args=(process.pid, cpu_samples, stop_event)
    )
    monitor_thread.start()

    try:
        # Wait for process to complete
        process.wait()
    except KeyboardInterrupt:
        process.terminate()
        print("\nTest interrupted!")
        return None
    finally:
        stop_event.set()
        monitor_thread.join(timeout=2)

    print()
    print(f"End time: {datetime.now().strftime('%H:%M:%S')}")
    print()

    # Calculate CPU statistics
    if cpu_samples:
        avg_cpu = sum(cpu_samples) / len(cpu_samples)
        max_cpu = max(cpu_samples)
        min_cpu = min(cpu_samples)

        print(f"CPU Usage Statistics:")
        print(f"  Average: {avg_cpu:.2f}%")
        print(f"  Maximum: {max_cpu:.2f}%")
        print(f"  Minimum: {min_cpu:.2f}%")
        print()

    # Get file info
    if os.path.exists(test_config['output']):
        file_size = os.path.getsize(test_config['output'])
        file_size_mb = file_size / 1024 / 1024

        # Get video info with ffprobe
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json",
                 "-show_format", test_config['output']],
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                info = json.loads(result.stdout)
                duration = float(info['format']['duration'])
                bitrate = int(info['format']['bit_rate']) / 1000

                print(f"File Information:")
                print(f"  Size: {file_size_mb:.2f} MB")
                print(f"  Duration: {duration:.2f}s")
                print(f"  Bitrate: {bitrate:.0f} kbps")
                print()

                return {
                    'name': test_config['name'],
                    'cpu_avg': avg_cpu if cpu_samples else 0,
                    'cpu_max': max_cpu if cpu_samples else 0,
                    'file_size_mb': file_size_mb,
                    'duration': duration,
                    'bitrate_kbps': bitrate
                }
        except Exception as e:
            print(f"Error getting file info: {e}")
    else:
        print("ERROR: Output file not created!")

    return None

def main():
    print("╔══════════════════════════════════════════════════════════════════════════════╗")
    print("║           🧪 H.265 VS H.264 ENCODING PERFORMANCE TEST                       ║")
    print("╚══════════════════════════════════════════════════════════════════════════════╝")
    print()
    print("Test Duration: 3 minutes per test")
    print("Total Time: ~9 minutes")
    print()
    
    # Create output directory
    os.makedirs("/tmp/encoding_test", exist_ok=True)
    
    results = []
    
    for test in TESTS:
        result = run_test(test)
        if result:
            results.append(result)
        
        # Wait a bit between tests
        if test != TESTS[-1]:
            print("\nWaiting 10 seconds before next test...")
            time.sleep(10)
    
    # Print comparison
    print("\n" + "="*80)
    print("  📊 COMPARISON SUMMARY")
    print("="*80)
    print()
    
    if len(results) >= 2:
        baseline = results[0]
        
        print(f"{'Metric':<25} | {'H.264 VAAPI':<15} | {'H.265 VAAPI':<15} | {'Difference':<15}")
        print("-" * 80)
        
        # CPU comparison
        cpu_diff = results[1]['cpu_avg'] - baseline['cpu_avg']
        cpu_diff_pct = (cpu_diff / baseline['cpu_avg'] * 100) if baseline['cpu_avg'] > 0 else 0
        print(f"{'CPU Average':<25} | {baseline['cpu_avg']:>13.2f}% | {results[1]['cpu_avg']:>13.2f}% | {cpu_diff:>+6.2f}% ({cpu_diff_pct:>+5.1f}%)")
        
        # File size comparison
        size_diff = results[1]['file_size_mb'] - baseline['file_size_mb']
        size_diff_pct = (size_diff / baseline['file_size_mb'] * 100) if baseline['file_size_mb'] > 0 else 0
        print(f"{'File Size':<25} | {baseline['file_size_mb']:>12.2f}MB | {results[1]['file_size_mb']:>12.2f}MB | {size_diff:>+6.2f}MB ({size_diff_pct:>+5.1f}%)")
        
        # Bitrate comparison
        br_diff = results[1]['bitrate_kbps'] - baseline['bitrate_kbps']
        br_diff_pct = (br_diff / baseline['bitrate_kbps'] * 100) if baseline['bitrate_kbps'] > 0 else 0
        print(f"{'Bitrate':<25} | {baseline['bitrate_kbps']:>11.0f}kbps | {results[1]['bitrate_kbps']:>11.0f}kbps | {br_diff:>+6.0f}kbps ({br_diff_pct:>+5.1f}%)")
        
        print()
        
        # NVENC comparison if available
        if len(results) >= 3:
            print(f"{'Metric':<25} | {'H.264 VAAPI':<15} | {'H.265 NVENC':<15} | {'Difference':<15}")
            print("-" * 80)
            
            cpu_diff = results[2]['cpu_avg'] - baseline['cpu_avg']
            cpu_diff_pct = (cpu_diff / baseline['cpu_avg'] * 100) if baseline['cpu_avg'] > 0 else 0
            print(f"{'CPU Average':<25} | {baseline['cpu_avg']:>13.2f}% | {results[2]['cpu_avg']:>13.2f}% | {cpu_diff:>+6.2f}% ({cpu_diff_pct:>+5.1f}%)")
            
            size_diff = results[2]['file_size_mb'] - baseline['file_size_mb']
            size_diff_pct = (size_diff / baseline['file_size_mb'] * 100) if baseline['file_size_mb'] > 0 else 0
            print(f"{'File Size':<25} | {baseline['file_size_mb']:>12.2f}MB | {results[2]['file_size_mb']:>12.2f}MB | {size_diff:>+6.2f}MB ({size_diff_pct:>+5.1f}%)")
            
            br_diff = results[2]['bitrate_kbps'] - baseline['bitrate_kbps']
            br_diff_pct = (br_diff / baseline['bitrate_kbps'] * 100) if baseline['bitrate_kbps'] > 0 else 0
            print(f"{'Bitrate':<25} | {baseline['bitrate_kbps']:>11.0f}kbps | {results[2]['bitrate_kbps']:>11.0f}kbps | {br_diff:>+6.0f}kbps ({br_diff_pct:>+5.1f}%)")
            
            print()
    
    print("="*80)
    print("Test completed!")
    print("="*80)

if __name__ == "__main__":
    main()

