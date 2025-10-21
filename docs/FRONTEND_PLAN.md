# Frontend Development Plan - Phase 7

**Date:** October 20, 2025  
**Status:** Planning  
**Target:** Complete web frontend for VMS system

---

## 📊 **CURRENT STATUS**

```yaml
Status: ❌ NOT STARTED
Directory: services/frontend/ (does not exist)
Dependencies: Phase 6 API Backend completion
```

---

## 🎯 **TECHNOLOGY STACK RECOMMENDATION**

### **Option 1: React + TypeScript (RECOMMENDED)**

```yaml
Framework: React 18
Language: TypeScript
Build Tool: Vite
UI Library: Material-UI (MUI) v5
State Management: Zustand or Redux Toolkit
Routing: React Router v6
Video Player: Video.js or HLS.js
HTTP Client: Axios
Authentication: JWT with axios interceptors

Pros:
  ✅ Large ecosystem and community
  ✅ Excellent TypeScript support
  ✅ Fast development with Vite
  ✅ Material-UI provides professional components
  ✅ Good video player libraries
  ✅ Team may already know React

Cons:
  ⚠️ More boilerplate than Vue
  ⚠️ State management can be complex
```

### **Option 2: Next.js (Alternative)**

```yaml
Framework: Next.js 14 (React framework)
Language: TypeScript
UI Library: Material-UI or Tailwind CSS
State Management: Zustand
Video Player: Video.js

Pros:
  ✅ Server-side rendering (SSR)
  ✅ Built-in routing
  ✅ API routes (can replace Node.js API)
  ✅ Better SEO
  ✅ Image optimization

Cons:
  ⚠️ Overkill for internal VMS system
  ⚠️ More complex deployment
  ⚠️ SSR not needed for authenticated app
```

### **Option 3: Vue 3 (Alternative)**

```yaml
Framework: Vue 3
Language: TypeScript
Build Tool: Vite
UI Library: Vuetify or Element Plus
State Management: Pinia
Routing: Vue Router
Video Player: Video.js

Pros:
  ✅ Simpler than React
  ✅ Excellent TypeScript support
  ✅ Less boilerplate
  ✅ Good documentation

Cons:
  ⚠️ Smaller ecosystem than React
  ⚠️ Fewer video player options
```

**RECOMMENDATION:** **React + TypeScript + Vite + Material-UI**

---

## 🏗️ **ARCHITECTURE**

### **Project Structure:**

```
services/frontend/
├── public/
│   ├── favicon.ico
│   └── logo.png
├── src/
│   ├── api/                    # API client
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.ts             # Auth API
│   │   ├── cameras.ts          # Camera API
│   │   ├── recordings.ts       # Recording API
│   │   └── streams.ts          # Stream API
│   ├── components/             # Reusable components
│   │   ├── common/             # Common components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Loading.tsx
│   │   ├── camera/             # Camera components
│   │   │   ├── CameraCard.tsx
│   │   │   ├── CameraGrid.tsx
│   │   │   └── CameraForm.tsx
│   │   ├── video/              # Video components
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── VideoGrid.tsx
│   │   │   └── Timeline.tsx
│   │   └── layout/             # Layout components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   ├── pages/                  # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── LiveView.tsx
│   │   ├── Recordings.tsx
│   │   ├── CameraManagement.tsx
│   │   ├── UserManagement.tsx
│   │   └── Settings.tsx
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useCameras.ts
│   │   ├── useRecordings.ts
│   │   └── useWebSocket.ts
│   ├── store/                  # State management
│   │   ├── authStore.ts
│   │   ├── cameraStore.ts
│   │   └── uiStore.ts
│   ├── types/                  # TypeScript types
│   │   ├── api.ts
│   │   ├── camera.ts
│   │   └── recording.ts
│   ├── utils/                  # Utility functions
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── validation.ts
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   └── router.tsx              # Route configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 📱 **UI/UX REQUIREMENTS**

### **1. Login Page:**
```yaml
Features:
  - Username/password form
  - Remember me checkbox
  - Login button
  - Error messages
  - Loading state

Design:
  - Centered card layout
  - VMS logo
  - Clean and professional
```

### **2. Dashboard:**
```yaml
Features:
  - System overview cards
    - Total cameras
    - Online cameras
    - Storage usage
    - CPU/GPU usage
  - Recent events list
  - Quick actions
  - System health indicators

Layout:
  - Grid layout (responsive)
  - Cards with icons and numbers
  - Charts for trends (optional)
```

### **3. Live View:**
```yaml
Features:
  - Camera grid (2x2, 3x3, 4x4 layouts)
  - Live video streams (HLS/WebRTC)
  - Camera name overlay
  - Status indicator (online/offline)
  - Fullscreen mode
  - Grid layout selector
  - Camera selector

Layout:
  - Responsive grid
  - Auto-adjust based on screen size
  - Maintain aspect ratio (16:9)
```

### **4. Recordings:**
```yaml
Features:
  - Recording list with thumbnails
  - Date/time range filter
  - Camera filter
  - Search by name
  - Pagination
  - Video player modal
  - Download button
  - Delete button (admin only)
  - Timeline view

Layout:
  - Table or card grid
  - Filters on top
  - Pagination at bottom
```

### **5. Camera Management:**
```yaml
Features:
  - Camera list table
  - Add camera button
  - Edit camera button
  - Delete camera button
  - Camera status toggle
  - RTSP URL test
  - Camera form modal

Layout:
  - Table with actions column
  - Modal for add/edit
  - Confirmation dialog for delete
```

### **6. User Management (Admin Only):**
```yaml
Features:
  - User list table
  - Add user button
  - Edit user button
  - Delete user button
  - Role selector
  - Status toggle (active/disabled)

Layout:
  - Table with actions column
  - Modal for add/edit
```

### **7. Settings:**
```yaml
Features:
  - User profile
  - Change password
  - System settings (admin only)
  - Notification preferences
  - Theme selector (light/dark)

Layout:
  - Tabs for different sections
  - Form layout
```

---

## 🎥 **VIDEO PLAYER INTEGRATION**

### **Option 1: Video.js (RECOMMENDED)**

```yaml
Library: Video.js
Protocol Support: HLS, MP4, WebRTC (with plugin)
Features:
  ✅ Professional player UI
  ✅ HLS support built-in
  ✅ Extensive plugin ecosystem
  ✅ Responsive design
  ✅ Keyboard shortcuts
  ✅ Quality selector
  ✅ Fullscreen support

Installation:
  npm install video.js @videojs/http-streaming

Usage:
  import videojs from 'video.js';
  import 'video.js/dist/video-js.css';
```

### **Option 2: HLS.js + Custom UI**

```yaml
Library: HLS.js
Protocol Support: HLS only
Features:
  ✅ Lightweight
  ✅ HLS support
  ✅ Custom UI control
  ⚠️ Need to build UI

Installation:
  npm install hls.js
```

### **Option 3: React Player**

```yaml
Library: React Player
Protocol Support: HLS, MP4, YouTube, etc.
Features:
  ✅ React-friendly
  ✅ Multiple sources
  ✅ Simple API
  ⚠️ Less control over UI

Installation:
  npm install react-player
```

**RECOMMENDATION:** **Video.js** for professional features and HLS support

---

## 🔌 **MEDIAMTX INTEGRATION**

### **Stream URLs:**

```typescript
// HLS (recommended for web)
const hlsUrl = `http://localhost:8888/live/${cameraId}/high/index.m3u8`;

// RTSP (not supported in browser)
const rtspUrl = `rtsp://localhost:8554/live/${cameraId}/high`;

// WebRTC (low latency, requires plugin)
const webrtcUrl = `http://localhost:8889/live/${cameraId}/high`;
```

### **Video Player Component:**

```typescript
import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  streamUrl: string;
  cameraName: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ streamUrl, cameraName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (videoRef.current) {
      playerRef.current = videojs(videoRef.current, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        fluid: true,
        sources: [{
          src: streamUrl,
          type: 'application/x-mpegURL'
        }]
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [streamUrl]);

  return (
    <div className="video-player">
      <video ref={videoRef} className="video-js vjs-default-skin" />
      <div className="camera-name">{cameraName}</div>
    </div>
  );
};
```

---

## 🔐 **AUTHENTICATION FLOW**

### **1. Login:**
```typescript
// Login and store tokens
const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  const { accessToken, refreshToken } = response.data.data;
  
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  
  // Set axios default header
  api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
};
```

### **2. Token Refresh:**
```typescript
// Axios interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 📅 **IMPLEMENTATION TIMELINE**

### **Phase 7.1: Setup & Authentication (Week 1)**
```yaml
Tasks:
  - Initialize React + Vite project
  - Setup TypeScript configuration
  - Install dependencies (MUI, axios, etc.)
  - Create project structure
  - Implement login page
  - Implement authentication flow
  - Setup routing
```

### **Phase 7.2: Dashboard & Live View (Week 2-3)**
```yaml
Tasks:
  - Create dashboard page
  - Implement system stats cards
  - Create live view page
  - Integrate Video.js player
  - Implement camera grid
  - Add layout selector (2x2, 3x3, 4x4)
  - Add fullscreen mode
```

### **Phase 7.3: Recordings (Week 3-4)**
```yaml
Tasks:
  - Create recordings page
  - Implement recording list
  - Add date/time filters
  - Implement video player modal
  - Add download functionality
  - Implement timeline view
```

### **Phase 7.4: Management Pages (Week 4-5)**
```yaml
Tasks:
  - Create camera management page
  - Create user management page
  - Implement CRUD operations
  - Add form validation
  - Add confirmation dialogs
```

### **Phase 7.5: Polish & Testing (Week 5-6)**
```yaml
Tasks:
  - Add loading states
  - Add error handling
  - Implement responsive design
  - Add dark mode (optional)
  - Write tests
  - Performance optimization
```

---

## 📚 **DEPENDENCIES**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.0",
    "video.js": "^8.6.0",
    "@videojs/http-streaming": "^3.10.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/video.js": "^7.3.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

**Document Status:** Draft  
**Last Updated:** October 20, 2025

