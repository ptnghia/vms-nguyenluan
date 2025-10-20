/**
 * TypeScript Type Definitions
 */

export interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  location: string;
  status: 'online' | 'offline';
  created_at: string;
  updated_at: string;
}

export interface Recording {
  id: number;
  camera_id: string;
  file_path: string;
  start_time: string;
  end_time: string;
  file_size: number;
  duration: number;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface StreamURLs {
  rtsp: string;
  rtmp: string;
  hls: string;
  webrtc: string;
}

export interface StreamInfo {
  camera: {
    id: string;
    name: string;
    status: string;
  };
  streams: StreamURLs;
  active: boolean;
  stats?: {
    ready: boolean;
    bytesReceived: number;
    bytesSent: number;
    viewers: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}
