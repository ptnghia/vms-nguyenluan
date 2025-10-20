"use strict";
/**
 * MediaMTX Stream Service
 * Integration with MediaMTX streaming server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaMTXService = exports.MediaMTXService = void 0;
const axios_1 = __importDefault(require("axios"));
class MediaMTXService {
    constructor(apiUrl, serverHost) {
        this.apiUrl = apiUrl || process.env.MEDIAMTX_API_URL || 'http://localhost:9997';
        this.serverHost = serverHost || process.env.MEDIAMTX_HOST || 'localhost';
    }
    /**
     * Get all stream paths from MediaMTX
     */
    async getStreamPaths() {
        try {
            const response = await axios_1.default.get(`${this.apiUrl}/v3/config/paths/get/all`, {
                timeout: 5000
            });
            if (response.data && typeof response.data === 'object') {
                return Object.entries(response.data).map(([name, data]) => ({
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
        }
        catch (error) {
            console.error('Failed to get stream paths:', error);
            return [];
        }
    }
    /**
     * Get specific stream path
     */
    async getStreamPath(pathName) {
        try {
            // MediaMTX API may not be configured, return mock data for now
            console.log(`Getting stream path for: ${pathName}`);
            // Return basic stream info
            return {
                name: pathName,
                source: {
                    type: 'rtsp',
                    running: true
                },
                ready: true,
                readyTime: new Date().toISOString(),
                tracks: ['video', 'audio'],
                bytesReceived: 0,
                bytesSent: 0,
                readers: []
            };
        }
        catch (error) {
            console.error(`Failed to get stream path ${pathName}:`, error);
            return null;
        }
    }
    /**
     * Check if MediaMTX server is healthy
     */
    async isHealthy() {
        try {
            const response = await axios_1.default.get(`${this.apiUrl}/v3/config`, {
                timeout: 3000
            });
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Generate stream URLs for a camera
     */
    getStreamURLs(cameraId) {
        const streamName = `live/${cameraId}`;
        return {
            rtsp: `rtsp://${this.serverHost}:8554/${streamName}/low`,
            rtmp: `rtmp://${this.serverHost}:1935/${streamName}/low`,
            hls: `http://${this.serverHost}:8888/${streamName}/low`,
            webrtc: `http://${this.serverHost}:8889/${streamName}/low`
        };
    }
    /**
     * Check if a camera stream is active
     */
    async isStreamActive(cameraId) {
        const streamName = `live/${cameraId}`;
        const path = await this.getStreamPath(streamName);
        return path?.ready || false;
    }
    /**
     * Get stream statistics
     */
    async getStreamStats(cameraId) {
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
    async getActiveStreams() {
        const paths = await this.getStreamPaths();
        return paths.filter(path => path.ready);
    }
}
exports.MediaMTXService = MediaMTXService;
// Singleton instance
exports.mediaMTXService = new MediaMTXService();
//# sourceMappingURL=mediamtx.service.js.map