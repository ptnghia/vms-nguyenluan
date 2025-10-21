import { Router, Request, Response } from 'express';
import { recordingService } from '../services/recording.service';
import { metadataService } from '../services/metadata.service';
import { authenticate, optionalAuth } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

/**
 * GET /api/recordings
 * List recordings with pagination and filters
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      cameraId,
      startDate,
      endDate,
      storageTier,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const filter = {
      cameraId: cameraId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      storageTier: storageTier as string,
      search: search as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10)
    };

    const { recordings, total } = await recordingService.getRecordings(filter);

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
  } catch (error: any) {
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
router.get('/search', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      q,
      cameraId,
      startDate,
      endDate,
      minDuration,
      maxDuration,
      resolution,
      codec,
      page = '1',
      limit = '20'
    } = req.query;

    // Use the same filter structure for now
    // Can be extended with more advanced search later
    const filter = {
      cameraId: cameraId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      search: q as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10)
    };

    const { recordings, total } = await recordingService.getRecordings(filter);

    // Additional filtering for duration, resolution, codec
    let filtered = recordings;
    
    if (minDuration) {
      const min = parseInt(minDuration as string, 10);
      filtered = filtered.filter(r => r.duration && r.duration >= min);
    }
    
    if (maxDuration) {
      const max = parseInt(maxDuration as string, 10);
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
  } catch (error: any) {
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
router.get('/stats', optionalAuth, async (req: Request, res: Response) => {
  try {
    const stats = await recordingService.getStats();

    // Format file sizes
    const formatted = {
      ...stats,
      totalSizeFormatted: metadataService.formatFileSize(stats.totalSize),
      totalDurationFormatted: metadataService.formatDuration(stats.totalDuration),
      byCamera: stats.byCamera.map(c => ({
        ...c,
        total_size_formatted: metadataService.formatFileSize(c.total_size),
        total_duration_formatted: metadataService.formatDuration(c.total_duration)
      })),
      byStorageTier: stats.byStorageTier.map(t => ({
        ...t,
        total_size_formatted: metadataService.formatFileSize(t.total_size)
      }))
    };

    res.json({
      success: true,
      data: formatted
    });
  } catch (error: any) {
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
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recording = await recordingService.getRecordingById(id);

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }

    // Add formatted values
    const formatted = {
      ...recording,
      file_size_formatted: metadataService.formatFileSize(recording.file_size),
      duration_formatted: recording.duration 
        ? metadataService.formatDuration(recording.duration) 
        : null
    };

    res.json({
      success: true,
      data: formatted
    });
  } catch (error: any) {
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
router.get('/:id/stream', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recording = await recordingService.getRecordingById(id);

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
    } else {
      // Send full file
      res.setHeader('Content-Length', fileSize.toString());
      const stream = fs.createReadStream(recording.filepath);
      stream.pipe(res);
    }
  } catch (error: any) {
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
router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recording = await recordingService.getRecordingById(id);

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
    } else {
      const stream = fs.createReadStream(recording.filepath);
      stream.pipe(res);
    }
  } catch (error: any) {
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
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Admin access required'
      });
    }

    const { id } = req.params;
    const success = await recordingService.deleteRecording(id);

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
  } catch (error: any) {
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
router.post('/sync', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Admin access required'
      });
    }

    const result = await recordingService.scanAndSync();

    res.json({
      success: true,
      data: result,
      message: `Scan complete: ${result.synced} recordings synced`
    });
  } catch (error: any) {
    console.error('[POST /api/recordings/sync] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync recordings',
      message: error.message
    });
  }
});

export default router;

