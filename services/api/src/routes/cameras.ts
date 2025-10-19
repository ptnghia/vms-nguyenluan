import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// GET /api/cameras - List all cameras
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, rtsp_url, location, status, created_at, updated_at FROM cameras ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cameras'
    });
  }
});

// GET /api/cameras/:id - Get single camera
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, rtsp_url, location, status, created_at, updated_at FROM cameras WHERE id = $1',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Camera not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching camera:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camera'
    });
  }
});

// POST /api/cameras - Create new camera
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, rtsp_url, location, status = 'offline' } = req.body;
    
    if (!name || !rtsp_url) {
      return res.status(400).json({
        success: false,
        error: 'Name and RTSP URL are required'
      });
    }
    
    const result = await pool.query(
      'INSERT INTO cameras (name, rtsp_url, location, status) VALUES ($1, $2, $3, $4) RETURNING id, name, rtsp_url, location, status, created_at, updated_at',
      [name, rtsp_url, location, status]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating camera:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create camera'
    });
  }
});

// PUT /api/cameras/:id - Update camera
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, rtsp_url, location, status } = req.body;
    
    const result = await pool.query(
      'UPDATE cameras SET name = COALESCE($1, name), rtsp_url = COALESCE($2, rtsp_url), location = COALESCE($3, location), status = COALESCE($4, status), updated_at = NOW() WHERE id = $5 RETURNING id, name, rtsp_url, location, status, created_at, updated_at',
      [name, rtsp_url, location, status, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Camera not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating camera:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update camera'
    });
  }
});

// DELETE /api/cameras/:id - Delete camera
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM cameras WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Camera not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Camera deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting camera:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete camera'
    });
  }
});

export default router;
