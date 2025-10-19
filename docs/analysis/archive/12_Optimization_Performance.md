# 12_Optimization_Performance.md

## 🎯 Giải pháp Tối ưu Dual-Stream Processing

### ⚡ **Vấn đề hiện tại**
```
200 cameras × (4Mbps main + 2Mbps sub) = 1.2Gbps bandwidth
200 cameras × (40% CPU main + 20% CPU sub) = 12000% CPU usage
```

### ✅ **Giải pháp 1: On-Demand Sub-Stream**

**Khái niệm:** Chỉ bật sub-stream khi có người xem live, tắt khi không có viewer.

```python
class OnDemandStreamManager:
    """
    Quản lý sub-stream theo demand thực tế
    """
    
    def __init__(self):
        self.active_streams = {}  # camera_id -> viewer_count
        self.stream_timeout = 30  # seconds without viewers before stop
        self.redis_client = redis.Redis()
    
    async def request_stream(self, camera_id, user_id):
        """
        Client request live stream
        """
        # Check if stream already running
        if camera_id in self.active_streams:
            # Stream đang chạy, chỉ cần trả về URL
            self.increment_viewer_count(camera_id)
            return self.get_stream_url(camera_id)
        
        # Start new sub-stream
        await self.start_sub_stream(camera_id)
        self.active_streams[camera_id] = {
            'viewers': [user_id],
            'started_at': datetime.now(),
            'last_viewer_join': datetime.now()
        }
        
        return self.get_stream_url(camera_id)
    
    async def start_sub_stream(self, camera_id):
        """
        Khởi động sub-stream FFmpeg process
        """
        camera = await self.get_camera_config(camera_id)
        
        # FFmpeg command for sub-stream only
        cmd = [
            'ffmpeg',
            '-rtsp_transport', 'tcp',
            '-i', camera['rtsp_url_sub'],
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-b:v', '1M',
            '-maxrate', '1.2M',
            '-bufsize', '600k',
            '-g', '60',  # keyframe every 2s at 30fps
            '-f', 'rtsp',
            f'rtsp://localhost:8554/live/{camera_id}'
        ]
        
        # Start process
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Store process reference
        self.redis_client.hset(
            f'stream_process:{camera_id}',
            mapping={
                'pid': process.pid,
                'started_at': datetime.now().isoformat()
            }
        )
        
        # Wait for stream to be ready
        await self.wait_for_stream_ready(camera_id, timeout=10)
    
    async def release_stream(self, camera_id, user_id):
        """
        Client ngừng xem stream
        """
        if camera_id not in self.active_streams:
            return
        
        # Remove viewer
        stream_info = self.active_streams[camera_id]
        if user_id in stream_info['viewers']:
            stream_info['viewers'].remove(user_id)
        
        # If no viewers left, schedule stream stop
        if len(stream_info['viewers']) == 0:
            asyncio.create_task(
                self.stop_stream_after_timeout(camera_id)
            )
    
    async def stop_stream_after_timeout(self, camera_id):
        """
        Stop stream sau khi không có viewer trong timeout period
        """
        await asyncio.sleep(self.stream_timeout)
        
        # Double-check no new viewers joined
        if (camera_id in self.active_streams and 
            len(self.active_streams[camera_id]['viewers']) == 0):
            
            await self.stop_sub_stream(camera_id)
            del self.active_streams[camera_id]
    
    async def stop_sub_stream(self, camera_id):
        """
        Dừng FFmpeg sub-stream process
        """
        process_info = self.redis_client.hgetall(f'stream_process:{camera_id}')
        if process_info:
            pid = int(process_info[b'pid'])
            os.kill(pid, signal.SIGTERM)
            
            # Cleanup
            self.redis_client.delete(f'stream_process:{camera_id}')

# Tiết kiệm:
# - Bandwidth: Chỉ ~20% cameras có viewer trung bình -> tiết kiệm 80% bandwidth
# - CPU: Giảm 80% CPU usage cho sub-stream processing
# - 200 cameras → ~40 active streams → 80Mbps thay vì 400Mbps
```

---

### ✅ **Giải pháp 2: Hardware-Accelerated Transcoding**

**NVIDIA GPU Acceleration với NVENC**

```cpp
// C++ Recording Engine với NVENC support
class NVENCStreamProcessor {
public:
    NVENCStreamProcessor(const std::string& camera_id) 
        : camera_id_(camera_id) {
        InitializeNVENC();
    }
    
    bool StartDualStream(const std::string& rtsp_main, 
                         const std::string& rtsp_sub) {
        // Main stream: Direct copy (no transcoding)
        main_stream_process_ = StartMainStreamRecording(rtsp_main);
        
        // Sub stream: NVENC hardware transcoding
        sub_stream_process_ = StartSubStreamWithNVENC(rtsp_sub);
        
        return main_stream_process_ && sub_stream_process_;
    }
    
private:
    AVProcessPtr StartMainStreamRecording(const std::string& rtsp_url) {
        // FFmpeg với copy codec (zero CPU overhead)
        std::string cmd = 
            "ffmpeg -rtsp_transport tcp "
            "-i " + rtsp_url + " "
            "-c copy "  // No transcoding!
            "-f segment -segment_time 180 "
            "-strftime 1 " + 
            output_path_ + "/%Y%m%d_%H%M%S.mp4";
        
        return ExecuteFFmpeg(cmd);
    }
    
    AVProcessPtr StartSubStreamWithNVENC(const std::string& rtsp_url) {
        // FFmpeg với NVENC hardware encoder
        std::string cmd = 
            "ffmpeg -hwaccel cuda "  // GPU acceleration
            "-rtsp_transport tcp "
            "-i " + rtsp_url + " "
            "-c:v h264_nvenc "  // NVIDIA hardware encoder
            "-preset p1 "  // Fastest preset (low latency)
            "-tune ll "  // Low latency tuning
            "-rc vbr "  // Variable bitrate
            "-b:v 1M -maxrate 1.2M -bufsize 600k "
            "-g 60 "  // GOP size
            "-f rtsp rtsp://localhost:8554/live/" + camera_id_;
        
        return ExecuteFFmpeg(cmd);
    }
    
    std::string camera_id_;
    AVProcessPtr main_stream_process_;
    AVProcessPtr sub_stream_process_;
};

// Performance comparison:
// CPU transcoding: ~40% CPU per camera × 200 = 8000% CPU (impossible)
// NVENC: ~2% GPU per camera × 200 = 400% GPU (4 GPU cards needed)
// 
// Solution: Hybrid approach
// - Main stream: Direct copy (0% CPU)
// - Sub stream: NVENC when viewer present (on-demand)
// - Average: 40 cameras with viewers × 2% GPU = 80% of 1 GPU card
```

**FFmpeg NVENC Command Examples**
```bash
# Check NVENC support
ffmpeg -encoders | grep nvenc

# Output:
# h264_nvenc (NVIDIA NVENC H.264 encoder)
# hevc_nvenc (NVIDIA NVENC H.265 encoder)

# Single camera sub-stream với NVENC
ffmpeg -hwaccel cuda -hwaccel_output_format cuda \
  -rtsp_transport tcp -i "rtsp://camera/sub" \
  -c:v h264_nvenc \
  -preset p1 \
  -tune ll \
  -rc vbr \
  -b:v 1M -maxrate 1.2M -bufsize 600k \
  -g 60 \
  -f rtsp rtsp://localhost:8554/live/cam1

# Multi-bitrate với single encode (efficient)
ffmpeg -hwaccel cuda -hwaccel_output_format cuda \
  -rtsp_transport tcp -i "rtsp://camera/sub" \
  -filter_complex_threads 4 \
  -filter_complex "[0:v]split=3[v720][v480][v360]; \
    [v720]scale_cuda=1280:720[out720]; \
    [v480]scale_cuda=854:480[out480]; \
    [v360]scale_cuda=640:360[out360]" \
  -map "[out720]" -c:v h264_nvenc -preset p1 -b:v 2M \
    -f rtsp rtsp://localhost:8554/live/cam1_720p \
  -map "[out480]" -c:v h264_nvenc -preset p1 -b:v 1M \
    -f rtsp rtsp://localhost:8554/live/cam1_480p \
  -map "[out360]" -c:v h264_nvenc -preset p1 -b:v 500k \
    -f rtsp rtsp://localhost:8554/live/cam1_360p
```

**Intel QuickSync Alternative (QSV)**
```bash
# For Intel CPU systems (cheaper alternative)
ffmpeg -hwaccel qsv -c:v h264_qsv \
  -rtsp_transport tcp -i "rtsp://camera/sub" \
  -c:v h264_qsv \
  -preset veryfast \
  -b:v 1M -maxrate 1.2M -bufsize 600k \
  -g 60 \
  -f rtsp rtsp://localhost:8554/live/cam1

# QSV supports up to 30-40 concurrent transcodes per CPU
# More cost-effective than NVIDIA for high camera counts
```

---

### ✅ **Giải pháp 3: Shared Sub-Stream Architecture**

**Concept:** Một sub-stream phục vụ nhiều viewers (multicast streaming)

```javascript
// Node.js Streaming Gateway
class SharedStreamManager {
    constructor() {
        this.streamSessions = new Map(); // camera_id -> session_info
        this.viewerSessions = new Map(); // session_id -> viewer_info
    }
    
    async connectViewer(cameraId, userId, clientInfo) {
        /**
         * Connect viewer to existing shared stream
         * hoặc start new stream nếu chưa có
         */
        
        // Check if stream exists
        if (!this.streamSessions.has(cameraId)) {
            // Start new stream
            await this.startSharedStream(cameraId);
        }
        
        const streamSession = this.streamSessions.get(cameraId);
        
        // Add viewer to session
        const sessionId = generateSessionId();
        this.viewerSessions.set(sessionId, {
            userId,
            cameraId,
            clientInfo,
            connectedAt: Date.now(),
            bytesTransferred: 0
        });
        
        // Increment viewer count
        streamSession.viewerCount++;
        streamSession.viewers.push(sessionId);
        
        // Return stream connection info
        return {
            sessionId,
            streamUrl: streamSession.url,
            protocol: streamSession.protocol, // webrtc or hls
            iceServers: this.getICEServers()
        };
    }
    
    async startSharedStream(cameraId) {
        /**
         * Start single stream that will be shared
         * among all viewers for this camera
         */
        
        const camera = await db.cameras.findById(cameraId);
        
        // Start mediamtx relay (efficient single-decode-multi-view)
        const streamUrl = `rtsp://localhost:8554/live/${cameraId}`;
        
        await this.startMediaMTXRelay(camera.rtsp_url_sub, streamUrl);
        
        // Store stream session
        this.streamSessions.set(cameraId, {
            cameraId,
            url: streamUrl,
            protocol: 'webrtc', // Auto-convert to WebRTC
            viewerCount: 0,
            viewers: [],
            startedAt: Date.now(),
            bandwidthUsed: 0
        });
    }
    
    async startMediaMTXRelay(sourceRtsp, destRtsp) {
        /**
         * mediamtx automatically handles:
         * - Single decode from source
         * - Multiple WebRTC/HLS outputs
         * - No additional transcoding per viewer
         */
        
        // mediamtx config
        const config = {
            paths: {
                [`live/${cameraId}`]: {
                    source: sourceRtsp,
                    sourceProtocol: 'rtsp',
                    sourceOnDemand: true,
                    runOnDemand: `/usr/local/bin/start-stream.sh ${cameraId}`,
                    runOnDemandCloseAfter: '30s'
                }
            }
        };
        
        // mediamtx will handle all the heavy lifting
        // CPU usage: 1 decode + minimal overhead per viewer
        // Bandwidth: Only from camera to server (not multiplied by viewers)
    }
    
    calculateBandwidthSavings(totalCameras, avgViewersPerCamera) {
        /**
         * Without sharing:
         * 200 cameras × 5 viewers avg × 2Mbps = 2000Mbps = 2Gbps
         * 
         * With sharing (multicast):
         * 200 cameras × 2Mbps = 400Mbps from cameras to server
         * Server → Viewers bandwidth offloaded to CDN
         * 
         * Savings: 83% bandwidth reduction!
         */
        
        const withoutSharing = totalCameras * avgViewersPerCamera * 2; // Mbps
        const withSharing = totalCameras * 2; // Mbps
        const savings = ((withoutSharing - withSharing) / withoutSharing * 100);
        
        return {
            withoutSharing: `${withoutSharing}Mbps`,
            withSharing: `${withSharing}Mbps`,
            savingsPercent: `${savings.toFixed(1)}%`
        };
    }
}

// Example usage:
// 200 cameras, 5 avg viewers per camera
// Bandwidth: 400Mbps (camera → server) + CDN offload (server → viewers)
// CPU: 200 decodes instead of 1000 decodes
// GPU: 200 encodes instead of 1000 encodes
```

**mediamtx Configuration for Shared Streaming**
```yaml
# /etc/mediamtx.yml
paths:
  live/~^[a-zA-Z0-9_-]+$:
    # Single source RTSP input
    source: rtsp://camera-gateway/${MATCH}
    sourceProtocol: rtsp
    sourceOnDemand: true
    
    # On-demand: Start only when first viewer connects
    runOnDemand: /usr/local/bin/start-camera-stream.sh ${MATCH}
    runOnDemandCloseAfter: 30s
    
    # Multiple output protocols from SINGLE decode
    # WebRTC for web dashboard (< 500ms latency)
    webrtcEnabled: true
    webrtcICEServers: 
      - stun:stun.l.google.com:19302
    
    # HLS for mobile apps
    hlsEnabled: true
    hlsSegmentCount: 6
    hlsSegmentDuration: 2s
    
    # RTMP for broadcast
    rtmpEnabled: true
    
    # Authentication
    readUser: vms-viewer
    readPass: ${VMS_STREAM_PASSWORD}
    readIPs: ['10.0.0.0/8', '192.168.0.0/16']

# Performance: mediamtx can handle 100+ concurrent viewers per stream
# with minimal CPU overhead (Go-based, highly efficient)
```

---

### ✅ **Giải pháp 4: Adaptive Bitrate & Smart Quality**

```python
class AdaptiveBitrateController:
    """
    Điều chỉnh bitrate dựa trên:
    1. Scene complexity (moving objects)
    2. Network conditions
    3. Viewer device capabilities
    """
    
    def __init__(self):
        self.scene_analyzer = SceneComplexityAnalyzer()
        self.network_monitor = NetworkMonitor()
    
    async def calculate_optimal_bitrate(self, camera_id, viewer_session):
        """
        Tính toán bitrate tối ưu cho từng viewer
        """
        
        # 1. Analyze scene complexity
        complexity = await self.scene_analyzer.analyze(camera_id)
        # complexity = 0.0-1.0 (0=static, 1=high motion)
        
        # 2. Check network conditions
        network_quality = await self.network_monitor.get_quality(
            viewer_session.client_ip
        )
        # RTT, packet loss, available bandwidth
        
        # 3. Device capabilities
        device_profile = self.get_device_profile(viewer_session.user_agent)
        
        # 4. Calculate bitrate
        base_bitrate = 1000  # 1Mbps default
        
        # Adjust for scene complexity
        if complexity < 0.3:  # Static scene (parking lot at night)
            bitrate = base_bitrate * 0.5  # 500kbps sufficient
        elif complexity > 0.7:  # High motion (traffic intersection)
            bitrate = base_bitrate * 1.5  # 1.5Mbps needed
        else:
            bitrate = base_bitrate
        
        # Adjust for network conditions
        if network_quality['rtt'] > 100:  # High latency
            bitrate *= 0.8
        if network_quality['packet_loss'] > 0.02:  # > 2% loss
            bitrate *= 0.7
        
        # Cap by device capability
        bitrate = min(bitrate, device_profile['max_bitrate'])
        
        return {
            'bitrate': int(bitrate),
            'resolution': self.select_resolution(bitrate, device_profile),
            'fps': self.select_fps(bitrate, complexity),
            'reasoning': {
                'scene_complexity': complexity,
                'network_quality': network_quality,
                'device': device_profile['type']
            }
        }
    
    def select_resolution(self, bitrate, device_profile):
        """
        Select appropriate resolution based on bitrate
        """
        if device_profile['type'] == 'mobile':
            if bitrate < 500:
                return '360p'
            elif bitrate < 1000:
                return '480p'
            else:
                return '720p'
        else:  # desktop
            if bitrate < 800:
                return '480p'
            elif bitrate < 1500:
                return '720p'
            else:
                return '1080p'
    
    def select_fps(self, bitrate, complexity):
        """
        Lower FPS for low-motion scenes to save bandwidth
        """
        if complexity < 0.3 and bitrate < 800:
            return 15  # 15fps cho static scenes
        else:
            return 30  # 30fps cho normal/high motion

# Savings example:
# Static camera at night: 500kbps thay vì 2Mbps (75% savings)
# 50 static cameras × 1.5Mbps saved = 75Mbps saved
```

---

### ✅ **Giải pháp 5: Edge Computing Architecture**

**Deploy lightweight processing tại edge để giảm load trên central servers**

```
┌─────────────────────────────────────────────────────────┐
│  Camera Network (200 cameras)                           │
│  Grouped by location into 5 zones                       │
└─────────────────────────────────────────────────────────┘
            │         │         │         │         │
            ▼         ▼         ▼         ▼         ▼
      ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
      │ Edge    │ │ Edge    │ │ Edge    │ │ Edge    │ │ Edge    │
      │ Node 1  │ │ Node 2  │ │ Node 3  │ │ Node 4  │ │ Node 5  │
      │         │ │         │ │         │ │         │ │         │
      │ 40 cams │ │ 40 cams │ │ 40 cams │ │ 40 cams │ │ 40 cams │
      └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
            │         │         │         │         │
            └─────────┴─────────┴─────────┴─────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Central VMS Core  │
                    │  (Aggregation +    │
                    │   Management)      │
                    └────────────────────┘
```

**Edge Node Responsibilities:**
```python
class EdgeNode:
    """
    Lightweight processing at network edge
    Handles 40 cameras per node
    """
    
    def __init__(self, node_id, camera_ids):
        self.node_id = node_id
        self.cameras = camera_ids
        self.local_storage = LocalStorageManager()  # SSD cache
    
    async def process_cameras(self):
        """
        Edge node tasks:
        1. Recording main stream to local storage
        2. Generate sub-stream only when needed (on-demand)
        3. Basic motion detection
        4. Thumbnail generation
        5. Sync to central storage periodically
        """
        
        tasks = []
        for camera_id in self.cameras:
            tasks.append(self.process_single_camera(camera_id))
        
        await asyncio.gather(*tasks)
    
    async def process_single_camera(self, camera_id):
        """
        Per-camera processing at edge
        """
        camera = await self.get_camera_config(camera_id)
        
        # 1. Record main stream locally (always on)
        recording_task = self.record_main_stream(
            camera_id, 
            camera['rtsp_url_main'],
            self.local_storage.get_path(camera_id)
        )
        
        # 2. Sub-stream on-demand only
        # (Started by central controller when viewer requests)
        
        # 3. Lightweight AI processing
        ai_task = self.run_edge_ai(camera_id)
        
        await asyncio.gather(recording_task, ai_task)
    
    async def run_edge_ai(self, camera_id):
        """
        Lightweight AI at edge:
        - Motion detection (CPU-based, simple)
        - Object counting (lightweight YOLO)
        - Alert generation
        
        Heavy AI (LPR, detailed analytics) done at central
        """
        pass
    
    async def sync_to_central(self):
        """
        Periodic sync to central storage:
        - Upload completed segments
        - Send AI events/alerts
        - Receive configuration updates
        """
        pass

# Benefits of edge architecture:
# 1. Bandwidth: Only 40 cameras × 4Mbps = 160Mbps per edge node
#    Central uplink: Only metadata + on-demand streams
# 2. Latency: Local recording continues even if central is down
# 3. Scalability: Add more edge nodes as cameras grow
# 4. Cost: Commodity hardware at edge, premium at central
```

---

## 📊 **Combined Optimization Results**

### **Before Optimization**
```yaml
Recording (Main Stream):
  Cameras: 200
  Bitrate: 4Mbps each
  Total: 800Mbps ingress
  CPU: 40% per camera (copy mode) = 8000% total
  Storage Write: 100MB/s

Live Streaming (Sub Stream - Always On):
  Cameras: 200
  Bitrate: 2Mbps each  
  Total: 400Mbps additional
  CPU: 20% per camera (transcode) = 4000% total
  
Total Resource Usage:
  Bandwidth: 1.2Gbps
  CPU: 12000% (120 CPU cores needed!)
  Storage: 100MB/s write
```

### **After Optimization**
```yaml
Recording (Main Stream):
  Cameras: 200
  Bitrate: 4Mbps each (unchanged)
  Total: 800Mbps ingress
  CPU: 40% per camera (copy mode) = 8000% total (unchanged)
  Storage Write: 100MB/s

Live Streaming (Sub Stream - On-Demand + Optimized):
  Active Streams: 40 (20% of cameras, based on real usage)
  Shared Streams: 1 stream per camera (multicast to multiple viewers)
  Hardware Acceleration: NVENC/QSV
  Adaptive Bitrate: 500kbps-1.5Mbps based on scene
  
  Bandwidth: 40 cameras × 1Mbps avg = 40Mbps
  CPU: Minimal (hardware encoding)
  GPU: 40 cameras × 2% = 80% of 1 GPU card
  
Total Resource Usage:
  Bandwidth: 840Mbps (30% reduction)
  CPU: 8000% (33% reduction)
  GPU: 1 card (NVIDIA T4 ~$2000)
  Storage: 100MB/s write

Cost Savings:
  Hardware: 90 fewer CPU cores needed = ~$30k saved
  Power: 40% reduction = ~$500/month saved
  Bandwidth: Can use 1Gbps instead of 10Gbps uplink
```

### **Scalability Impact**
```python
def compare_architectures(num_cameras):
    """
    Compare resource requirements
    """
    
    # Original architecture
    original = {
        'bandwidth_mbps': num_cameras * 6,  # 4+2 Mbps
        'cpu_cores': num_cameras * 0.6,  # 0.4+0.2
        'gpu_cards': 0
    }
    
    # Optimized architecture
    active_ratio = 0.2  # 20% cameras being viewed
    optimized = {
        'bandwidth_mbps': num_cameras * 4 + (num_cameras * active_ratio * 1),
        'cpu_cores': num_cameras * 0.4,  # Only recording
        'gpu_cards': math.ceil(num_cameras * active_ratio * 0.02 / 0.9)  # 90% GPU util
    }
    
    return {
        'original': original,
        'optimized': optimized,
        'savings': {
            'bandwidth_pct': (1 - optimized['bandwidth_mbps'] / original['bandwidth_mbps']) * 100,
            'cpu_pct': (1 - optimized['cpu_cores'] / original['cpu_cores']) * 100,
            'cost_usd': (original['cpu_cores'] - optimized['cpu_cores']) * 300  # $300 per core
        }
    }

# For 200 cameras:
# Bandwidth: 840Mbps vs 1200Mbps (30% savings)
# CPU: 80 cores vs 120 cores (33% savings)  
# GPU: 1 card vs 0 cards ($2k investment for massive CPU savings)
# Total savings: ~$15k in hardware + $6k/year in power
```

---

## 🎯 **Implementation Roadmap**

### **Phase 1: Quick Wins (Week 1-2)**
```yaml
1. Implement On-Demand Sub-Streams:
   - Modify recording engine to start/stop sub-streams dynamically
   - Add viewer counting in streaming gateway
   - Expected savings: 70-80% bandwidth immediately
   
2. Enable Hardware Acceleration:
   - Install NVIDIA T4 GPU or use Intel QSV
   - Update FFmpeg to use h264_nvenc/h264_qsv
   - Expected savings: 60% CPU for transcoding
```

### **Phase 2: Shared Streaming (Week 3-4)**
```yaml
3. Deploy mediamtx for Stream Sharing:
   - Replace individual transcoding with shared relay
   - Configure WebRTC/HLS multi-output
   - Expected savings: Additional 50% CPU reduction
   
4. Implement Adaptive Bitrate:
   - Add scene complexity analyzer
   - Network quality monitor
   - Dynamic bitrate adjustment
   - Expected savings: 20-40% bandwidth depending on content
```

### **Phase 3: Edge Architecture (Week 5-8)**
```yaml
5. Deploy Edge Nodes:
   - Group cameras by location (5 zones)
   - Install edge processing nodes
   - Configure local recording + sync
   - Expected benefits: Better reliability, lower central bandwidth
```

### **Testing & Validation**
```python
# Performance tests to run after each phase
test_scenarios = [
    {
        'name': 'Baseline Load',
        'cameras_recording': 200,
        'concurrent_viewers': 50,
        'expected_bandwidth_mbps': 840,
        'expected_cpu_percent': 400,  # 4 cores @ 100%
        'expected_gpu_percent': 40
    },
    {
        'name': 'Peak Load',
        'cameras_recording': 200,
        'concurrent_viewers': 200,
        'expected_bandwidth_mbps': 1000,
        'expected_cpu_percent': 400,
        'expected_gpu_percent': 80
    },
    {
        'name': 'Node Failure',
        'scenario': 'Edge node fails, cameras reassigned',
        'expected_recovery_time_sec': 60,
        'expected_data_loss': 'none'
    }
]
```

