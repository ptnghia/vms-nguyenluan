"use strict";
/**
 * Streaming Routes
 * Provides live stream URLs and status for cameras
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mediamtx_service_1 = require("../services/mediamtx.service");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * GET /streams
 * Get all active streams
 */
router.get('/', auth_1.optionalAuth, async (req, res) => {
    try {
        const streams = await mediamtx_service_1.mediaMTXService.getActiveStreams();
        res.json({
            success: true,
            data: streams,
            count: streams.length
        });
    }
    catch (error) {
        console.error('Error getting streams:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get streams'
        });
    }
});
/**
 * GET /streams/camera/:cameraId
 * Get stream URLs for a specific camera
 */
router.get('/camera/:cameraId', auth_1.optionalAuth, async (req, res) => {
    try {
        const { cameraId } = req.params;
        // Check if camera exists
        const result = await database_1.default.query('SELECT id, name, status FROM cameras WHERE id = $1', [cameraId]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Camera not found'
            });
            return;
        }
        const camera = result.rows[0];
        // Get stream URLs
        const urls = mediamtx_service_1.mediaMTXService.getStreamURLs(cameraId);
        // Check if stream is active
        const isActive = await mediamtx_service_1.mediaMTXService.isStreamActive(cameraId);
        // Get stream statistics if active
        let stats = null;
        if (isActive) {
            stats = await mediamtx_service_1.mediaMTXService.getStreamStats(cameraId);
        }
        res.json({
            success: true,
            data: {
                camera: {
                    id: camera.id,
                    name: camera.name,
                    status: camera.status
                },
                streams: urls,
                active: isActive,
                stats: stats
            }
        });
    }
    catch (error) {
        console.error('Error getting camera stream:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get camera stream'
        });
    }
});
/**
 * GET /streams/status/:cameraId
 * Get stream status and statistics
 */
router.get('/status/:cameraId', auth_1.optionalAuth, async (req, res) => {
    try {
        const { cameraId } = req.params;
        const isActive = await mediamtx_service_1.mediaMTXService.isStreamActive(cameraId);
        const stats = await mediamtx_service_1.mediaMTXService.getStreamStats(cameraId);
        res.json({
            success: true,
            data: {
                cameraId,
                active: isActive,
                stats: stats
            }
        });
    }
    catch (error) {
        console.error('Error getting stream status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stream status'
        });
    }
});
/**
 * GET /streams/health
 * Check MediaMTX server health
 */
router.get('/health', async (req, res) => {
    try {
        const isHealthy = await mediamtx_service_1.mediaMTXService.isHealthy();
        res.json({
            success: true,
            data: {
                mediamtx: isHealthy ? 'online' : 'offline',
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check MediaMTX health'
        });
    }
});
exports.default = router;
//# sourceMappingURL=streams.js.map