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
exports.metadataService = exports.MetadataService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class MetadataService {
    /**
     * Extract video metadata using ffprobe
     */
    async extractMetadata(filePath) {
        try {
            // Check if file exists
            await fs.access(filePath);
            // Get file size
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;
            // Run ffprobe to get video metadata
            const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
            const { stdout } = await execAsync(command);
            const data = JSON.parse(stdout);
            // Find video stream
            const videoStream = data.streams?.find((s) => s.codec_type === 'video');
            if (!videoStream) {
                throw new Error('No video stream found in file');
            }
            // Extract metadata
            const duration = parseFloat(data.format?.duration || '0');
            const width = videoStream.width || 0;
            const height = videoStream.height || 0;
            const resolution = `${width}x${height}`;
            // Parse FPS (can be in format "25/1" or "29.97")
            let fps = 0;
            if (videoStream.r_frame_rate) {
                const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
                fps = den ? Math.round(num / den) : num;
            }
            else if (videoStream.avg_frame_rate) {
                const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
                fps = den ? Math.round(num / den) : num;
            }
            const codec = videoStream.codec_name || 'unknown';
            const bitrate = parseInt(data.format?.bit_rate || '0', 10);
            const format = data.format?.format_name?.split(',')[0] || 'unknown';
            return {
                duration: Math.floor(duration),
                fileSize,
                resolution,
                width,
                height,
                fps,
                codec,
                bitrate,
                format
            };
        }
        catch (error) {
            throw new Error(`Failed to extract metadata from ${filePath}: ${error.message}`);
        }
    }
    /**
     * Extract metadata from multiple files in parallel
     */
    async extractMetadataBatch(filePaths) {
        const results = new Map();
        // Process in batches of 5 to avoid overwhelming the system
        const batchSize = 5;
        for (let i = 0; i < filePaths.length; i += batchSize) {
            const batch = filePaths.slice(i, i + batchSize);
            const promises = batch.map(async (filePath) => {
                try {
                    const metadata = await this.extractMetadata(filePath);
                    results.set(filePath, metadata);
                }
                catch (error) {
                    console.error(`Failed to extract metadata for ${filePath}:`, error.message);
                    // Continue with other files
                }
            });
            await Promise.all(promises);
        }
        return results;
    }
    /**
     * Parse filename to extract start time
     * Expected format: camera_name_YYYYMMDD_HHMMSS.mp4
     */
    parseFilenameTimestamp(filename) {
        try {
            // Extract timestamp from filename
            // Format: camera_name_20251020_143025.mp4
            const match = filename.match(/(\d{8})_(\d{6})/);
            if (!match)
                return null;
            const [, dateStr, timeStr] = match;
            const year = parseInt(dateStr.substring(0, 4), 10);
            const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-indexed
            const day = parseInt(dateStr.substring(6, 8), 10);
            const hour = parseInt(timeStr.substring(0, 2), 10);
            const minute = parseInt(timeStr.substring(2, 4), 10);
            const second = parseInt(timeStr.substring(4, 6), 10);
            return new Date(year, month, day, hour, minute, second);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Calculate end time from start time and duration
     */
    calculateEndTime(startTime, durationSeconds) {
        return new Date(startTime.getTime() + durationSeconds * 1000);
    }
    /**
     * Format file size to human-readable string
     */
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
    /**
     * Format duration to human-readable string (HH:MM:SS)
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return [hours, minutes, secs]
            .map(v => v.toString().padStart(2, '0'))
            .join(':');
    }
    /**
     * Validate video file
     */
    async validateVideoFile(filePath) {
        try {
            const metadata = await this.extractMetadata(filePath);
            // Basic validation
            if (metadata.duration <= 0)
                return false;
            if (metadata.width <= 0 || metadata.height <= 0)
                return false;
            if (metadata.fps <= 0)
                return false;
            if (!metadata.codec || metadata.codec === 'unknown')
                return false;
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get video thumbnail (first frame)
     */
    async generateThumbnail(videoPath, outputPath, timeOffset = 1) {
        try {
            const command = `ffmpeg -i "${videoPath}" -ss ${timeOffset} -vframes 1 -q:v 2 "${outputPath}" -y`;
            await execAsync(command);
            return outputPath;
        }
        catch (error) {
            throw new Error(`Failed to generate thumbnail: ${error.message}`);
        }
    }
    /**
     * Check if ffprobe is available
     */
    async checkFfprobeAvailable() {
        try {
            await execAsync('ffprobe -version');
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.MetadataService = MetadataService;
// Export singleton instance
exports.metadataService = new MetadataService();
//# sourceMappingURL=metadata.service.js.map