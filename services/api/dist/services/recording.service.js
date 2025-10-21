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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordingService = exports.RecordingService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const database_1 = __importDefault(require("../config/database"));
const metadata_service_1 = require("./metadata.service");
class RecordingService {
    getRecordingPath() {
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
    async scanAndSync() {
        const recordingPath = this.getRecordingPath();
        console.log(`[RecordingService] Starting scan of ${recordingPath}`);
        let scanned = 0;
        let synced = 0;
        let errors = 0;
        try {
            // Get all cameras from database
            const camerasResult = await database_1.default.query('SELECT id, name FROM cameras');
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
                            const existingResult = await database_1.default.query('SELECT id FROM recordings WHERE filepath = $1', [filepath]);
                            if (existingResult.rows.length > 0) {
                                // Already in database, skip
                                continue;
                            }
                            // Extract metadata
                            const metadata = await metadata_service_1.metadataService.extractMetadata(filepath);
                            // Parse start time from filename
                            const startTime = metadata_service_1.metadataService.parseFilenameTimestamp(filename);
                            if (!startTime) {
                                console.warn(`[RecordingService] Could not parse timestamp from filename: ${filename}`);
                                errors++;
                                continue;
                            }
                            // Calculate end time
                            const endTime = metadata_service_1.metadataService.calculateEndTime(startTime, metadata.duration);
                            // Insert into database
                            await database_1.default.query(`INSERT INTO recordings 
                (camera_id, filename, filepath, file_size, start_time, end_time, 
                 duration, resolution, fps, codec, bitrate, storage_tier)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (camera_id, start_time) DO NOTHING`, [
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
                            ]);
                            synced++;
                            console.log(`[RecordingService] Synced: ${filename}`);
                        }
                        catch (error) {
                            console.error(`[RecordingService] Error processing ${filename}:`, error.message);
                            errors++;
                        }
                    }
                }
                catch (error) {
                    console.error(`[RecordingService] Error scanning camera ${camera.name}:`, error.message);
                }
            }
            console.log(`[RecordingService] Scan complete: ${scanned} scanned, ${synced} synced, ${errors} errors`);
            return { scanned, synced, errors };
        }
        catch (error) {
            console.error('[RecordingService] Scan failed:', error.message);
            throw error;
        }
    }
    /**
     * Get recordings with filters and pagination
     */
    async getRecordings(filter) {
        const page = filter.page || 1;
        const limit = filter.limit || 20;
        const offset = (page - 1) * limit;
        let query = `
      SELECT r.*, c.name as camera_name
      FROM recordings r
      JOIN cameras c ON r.camera_id = c.id
      WHERE 1=1
    `;
        const params = [];
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
        const countResult = await database_1.default.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);
        // Add sorting and pagination
        query += ` ORDER BY r.start_time DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);
        const result = await database_1.default.query(query, params);
        return { recordings: result.rows, total };
    }
    /**
     * Get single recording by ID
     */
    async getRecordingById(id) {
        const result = await database_1.default.query(`SELECT r.*, c.name as camera_name
       FROM recordings r
       JOIN cameras c ON r.camera_id = c.id
       WHERE r.id = $1`, [id]);
        return result.rows[0] || null;
    }
    /**
     * Delete recording
     */
    async deleteRecording(id) {
        const client = await database_1.default.connect();
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
            }
            catch (error) {
                console.warn(`[RecordingService] Could not delete file ${filepath}:`, error.message);
                // Continue anyway - file might already be deleted
            }
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get recording statistics
     */
    async getStats() {
        // Total stats
        const totalResult = await database_1.default.query(`
      SELECT 
        COUNT(*) as total_recordings,
        COALESCE(SUM(file_size), 0) as total_size,
        COALESCE(SUM(duration), 0) as total_duration
      FROM recordings
    `);
        // Stats by camera
        const byCameraResult = await database_1.default.query(`
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
        const byTierResult = await database_1.default.query(`
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
exports.RecordingService = RecordingService;
// Export singleton instance
exports.recordingService = new RecordingService();
//# sourceMappingURL=recording.service.js.map