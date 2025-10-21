# 06_Streaming_Gateway.md

## 🎯 Chức năng Live Streaming
- **Ultra-low latency streaming** (< 500ms) cho emergency response
- **Multi-protocol support**: WebRTC, HLS, RTMP, SRT
- **Adaptive bitrate streaming** dựa trên network conditions
- **Load balancing** cho multiple concurrent viewers
- **Stream authentication & authorization**
- **CDN integration** cho mobile/remote access
- **Recording integration**: Live + playback seamless switching

## 🧰 Công nghệ Stack
- **mediamtx (rtsp-simple-server)** - RTSP relay server (Go)
- **Node.js** - WebRTC signaling server
- **FFmpeg** - Stream transcoding và format conversion
- **nginx-rtmp-module** - RTMP streaming support
- **Redis** - Stream session caching
- **WebRTC** - Ultra-low latency cho web clients
- **HLS.js** - Adaptive streaming cho mobile

## 📡 Live Streaming Architecture & Flow

### 🎬 Streaming Pipeline
```
Camera RTSP → mediamtx Relay → Multi-format Output
                   ↓
            ┌─── WebRTC (< 500ms) ──→ Web Dashboard
            ├─── HLS (2-5s delay) ──→ Mobile Apps  
            ├─── RTMP ─────────────→ Emergency Broadcast
            └─── SRT ──────────────→ Remote Monitoring
```

### 🌐 Multi-Protocol Support

**WebRTC (Ultra Low Latency)**
```javascript
// WebRTC streaming cho dashboard monitoring
const streamConfig = {
  camera_id: "cam_001",
  protocol: "webrtc",
  quality: "720p",
  auth_token: "jwt_token"
};

// ICE candidate exchange với STUN/TURN servers
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "turn:turn.example.com", username: "user", credential: "pass" }
];
```

**HLS (Adaptive Streaming)**
```bash
# Multi-bitrate HLS generation
ffmpeg -i rtsp://localhost:8554/live/cam1 \
  -filter_complex "[0:v]split=3[v1][v2][v3]; \
   [v1]scale=1280:720[720p]; [v2]scale=854:480[480p]; [v3]scale=640:360[360p]" \
  -map "[720p]" -c:v libx264 -b:v 2M -maxrate 2.4M -bufsize 1.2M \
    -hls_time 2 -hls_list_size 6 -hls_flags delete_segments \
    /var/www/hls/cam1_720p.m3u8 \
  -map "[480p]" -c:v libx264 -b:v 1M -maxrate 1.2M -bufsize 600k \
    -hls_time 2 -hls_list_size 6 -hls_flags delete_segments \
    /var/www/hls/cam1_480p.m3u8 \
  -map "[360p]" -c:v libx264 -b:v 500k -maxrate 600k -bufsize 300k \
    -hls_time 2 -hls_list_size 6 -hls_flags delete_segments \
    /var/www/hls/cam1_360p.m3u8
```

### 🔐 Stream Authentication
```javascript
// JWT-based stream access control
app.get('/live/:camera_id/webrtc', authenticate, authorize, (req, res) => {
  const { camera_id } = req.params;
  const user = req.user;
  
  // Check user permissions for this camera/zone
  if (!hasAccessToCamera(user, camera_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Generate temporary stream token
  const streamToken = generateStreamToken(camera_id, user.id);
  
  res.json({
    webrtc_url: `wss://stream.example.com/webrtc/${camera_id}`,
    ice_servers: getIceServers(),
    stream_token: streamToken,
    expires_in: 3600
  });
});
```

### 📱 Multi-Device Support
```javascript
// Adaptive streaming dựa trên device capabilities
const getOptimalStream = (userAgent, networkSpeed) => {
  const isMobile = /Mobile|Android|iPhone/.test(userAgent);
  const isSlowNetwork = networkSpeed < 1000; // kbps
  
  if (isMobile || isSlowNetwork) {
    return {
      protocol: 'hls',
      quality: '480p',
      bitrate: '1M'
    };
  }
  
  return {
    protocol: 'webrtc',
    quality: '720p', 
    bitrate: '2M'
  };
};
```

### 🚀 Load Balancing & CDN
```yaml
# Nginx load balancer configuration
upstream streaming_servers {
    server stream1.example.com:8554 weight=3;
    server stream2.example.com:8554 weight=3;
    server stream3.example.com:8554 weight=2;
}

# Geographic load balancing
geo $geo {
    default         hcm;
    1.0.0.0/8       hanoi;
    14.0.0.0/8      hcm;
    27.0.0.0/8      danang;
}

# CDN edge caching
location /hls/ {
    alias /var/www/hls/;
    expires 10s;
    add_header Cache-Control "public, max-age=10";
    add_header Access-Control-Allow-Origin "*";
}
```
