/**
 * Streaming Routes
 * Provides live stream URLs and status for cameras
 */

import express, { Request, Response } from 'express';
import { mediaMTXService } from '../services/mediamtx.service';
import pool from '../config/database';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

/**
 * GET /streams
 * Get all active streams
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const streams = await mediaMTXService.getActiveStreams();
    
    res.json({
      success: true,
      data: streams,
      count: streams.length
    });
  } catch (error) {
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
router.get('/camera/:cameraId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { cameraId } = req.params;

    // Check if camera exists
    const result = await pool.query(
      'SELECT id, name, status FROM cameras WHERE id = $1',
      [cameraId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Camera not found'
      });
      return;
    }

    const camera = result.rows[0];

    // Get stream URLs
    const urls = mediaMTXService.getStreamURLs(cameraId);

    // Check if stream is active
    const isActive = await mediaMTXService.isStreamActive(cameraId);

    // Get stream statistics if active
    let stats = null;
    if (isActive) {
      stats = await mediaMTXService.getStreamStats(cameraId);
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
  } catch (error) {
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
router.get('/status/:cameraId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { cameraId } = req.params;

    const isActive = await mediaMTXService.isStreamActive(cameraId);
    const stats = await mediaMTXService.getStreamStats(cameraId);

    res.json({
      success: true,
      data: {
        cameraId,
        active: isActive,
        stats: stats
      }
    });
  } catch (error) {
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
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await mediaMTXService.isHealthy();

    res.json({
      success: true,
      data: {
        mediamtx: isHealthy ? 'online' : 'offline',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check MediaMTX health'
    });
  }
});

export default router;
