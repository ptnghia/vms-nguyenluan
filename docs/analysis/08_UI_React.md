# 08_UI_React.md

## 🎯 Giao diện chuyên biệt cho An ninh & Giao thông

### 📊 **Live Monitoring Dashboard**
- **Multi-camera grid view**: 4x4, 6x6, 8x8 layout với responsive design
- **Real-time status indicators**: Online/offline, recording, alerts
- **Quick camera switching**: Double-click to fullscreen, drag to reorder
- **Live event overlay**: Motion detection, LPR results, violations
- **Emergency mode**: One-click access to critical camera feeds

### 🎥 **Advanced Live Viewing**
- **Ultra-low latency WebRTC** cho emergency response (< 500ms)
- **Adaptive streaming**: Tự động switch quality dựa trên bandwidth
- **PTZ controls**: Pan/tilt/zoom với preset positions
- **Digital zoom & enhancement**: Zoom vào vùng quan tâm
- **Live recording**: One-click record important events

### 📱 **Mobile-First Design**
- **Progressive Web App (PWA)**: Install như native app
- **Touch-optimized controls**: Swipe, pinch-to-zoom, long-press
- **Offline capability**: Cache critical data và recent footage
- **GPS integration**: Hiển thị camera gần nhất dựa trên vị trí

## 🧰 Công nghệ Stack
- **React 18** với Concurrent Features
- **TypeScript** cho type safety
- **WebRTC APIs** cho ultra-low latency streaming
- **HLS.js** cho adaptive streaming trên mobile
- **Socket.IO** cho real-time events và notifications  
- **React Query** cho efficient data fetching
- **Zustand** cho lightweight state management
- **Tailwind CSS** cho responsive UI
## 🎮 Giao diện Components chi tiết

### 🖥️ **LiveDashboard Component**
```typescript
interface LiveDashboardProps {
  layout: '2x2' | '3x3' | '4x4' | '6x6' | '8x8';
  cameras: Camera[];
  selectedCameras: string[];
  onCameraSelect: (cameraId: string) => void;
  onLayoutChange: (layout: string) => void;
}

const LiveDashboard: React.FC<LiveDashboardProps> = ({
  layout, cameras, selectedCameras, onCameraSelect, onLayoutChange
}) => {
  // Real-time stream management
  const { streams, startStream, stopStream } = useWebRTCStreams();
  const { events } = useRealtimeEvents(); // Socket.IO integration
  
  return (
    <div className="grid-layout" data-layout={layout}>
      {selectedCameras.map(cameraId => (
        <CameraFeed 
          key={cameraId}
          cameraId={cameraId}
          stream={streams[cameraId]}
          events={events.filter(e => e.camera_id === cameraId)}
          onDoubleClick={() => openFullscreen(cameraId)}
        />
      ))}
    </div>
  );
};
```

### 📹 **CameraFeed Component**
```typescript
interface CameraFeedProps {
  cameraId: string;
  stream: WebRTCStream | HLSStream;
  events: Event[];
  quality: 'auto' | '720p' | '480p' | '360p';
  onDoubleClick: () => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  cameraId, stream, events, quality, onDoubleClick 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isRecording, startRecording, stopRecording } = useLocalRecording();
  
  // WebRTC hoặc HLS stream setup
  useEffect(() => {
    if (stream?.type === 'webrtc') {
      setupWebRTCStream(videoRef.current, stream);
    } else if (stream?.type === 'hls') {
      setupHLSStream(videoRef.current, stream);
    }
  }, [stream]);
  
  return (
    <div className="camera-feed" onDoubleClick={onDoubleClick}>
      <video ref={videoRef} autoPlay muted playsInline />
      
      {/* Live overlays */}
      <div className="overlay">
        <CameraStatus camera={stream.camera} />
        <LiveEventOverlay events={events} />
        <PTZControls cameraId={cameraId} />
        
        {/* Recording indicator */}
        {isRecording && <RecordingIndicator />}
      </div>
      
      {/* Controls */}
      <div className="controls">
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? '⏹️' : '🔴'}
        </button>
        <QualitySelector value={quality} onChange={setQuality} />
        <FullscreenButton onClick={onDoubleClick} />
      </div>
    </div>
  );
};
```
