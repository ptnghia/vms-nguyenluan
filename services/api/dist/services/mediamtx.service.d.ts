/**
 * MediaMTX Stream Service
 * Integration with MediaMTX streaming server
 */
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
export declare class MediaMTXService {
    private apiUrl;
    private serverHost;
    constructor(apiUrl?: string, serverHost?: string);
    /**
     * Get all stream paths from MediaMTX
     */
    getStreamPaths(): Promise<StreamPath[]>;
    /**
     * Get specific stream path
     */
    getStreamPath(pathName: string): Promise<StreamPath | null>;
    /**
     * Check if MediaMTX server is healthy
     */
    isHealthy(): Promise<boolean>;
    /**
     * Generate stream URLs for a camera
     */
    getStreamURLs(cameraId: string): StreamURLs;
    /**
     * Check if a camera stream is active
     */
    isStreamActive(cameraId: string): Promise<boolean>;
    /**
     * Get stream statistics
     */
    getStreamStats(cameraId: string): Promise<{
        ready: boolean;
        bytesReceived: number;
        bytesSent: number;
        viewers: number;
    } | null>;
    /**
     * Get all active streams
     */
    getActiveStreams(): Promise<StreamPath[]>;
}
export declare const mediaMTXService: MediaMTXService;
//# sourceMappingURL=mediamtx.service.d.ts.map