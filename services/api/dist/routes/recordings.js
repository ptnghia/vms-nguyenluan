"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recording_service_1 = require("../services/recording.service");
const metadata_service_1 = require("../services/metadata.service");
const auth_1 = require("../middleware/auth");
const fs = __importStar(require("fs"));
const router = (0, express_1.Router)();
/**
 * GET /api/recordings
 * List recordings with pagination and filters
 */
router.get('/', auth_1.optionalAuth, async (req, res) => {
    try {
        const { cameraId, startDate, endDate, storageTier, search, page = '1', limit = '20' } = req.query;
        const filter = {
            cameraId: cameraId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            storageTier: storageTier,
            search: search,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
        const { recordings, total } = await recording_service_1.recordingService.getRecordings(filter);
        res.json({
            success: true,
            data: recordings,
            pagination: {
                page: filter.page,
                limit: filter.limit,
                total,
                totalPages: Math.ceil(total / filter.limit)
            }
        });
    }
    catch (error) {
        console.error('[GET /api/recordings] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recordings',
            message: error.message
        });
    }
});
/**
 * GET /api/recordings/search
 * Advanced search with full-text search
 */
router.get('/search', auth_1.optionalAuth, async (req, res) => {
    try {
        const { q, cameraId, startDate, endDate, minDuration, maxDuration, resolution, codec, page = '1', limit = '20' } = req.query;
        // Use the same filter structure for now
        // Can be extended with more advanced search later
        const filter = {
            cameraId: cameraId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            search: q,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
        const { recordings, total } = await recording_service_1.recordingService.getRecordings(filter);
        // Additional filtering for duration, resolution, codec
        let filtered = recordings;
        if (minDuration) {
            const min = parseInt(minDuration, 10);
            filtered = filtered.filter(r => r.duration && r.duration >= min);
        }
        if (maxDuration) {
            const max = parseInt(maxDuration, 10);
            filtered = filtered.filter(r => r.duration && r.duration <= max);
        }
        if (resolution) {
            filtered = filtered.filter(r => r.resolution === resolution);
        }
        if (codec) {
            filtered = filtered.filter(r => r.codec === codec);
        }
        res.json({
            success: true,
            data: filtered,
            pagination: {
                page: filter.page,
                limit: filter.limit,
                total: filtered.length,
                totalPages: Math.ceil(filtered.length / filter.limit)
            }
        });
    }
    catch (error) {
        console.error('[GET /api/recordings/search] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search recordings',
            message: error.message
        });
    }
});
/**
 * GET /api/recordings/stats
 * Get recording statistics
 */
router.get('/stats', auth_1.optionalAuth, async (req, res) => {
    try {
        const stats = await recording_service_1.recordingService.getStats();
        // Format file sizes
        const formatted = {
            ...stats,
            totalSizeFormatted: metadata_service_1.metadataService.formatFileSize(stats.totalSize),
            totalDurationFormatted: metadata_service_1.metadataService.formatDuration(stats.totalDuration),
            byCamera: stats.byCamera.map(c => ({
                ...c,
                total_size_formatted: metadata_service_1.metadataService.formatFileSize(c.total_size),
                total_duration_formatted: metadata_service_1.metadataService.formatDuration(c.total_duration)
            })),
            byStorageTier: stats.byStorageTier.map(t => ({
                ...t,
                total_size_formatted: metadata_service_1.metadataService.formatFileSize(t.total_size)
            }))
        };
        res.json({
            success: true,
            data: formatted
        });
    }
    catch (error) {
        console.error('[GET /api/recordings/stats] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recording statistics',
            message: error.message
        });
    }
});
/**
 * GET /api/recordings/:id
 * Get single recording details
 */
router.get('/:id', auth_1.optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const recording = await recording_service_1.recordingService.getRecordingById(id);
        if (!recording) {
            return res.status(404).json({
                success: false,
                error: 'Recording not found'
            });
        }
        // Add formatted values
        const formatted = {
            ...recording,
            file_size_formatted: metadata_service_1.metadataService.formatFileSize(recording.file_size),
            duration_formatted: recording.duration
                ? metadata_service_1.metadataService.formatDuration(recording.duration)
                : null
        };
        res.json({
            success: true,
            data: formatted
        });
    }
    catch (error) {
        console.error('[GET /api/recordings/:id] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recording',
            message: error.message
        });
    }
});
/**
 * GET /api/recordings/:id/stream
 * Stream recording for video playback (supports range requests)
 */
router.get('/:id/stream', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const recording = await recording_service_1.recordingService.getRecordingById(id);
        if (!recording) {
            return res.status(404).json({
                success: false,
                error: 'Recording not found'
            });
        }
        // Check if file exists
        if (!fs.existsSync(recording.filepath)) {
            return res.status(404).json({
                success: false,
                error: 'Recording file not found on disk'
            });
        }
        // Get file stats
        const stat = fs.statSync(recording.filepath);
        const fileSize = stat.size;
        const range = req.headers.range;
        // Set content type
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        if (range) {
            // Parse range header
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            // Send partial content
            res.status(206);
            res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + fileSize);
            res.setHeader('Content-Length', chunksize.toString());
            const stream = fs.createReadStream(recording.filepath, { start, end });
            stream.pipe(res);
        }
        else {
            // Send full file
            res.setHeader('Content-Length', fileSize.toString());
            const stream = fs.createReadStream(recording.filepath);
            stream.pipe(res);
        }
    }
    catch (error) {
        console.error('[GET /api/recordings/:id/stream] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stream recording',
            message: error.message
        });
    }
});
/**
 * GET /api/recordings/:id/download
 * Download recording file
 */
router.get('/:id/download', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const recording = await recording_service_1.recordingService.getRecordingById(id);
        if (!recording) {
            return res.status(404).json({
                success: false,
                error: 'Recording not found'
            });
        }
        // Check if file exists
        if (!fs.existsSync(recording.filepath)) {
            return res.status(404).json({
                success: false,
                error: 'Recording file not found on disk'
            });
        }
        // Set headers for download
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${recording.filename}"`);
        res.setHeader('Content-Length', recording.file_size.toString());
        // Support range requests for video streaming
        const stat = fs.statSync(recording.filepath);
        const fileSize = stat.size;
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', chunksize.toString());
            const stream = fs.createReadStream(recording.filepath, { start, end });
            stream.pipe(res);
        }
        else {
            const stream = fs.createReadStream(recording.filepath);
            stream.pipe(res);
        }
    }
    catch (error) {
        console.error('[GET /api/recordings/:id/download] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download recording',
            message: error.message
        });
    }
});
/**
 * DELETE /api/recordings/:id
 * Delete recording (admin only)
 */
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Admin access required'
            });
        }
        const { id } = req.params;
        const success = await recording_service_1.recordingService.deleteRecording(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Recording not found'
            });
        }
        res.json({
            success: true,
            message: 'Recording deleted successfully'
        });
    }
    catch (error) {
        console.error('[DELETE /api/recordings/:id] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete recording',
            message: error.message
        });
    }
});
/**
 * POST /api/recordings/sync
 * Trigger file system scan and sync (admin only)
 */
router.post('/sync', auth_1.authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Admin access required'
            });
        }
        const result = await recording_service_1.recordingService.scanAndSync();
        res.json({
            success: true,
            data: result,
            message: `Scan complete: ${result.synced} recordings synced`
        });
    }
    catch (error) {
        console.error('[POST /api/recordings/sync] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync recordings',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=recordings.js.map