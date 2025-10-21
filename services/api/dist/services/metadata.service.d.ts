export interface VideoMetadata {
    duration: number;
    fileSize: number;
    resolution: string;
    width: number;
    height: number;
    fps: number;
    codec: string;
    bitrate: number;
    format: string;
}
export declare class MetadataService {
    /**
     * Extract video metadata using ffprobe
     */
    extractMetadata(filePath: string): Promise<VideoMetadata>;
    /**
     * Extract metadata from multiple files in parallel
     */
    extractMetadataBatch(filePaths: string[]): Promise<Map<string, VideoMetadata>>;
    /**
     * Parse filename to extract start time
     * Expected format: camera_name_YYYYMMDD_HHMMSS.mp4
     */
    parseFilenameTimestamp(filename: string): Date | null;
    /**
     * Calculate end time from start time and duration
     */
    calculateEndTime(startTime: Date, durationSeconds: number): Date;
    /**
     * Format file size to human-readable string
     */
    formatFileSize(bytes: number): string;
    /**
     * Format duration to human-readable string (HH:MM:SS)
     */
    formatDuration(seconds: number): string;
    /**
     * Validate video file
     */
    validateVideoFile(filePath: string): Promise<boolean>;
    /**
     * Get video thumbnail (first frame)
     */
    generateThumbnail(videoPath: string, outputPath: string, timeOffset?: number): Promise<string>;
    /**
     * Check if ffprobe is available
     */
    checkFfprobeAvailable(): Promise<boolean>;
}
export declare const metadataService: MetadataService;
//# sourceMappingURL=metadata.service.d.ts.map