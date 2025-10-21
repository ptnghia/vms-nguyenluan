import * as fs from 'fs/promises';
import * as path from 'path';
import pool from '../config/database';
import { metadataService, VideoMetadata } from './metadata.service';

export interface Recording {
  id: string;
  camera_id: string;
  filename: string;
  filepath: string;
  file_size: number;
  start_time: Date;
  end_time: Date | null;
  duration: number | null;
  resolution: string | null;
  fps: number | null;
  codec: string | null;
  bitrate: number | null;
  storage_tier: string;
  created_at: Date;
}

export interface RecordingFilter {
  cameraId?: string;
  startDate?: Date;
  endDate?: Date;
  storageTier?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RecordingStats {
  totalRecordings: number;
  totalSize: number;
  totalDuration: number;
  byCamera: Array<{
    camera_id: string;
    camera_name: string;
    count: number;
    total_size: number;
    total_duration: number;
  }>;
  byStorageTier: Array<{
    storage_tier: string;
    count: number;
    total_size: number;
  }>;
}

export class RecordingService {
  private getRecordingPath(): string {
    // Use env variable or default to project root
    if (process.env.RECORDING_PATH) {
      return process.env.RECORDING_PATH;
    }
    // Default: go up from services/api to project root
    return path.join(__dirname, '..', '..', '..', 'data', 'recordings');
  }

  /**
   * Scan file system and sync recordings to database
   */
  async scanAndSync(): Promise<{ scanned: number; synced: number; errors: number }> {
    const recordingPath = this.getRecordingPath();
    console.log(`[RecordingService] Starting scan of ${recordingPath}`);
    
    let scanned = 0;
    let synced = 0;
    let errors = 0;

    try {
      // Get all cameras from database
      const camerasResult = await pool.query('SELECT id, name FROM cameras');
      const cameras = camerasResult.rows;

      for (const camera of cameras) {
        const cameraPath = path.join(recordingPath, camera.name);
        
        try {
          // Check if camera directory exists
          await fs.access(cameraPath);
          
          // Read all files in camera directory
          const files = await fs.readdir(cameraPath);
          const mp4Files = files.filter(f => f.endsWith('.mp4'));

          console.log(`[RecordingService] Found ${mp4Files.length} MP4 files for camera ${camera.name}`);

          for (const filename of mp4Files) {
            scanned++;
            const filepath = path.join(cameraPath, filename);

            try {
              // Check if recording already exists in database
              const existingResult = await pool.query(
                'SELECT id FROM recordings WHERE filepath = $1',
                [filepath]
              );

              if (existingResult.rows.length > 0) {
                // Already in database, skip
                continue;
              }

              // Extract metadata
              const metadata = await metadataService.extractMetadata(filepath);
              
              // Parse start time from filename
              const startTime = metadataService.parseFilenameTimestamp(filename);
              if (!startTime) {
                console.warn(`[RecordingService] Could not parse timestamp from filename: ${filename}`);
                errors++;
                continue;
              }

              // Calculate end time
              const endTime = metadataService.calculateEndTime(startTime, metadata.duration);

              // Insert into database
              await pool.query(
                `INSERT INTO recordings 
                (camera_id, filename, filepath, file_size, start_time, end_time, 
                 duration, resolution, fps, codec, bitrate, storage_tier)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (camera_id, start_time) DO NOTHING`,
                [
                  camera.id,
                  filename,
                  filepath,
                  metadata.fileSize,
                  startTime,
                  endTime,
                  metadata.duration,
                  metadata.resolution,
                  metadata.fps,
                  metadata.codec,
                  metadata.bitrate,
                  'hot' // Default storage tier
                ]
              );

              synced++;
              console.log(`[RecordingService] Synced: ${filename}`);
            } catch (error: any) {
              console.error(`[RecordingService] Error processing ${filename}:`, error.message);
              errors++;
            }
          }
        } catch (error: any) {
          console.error(`[RecordingService] Error scanning camera ${camera.name}:`, error.message);
        }
      }

      console.log(`[RecordingService] Scan complete: ${scanned} scanned, ${synced} synced, ${errors} errors`);
      return { scanned, synced, errors };
    } catch (error: any) {
      console.error('[RecordingService] Scan failed:', error.message);
      throw error;
    }
  }

  /**
   * Get recordings with filters and pagination
   */
  async getRecordings(filter: RecordingFilter): Promise<{ recordings: Recording[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, c.name as camera_name
      FROM recordings r
      JOIN cameras c ON r.camera_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filter.cameraId) {
      params.push(filter.cameraId);
      query += ` AND r.camera_id = $${paramIndex++}`;
    }

    if (filter.startDate) {
      params.push(filter.startDate);
      query += ` AND r.start_time >= $${paramIndex++}`;
    }

    if (filter.endDate) {
      params.push(filter.endDate);
      query += ` AND r.end_time <= $${paramIndex++}`;
    }

    if (filter.storageTier) {
      params.push(filter.storageTier);
      query += ` AND r.storage_tier = $${paramIndex++}`;
    }

    if (filter.search) {
      params.push(`%${filter.search}%`);
      query += ` AND r.filename ILIKE $${paramIndex++}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Add sorting and pagination
    query += ` ORDER BY r.start_time DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { recordings: result.rows, total };
  }

  /**
   * Get single recording by ID
   */
  async getRecordingById(id: string): Promise<Recording | null> {
    const result = await pool.query(
      `SELECT r.*, c.name as camera_name
       FROM recordings r
       JOIN cameras c ON r.camera_id = c.id
       WHERE r.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Delete recording
   */
  async deleteRecording(id: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get recording info
      const result = await client.query('SELECT filepath FROM recordings WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return false;
      }

      const filepath = result.rows[0].filepath;

      // Delete from database
      await client.query('DELETE FROM recordings WHERE id = $1', [id]);

      // Delete file from file system
      try {
        await fs.unlink(filepath);
        console.log(`[RecordingService] Deleted file: ${filepath}`);
      } catch (error: any) {
        console.warn(`[RecordingService] Could not delete file ${filepath}:`, error.message);
        // Continue anyway - file might already be deleted
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get recording statistics
   */
  async getStats(): Promise<RecordingStats> {
    // Total stats
    const totalResult = await pool.query(`
      SELECT 
        COUNT(*) as total_recordings,
        COALESCE(SUM(file_size), 0) as total_size,
        COALESCE(SUM(duration), 0) as total_duration
      FROM recordings
    `);

    // Stats by camera
    const byCameraResult = await pool.query(`
      SELECT 
        c.id as camera_id,
        c.name as camera_name,
        COUNT(r.id) as count,
        COALESCE(SUM(r.file_size), 0) as total_size,
        COALESCE(SUM(r.duration), 0) as total_duration
      FROM cameras c
      LEFT JOIN recordings r ON c.id = r.camera_id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `);

    // Stats by storage tier
    const byTierResult = await pool.query(`
      SELECT 
        storage_tier,
        COUNT(*) as count,
        COALESCE(SUM(file_size), 0) as total_size
      FROM recordings
      GROUP BY storage_tier
      ORDER BY storage_tier
    `);

    return {
      totalRecordings: parseInt(totalResult.rows[0].total_recordings, 10),
      totalSize: parseInt(totalResult.rows[0].total_size, 10),
      totalDuration: parseInt(totalResult.rows[0].total_duration, 10),
      byCamera: byCameraResult.rows.map(row => ({
        camera_id: row.camera_id,
        camera_name: row.camera_name,
        count: parseInt(row.count, 10),
        total_size: parseInt(row.total_size, 10),
        total_duration: parseInt(row.total_duration, 10)
      })),
      byStorageTier: byTierResult.rows.map(row => ({
        storage_tier: row.storage_tier,
        count: parseInt(row.count, 10),
        total_size: parseInt(row.total_size, 10)
      }))
    };
  }
}

// Export singleton instance
export const recordingService = new RecordingService();

