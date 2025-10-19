# 14_Live_Streaming_Architecture_LAN.md

## 🎯 Use Case Thực Tế: Trung Tâm Giám Sát 24/7

### **Yêu Cầu Cụ Thể:**
```yaml
Live Viewing:
  Thời gian: 24/7 (không phải on-demand)
  Số camera xem đồng thời: Lên tới 200 cameras (100%)
  Vị trí: Trung tâm giám sát cùng LAN với VMS
  Hiển thị: Video wall với multi-monitor (16-64 cameras/screen)
  Người dùng: Nhân viên giám sát ca trực
  
Network Context:
  Trung tâm ↔ VMS: Gigabit LAN (1-10Gbps)
  Trung tâm ↔ Camera: Cùng VLAN hoặc routed
  Latency: < 5ms (internal network)
  Bandwidth: Không bị giới hạn như WAN
```

---

## 🏗️ **Kiến Trúc Live Streaming - 3 Options**

### **Option 1: Direct RTSP Connection (RECOMMENDED cho LAN)**

```
┌─────────────────────────────────────────────────────────────┐
│           Trung Tâm Giám Sát (Video Wall)                   │
│                                                               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│   │Monitor 1 │  │Monitor 2 │  │Monitor 3 │  ...            │
│   │16 cameras│  │16 cameras│  │16 cameras│                 │
│   └──────────┘  └──────────┘  └──────────┘                 │
│                                                               │
│   PC Client (VLC/FFmpeg/Custom Player)                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ Direct RTSP (no VMS relay)
                        │ rtsp://192.168.10.101:554/stream1
                        │
            ┌───────────▼──────────────┐
            │    Camera Network        │
            │    VLAN 10               │
            │    192.168.10.0/24       │
            └──────────────────────────┘
                    │   │   │
            ┌───────┘   │   └───────┐
            ▼           ▼           ▼
        [Camera 1] [Camera 2] ... [Camera 200]


VMS Server (Separate Process):
  └─> Recording Main Stream to Storage (không ảnh hưởng Live)
```

**Ưu điểm:**
- ✅ **Zero CPU overhead** trên VMS server (VMS chỉ lo recording)
- ✅ **Lowest latency** (< 200ms) - direct connection
- ✅ **No bandwidth bottleneck** - mỗi client direct connect camera
- ✅ **No single point of failure** - camera down không ảnh hưởng VMS
- ✅ **Simplest architecture** - ít moving parts nhất

**Nhược điểm:**
- ⚠️ Client phải có quyền access camera network (VLAN routing)
- ⚠️ Authentication phức tạp hơn (mỗi camera có credential riêng)
- ⚠️ Không có centralized control/monitoring

---

### **Option 2: VMS RTSP Relay (ZERO Transcode)**

```
┌─────────────────────────────────────────────────────────────┐
│           Trung Tâm Giám Sát (Video Wall)                   │
│                                                               │
│   PC Client → VMS Web UI                                     │
│   rtsp://vms-server:8554/live/cam001                        │
└───────────────────────┬─────────────────────────────────────┘
                        │ RTSP over LAN
                        │ NO transcoding
                        │
            ┌───────────▼──────────────┐
            │   VMS Streaming Gateway  │
            │   (mediamtx relay)       │
            │   RTSP Proxy Only        │
            │   CPU: ~1% per stream    │
            └───────────┬──────────────┘
                        │ RTSP
                        │
            ┌───────────▼──────────────┐
            │    Camera Network        │
            │    VLAN 10               │
            └──────────────────────────┘
                    │   │   │
            ┌───────┘   │   └───────┐
            ▼           ▼           ▼
        [Camera 1] [Camera 2] ... [Camera 200]


VMS Recording Engine (Separate):
  └─> Recording to Storage
```

**Flow:**
```
Camera RTSP → VMS Relay → Client
           (copy mode)  (RTSP)
```

**Ưu điểm:**
- ✅ **Centralized management** - VMS control access, permissions
- ✅ **Single authentication point** - client chỉ auth với VMS
- ✅ **Nearly zero CPU** - chỉ relay packets, không transcode
- ✅ **Bandwidth efficient** - VMS multicast cho nhiều viewers
- ✅ **Security** - camera network isolated, chỉ VMS access

**Nhược điểm:**
- ⚠️ VMS là single point of failure (cần HA setup)
- ⚠️ Thêm ~50ms latency (acceptable cho monitoring)
- ⚠️ VMS server bandwidth: 200 cameras × 2Mbps = 400Mbps

---

### **Option 3: Hybrid - Best of Both Worlds (RECOMMENDED)**

```
┌──────────────────────────────────────────────────────────┐
│         Trung Tâm Giám Sát (Video Wall)                  │
│                                                            │
│  ┌─────────────────────────────────────────┐             │
│  │ VMS Web UI (Management Interface)       │             │
│  │  - Camera selection                     │             │
│  │  - Layout configuration                 │             │
│  │  - User authentication                  │             │
│  │  - Event overlays                       │             │
│  └─────────────────────────────────────────┘             │
│                    │                                      │
│                    │ Get RTSP URLs                        │
│                    ▼                                      │
│  ┌─────────────────────────────────────────┐             │
│  │ Direct RTSP Player (FFmpeg/VLC)        │             │
│  │  - Connect trực tiếp tới camera        │             │
│  │  - VMS chỉ cung cấp URLs + auth tokens │             │
│  └─────────────────────────────────────────┘             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Direct RTSP
                     ▼
         ┌─────────────────────┐
         │   Camera Network    │
         └─────────────────────┘


VMS Server:
  ├─> Provide camera list, URLs, auth tokens (API)
  ├─> Recording main stream (parallel, independent)
  ├─> Event detection & overlays (AI workers)
  └─> Relay for remote access only (WebRTC/HLS)
```

**Architecture:**
```javascript
// Client workflow
1. User login to VMS Web UI
2. VMS authenticates user, checks permissions
3. VMS returns list of cameras user can access
4. VMS generates temporary RTSP credentials for each camera
5. Client connects DIRECTLY to cameras using these credentials
6. VMS provides event overlays via WebSocket (non-video data)

// For remote access (mobile, outside network)
1. Client cannot reach camera network directly
2. VMS transcodes to WebRTC/HLS
3. Serve through VMS streaming gateway
```

**Ưu điểm:**
- ✅ **Best performance** - Direct RTSP cho LAN viewers
- ✅ **Best security** - Centralized auth via VMS
- ✅ **Best scalability** - VMS không bottleneck bandwidth
- ✅ **Flexible** - Support both LAN và remote access
- ✅ **Smart overlays** - VMS cung cấp event data overlay

**Implementation:**
```python
# VMS API endpoint
@app.get('/api/live/cameras/{camera_id}/rtsp')
async def get_camera_rtsp_url(camera_id: str, user: User = Depends(get_current_user)):
    """
    Return direct RTSP URL with temporary credentials
    """
    # Check permissions
    camera = await db.cameras.find_by_id(camera_id)
    if not user.has_access_to_zone(camera.zone_id):
        raise HTTPException(403, "Access denied")
    
    # Generate temporary camera credentials (valid 1 hour)
    temp_credentials = await generate_temp_camera_credentials(camera_id, user.id)
    
    # Return direct RTSP URL
    return {
        "camera_id": camera_id,
        "rtsp_url": f"rtsp://{temp_credentials.username}:{temp_credentials.password}@{camera.ip}:554/stream1",
        "expires_at": temp_credentials.expires_at,
        "recommended_player": "ffplay",  # or VLC
        "stream_type": "main_stream",
        "resolution": "1920x1080",
        "fps": 30,
        "bitrate": "4Mbps"
    }

@app.websocket('/ws/events/{camera_id}')
async def camera_events_websocket(websocket: WebSocket, camera_id: str):
    """
    Send real-time events for overlay on video
    (motion detection, LPR results, etc.)
    """
    await websocket.accept()
    
    # Subscribe to camera events
    async for event in event_stream(camera_id):
        await websocket.send_json({
            "type": event.type,
            "timestamp": event.timestamp,
            "data": event.data,
            "bbox": event.bounding_box  # For overlay rendering
        })
```

---

## 📊 **Bandwidth & Resource Analysis**

### **Scenario: 200 Cameras Live 24/7 tại Trung Tâm**

#### **Option 1: Direct RTSP**
```yaml
Camera Network:
  Total cameras: 200
  Stream per camera: Sub-stream (720p @ 2Mbps)
  Total bandwidth: 200 × 2Mbps = 400Mbps
  
  Where bandwidth used:
    - Camera → Switch: 400Mbps aggregate
    - Switch → Client PCs: Distributed (each PC gets ~32Mbps for 16 cameras)
  
VMS Server Impact:
  CPU: 0% (không relay)
  Network: 800Mbps (chỉ recording main stream)
  
Client PC Requirements:
  Network: 32Mbps (16 cameras × 2Mbps)
  CPU: 20-30% (decoding 16 H.264 streams)
  GPU: Recommended for hardware decoding
  RAM: 4GB minimum
```

#### **Option 2: VMS RTSP Relay**
```yaml
VMS Streaming Gateway:
  Ingress: 200 cameras × 2Mbps = 400Mbps
  Egress: 4 clients × 200 cameras × 2Mbps = 1.6Gbps (worst case)
  
  With multicast/shared streams:
    Egress: 400Mbps (same stream shared to multiple clients)
  
  CPU per stream: ~1% (relay only)
  Total CPU: 200% (2 cores at 100%)
  Memory: 400MB (2MB per stream buffer)
  
  Server Requirements:
    CPU: 4 cores minimum
    RAM: 8GB
    Network: 10Gbps NIC (for safety margin)
```

#### **Option 3: Hybrid (RECOMMENDED)**
```yaml
Normal Operation (LAN viewing):
  VMS Load:
    - API calls: Minimal (<1% CPU)
    - WebSocket events: <5% CPU
    - Recording: 40% CPU per 40 cameras (existing)
    - Total: Same as Option 1
  
  Client Direct Connect:
    - Same as Option 1
  
Remote Access (occasional):
  VMS transcodes only for remote clients:
    - 5-10 remote viewers: ~20% GPU (NVENC)
    - Bandwidth: 5-10 × 2Mbps = 20Mbps WAN
```

---

## 🎯 **Khuyến Nghị: HYBRID APPROACH**

### **Lý do:**

1. **Performance tốt nhất cho LAN**
   - Direct RTSP = lowest latency
   - No VMS bottleneck
   - Scale to 200 cameras without VMS load

2. **Bảo mật tốt**
   - Centralized authentication qua VMS
   - Temporary credentials for cameras
   - Fine-grained access control

3. **Linh hoạt**
   - LAN: Direct RTSP (best performance)
   - Remote: VMS transcode (when needed)
   - Mobile: HLS/WebRTC (adaptive)

4. **Chi phí thấp**
   - Không cần GPU cho live streaming LAN
   - VMS server không cần 10Gbps NIC
   - Client PC requirements lower

---

## 🔧 **Implementation Details**

### **VMS Server Configuration**
```yaml
# /etc/vms/streaming.yml
streaming:
  lan_mode: "direct_rtsp"  # Clients connect direct to cameras
  wan_mode: "transcode"    # Transcode for remote access
  
  direct_rtsp:
    enabled: true
    temp_credential_duration: 3600  # 1 hour
    allowed_networks: ["10.0.0.0/8", "192.168.0.0/16"]
    
  relay_mode:
    enabled: false  # Disabled for LAN (optional)
    max_streams: 200
    
  transcode_mode:
    enabled: true
    triggers:
      - source_ip_not_in_lan
      - client_type: mobile
      - low_bandwidth_detected
    protocols: ["webrtc", "hls"]
    gpu_acceleration: true
```

### **Client Player (Example - FFmpeg based)**
```javascript
// React component for video wall
import React, { useEffect, useRef } from 'react';

const CameraPlayer = ({ cameraId }) => {
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  
  useEffect(() => {
    const initPlayer = async () => {
      // 1. Get RTSP URL from VMS
      const response = await fetch(`/api/live/cameras/${cameraId}/rtsp`);
      const { rtsp_url } = await response.json();
      
      // 2. Use FFmpeg.js or external player
      // Option A: FFmpeg.js (browser-based)
      const player = new FFmpegPlayer(videoRef.current);
      player.play(rtsp_url);
      
      // Option B: External VLC/FFplay (better performance)
      // Client runs VLC/FFplay as separate process
      // This component just shows the window
      
      // 3. Connect WebSocket for event overlays
      wsRef.current = new WebSocket(`/ws/events/${cameraId}`);
      wsRef.current.onmessage = (event) => {
        const eventData = JSON.parse(event.data);
        renderOverlay(eventData);  // Draw bbox, text, etc.
      };
    };
    
    initPlayer();
    
    return () => {
      wsRef.current?.close();
    };
  }, [cameraId]);
  
  return (
    <div className="camera-feed">
      <video ref={videoRef} />
      <canvas id="overlay-canvas" />  {/* For event overlays */}
    </div>
  );
};
```

### **Video Wall Application (Electron)**
```javascript
// Electron app for optimal performance
const { BrowserWindow, app } = require('electron');
const { spawn } = require('child_process');

class VideoWallApp {
  constructor() {
    this.ffplayProcesses = [];
  }
  
  async playCamera(cameraId, x, y, width, height) {
    // Get RTSP URL from VMS
    const rtspUrl = await this.getRTSPUrl(cameraId);
    
    // Spawn FFplay process for this camera
    const ffplay = spawn('ffplay', [
      '-i', rtspUrl,
      '-x', width,
      '-y', height,
      '-left', x,
      '-top', y,
      '-noborder',
      '-alwaysontop',
      '-rtsp_transport', 'tcp',
      '-fflags', 'nobuffer',
      '-flags', 'low_delay',
      '-framedrop'
    ]);
    
    this.ffplayProcesses.push(ffplay);
  }
  
  async setupVideoWall(layout = '4x4') {
    const cameras = await this.getCameraList();
    const [cols, rows] = layout.split('x').map(Number);
    
    const windowWidth = 1920;
    const windowHeight = 1080;
    const cellWidth = windowWidth / cols;
    const cellHeight = windowHeight / rows;
    
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (index >= cameras.length) break;
        
        await this.playCamera(
          cameras[index].id,
          col * cellWidth,
          row * cellHeight,
          cellWidth,
          cellHeight
        );
        
        index++;
      }
    }
  }
}

// Usage
const app = new VideoWallApp();
app.setupVideoWall('8x8');  // 64 cameras on one screen
```

---

## 💡 **Best Practices**

### **Network Setup**
```yaml
# Ensure camera network is reachable from monitoring center
Firewall Rules:
  - Allow monitoring_center_subnet → camera_vlan:554 (RTSP)
  - Allow vms_server → camera_vlan:554 (for recording)
  - Block camera_vlan → internet
  - Block camera_vlan → other_vlans (except VMS)

Bandwidth Allocation:
  Camera VLAN: 1Gbps (200 cameras × 2Mbps = 400Mbps + headroom)
  Monitoring Center: 1Gbps (sufficient for 200 streams)
  VMS Recording: 1Gbps (200 cameras × 4Mbps = 800Mbps)
  
QoS:
  Camera → Monitoring: High priority
  Camera → VMS Recording: High priority
  Other traffic: Normal priority
```

### **Client PC Specifications**
```yaml
For 16 cameras per screen:
  CPU: Intel i5 10th gen or better
  RAM: 8GB minimum, 16GB recommended
  GPU: NVIDIA GTX 1050 or better (for hardware decode)
  Network: Gigabit Ethernet
  Storage: 256GB SSD (for OS and apps)
  
For 64 cameras per screen:
  CPU: Intel i7 12th gen or AMD Ryzen 7
  RAM: 16GB minimum, 32GB recommended
  GPU: NVIDIA GTX 1660 or better
  Network: Gigabit Ethernet
  Multiple monitors: 4K monitors recommended
```

### **Monitoring & Alerts**
```yaml
Monitor These Metrics:
  - Camera RTSP availability (ping test every 30s)
  - Network bandwidth utilization
  - Client PC resource usage
  - Stream quality (resolution, bitrate, fps)
  - Latency between camera and client
  
Alert When:
  - Camera becomes unreachable
  - Network bandwidth > 80%
  - Client PC CPU > 90% for 5 minutes
  - Stream drops below 20fps
  - Latency > 500ms
```

---

## 📈 **Comparison Summary**

| Aspect | Direct RTSP | VMS Relay | Hybrid |
|--------|-------------|-----------|---------|
| **Latency** | ~200ms (best) | ~250ms | ~200ms (LAN) |
| **VMS CPU** | 0% | ~200% | 0% (LAN) |
| **VMS Bandwidth** | 0 (800Mbps recording only) | 400Mbps in + 400Mbps out | 0 (LAN) |
| **Single Point of Failure** | No | Yes (VMS) | No (LAN) |
| **Security** | Camera-level auth | VMS auth | VMS auth |
| **Management** | Manual | Centralized | Centralized |
| **Remote Access** | Difficult | Easy | Easy |
| **Scalability** | Excellent | Limited by VMS | Excellent |
| **Complexity** | Low | Medium | Medium |
| **Recommendation** | Good | Acceptable | **BEST** |

---

## ✅ **Final Recommendation**

### **Cho Trung Tâm Giám Sát của bạn:**

**✅ Sử dụng HYBRID APPROACH:**

1. **Live viewing tại trung tâm (24/7, 200 cameras):**
   - Client connect **trực tiếp tới camera** qua RTSP
   - VMS chỉ cung cấp camera list, URLs, và temporary credentials
   - VMS gửi event overlays qua WebSocket (không phải video)
   - **Zero load** trên VMS streaming gateway

2. **Recording (VMS):**
   - VMS recording **main stream** (1080p) từ cameras
   - Hoàn toàn độc lập với live viewing
   - Không ảnh hưởng performance live view

3. **Remote access (mobile, ngoài LAN):**
   - VMS transcode sang WebRTC/HLS khi cần
   - Chỉ cho remote users (không phải trung tâm)

### **Lợi ích:**
- ✅ **Xem được 200 cameras 24/7** không vấn đề gì
- ✅ **Latency thấp nhất** (~200ms) vì direct connection
- ✅ **VMS không bị overload** vì không relay video
- ✅ **Dễ scale** - thêm cameras không ảnh hưởng performance
- ✅ **Chi phí thấp** - không cần GPU/10GbE cho live streaming

**Hệ thống này hoàn toàn đảm bảo cho yêu cầu của bạn! 🎯**
