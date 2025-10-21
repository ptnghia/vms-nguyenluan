import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface VideoMetadata {
  duration: number;        // seconds
  fileSize: number;        // bytes
  resolution: string;      // e.g., "1920x1080"
  width: number;
  height: number;
  fps: number;
  codec: string;           // e.g., "h264", "hevc"
  bitrate: number;         // bits per second
  format: string;          // e.g., "mp4"
}

export class MetadataService {
  /**
   * Extract video metadata using ffprobe
   */
  async extractMetadata(filePath: string): Promise<VideoMetadata> {
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
      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
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
      } else if (videoStream.avg_frame_rate) {
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
    } catch (error: any) {
      throw new Error(`Failed to extract metadata from ${filePath}: ${error.message}`);
    }
  }

  /**
   * Extract metadata from multiple files in parallel
   */
  async extractMetadataBatch(filePaths: string[]): Promise<Map<string, VideoMetadata>> {
    const results = new Map<string, VideoMetadata>();
    
    // Process in batches of 5 to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const promises = batch.map(async (filePath) => {
        try {
          const metadata = await this.extractMetadata(filePath);
          results.set(filePath, metadata);
        } catch (error: any) {
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
  parseFilenameTimestamp(filename: string): Date | null {
    try {
      // Extract timestamp from filename
      // Format: camera_name_20251020_143025.mp4
      const match = filename.match(/(\d{8})_(\d{6})/);
      if (!match) return null;

      const [, dateStr, timeStr] = match;
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-indexed
      const day = parseInt(dateStr.substring(6, 8), 10);
      const hour = parseInt(timeStr.substring(0, 2), 10);
      const minute = parseInt(timeStr.substring(2, 4), 10);
      const second = parseInt(timeStr.substring(4, 6), 10);

      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate end time from start time and duration
   */
  calculateEndTime(startTime: Date, durationSeconds: number): Date {
    return new Date(startTime.getTime() + durationSeconds * 1000);
  }

  /**
   * Format file size to human-readable string
   */
  formatFileSize(bytes: number): string {
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
  formatDuration(seconds: number): string {
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
  async validateVideoFile(filePath: string): Promise<boolean> {
    try {
      const metadata = await this.extractMetadata(filePath);
      
      // Basic validation
      if (metadata.duration <= 0) return false;
      if (metadata.width <= 0 || metadata.height <= 0) return false;
      if (metadata.fps <= 0) return false;
      if (!metadata.codec || metadata.codec === 'unknown') return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get video thumbnail (first frame)
   */
  async generateThumbnail(
    videoPath: string, 
    outputPath: string, 
    timeOffset: number = 1
  ): Promise<string> {
    try {
      const command = `ffmpeg -i "${videoPath}" -ss ${timeOffset} -vframes 1 -q:v 2 "${outputPath}" -y`;
      await execAsync(command);
      return outputPath;
    } catch (error: any) {
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  /**
   * Check if ffprobe is available
   */
  async checkFfprobeAvailable(): Promise<boolean> {
    try {
      await execAsync('ffprobe -version');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const metadataService = new MetadataService();

