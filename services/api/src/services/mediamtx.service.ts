/**
 * MediaMTX Stream Service
 * Integration with MediaMTX streaming server
 */

import axios from 'axios';

export interface StreamPath {
  name: string;
  source?: {
    type: string;
    running: boolean;
  };
  ready: boolean;
  readyTime?: string;
  tracks: string[];
  bytesReceived: number;
  bytesSent: number;
  readers?: Array<{
    type: string;
    id: string;
  }>;
}

export interface StreamURLs {
  rtsp: string;
  rtmp: string;
  hls: string;
  webrtc: string;
}

export class MediaMTXService {
  private apiUrl: string;
  private serverHost: string;

  constructor(apiUrl?: string, serverHost?: string) {
    this.apiUrl = apiUrl || process.env.MEDIAMTX_API_URL || 'http://localhost:9997';
    this.serverHost = serverHost || process.env.MEDIAMTX_HOST || 'localhost';
  }

  /**
   * Get all stream paths from MediaMTX
   */
  async getStreamPaths(): Promise<StreamPath[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/v3/config/paths/get/all`, {
        timeout: 5000
      });

      if (response.data && typeof response.data === 'object') {
        return Object.entries(response.data).map(([name, data]: [string, any]) => ({
          name,
          source: data.source,
          ready: data.ready || false,
          readyTime: data.readyTime,
          tracks: data.tracks || [],
          bytesReceived: data.bytesReceived || 0,
          bytesSent: data.bytesSent || 0,
          readers: data.readers
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to get stream paths:', error);
      return [];
    }
  }

  /**
   * Get specific stream path
   */
  async getStreamPath(pathName: string): Promise<StreamPath | null> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v3/config/paths/get/${encodeURIComponent(pathName)}`,
        { timeout: 5000 }
      );

      if (response.data) {
        const data: any = response.data;
        return {
          name: pathName,
          source: data.source,
          ready: data.ready || false,
          readyTime: data.readyTime,
          tracks: data.tracks || [],
          bytesReceived: data.bytesReceived || 0,
          bytesSent: data.bytesSent || 0,
          readers: data.readers
        };
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error(`Failed to get stream path ${pathName}:`, error);
      throw error;
    }
  }

  /**
   * Check if MediaMTX server is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/v3/config`, {
        timeout: 3000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate stream URLs for a camera
   */
  getStreamURLs(cameraId: string): StreamURLs {
    const streamName = `live/${cameraId}`;
    
    return {
      rtsp: `rtsp://${this.serverHost}:8554/${streamName}`,
      rtmp: `rtmp://${this.serverHost}:1935/${streamName}`,
      hls: `http://${this.serverHost}:8888/${streamName}`,
      webrtc: `http://${this.serverHost}:8889/${streamName}`
    };
  }

  /**
   * Check if a camera stream is active
   */
  async isStreamActive(cameraId: string): Promise<boolean> {
    const streamName = `live/${cameraId}`;
    const path = await this.getStreamPath(streamName);
    return path?.ready || false;
  }

  /**
   * Get stream statistics
   */
  async getStreamStats(cameraId: string): Promise<{
    ready: boolean;
    bytesReceived: number;
    bytesSent: number;
    viewers: number;
  } | null> {
    const streamName = `live/${cameraId}`;
    const path = await this.getStreamPath(streamName);

    if (!path) {
      return null;
    }

    return {
      ready: path.ready,
      bytesReceived: path.bytesReceived,
      bytesSent: path.bytesSent,
      viewers: path.readers?.length || 0
    };
  }

  /**
   * Get all active streams
   */
  async getActiveStreams(): Promise<StreamPath[]> {
    const paths = await this.getStreamPaths();
    return paths.filter(path => path.ready);
  }
}

// Singleton instance
export const mediaMTXService = new MediaMTXService();
