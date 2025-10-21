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
export declare class RecordingService {
    private getRecordingPath;
    /**
     * Scan file system and sync recordings to database
     */
    scanAndSync(): Promise<{
        scanned: number;
        synced: number;
        errors: number;
    }>;
    /**
     * Get recordings with filters and pagination
     */
    getRecordings(filter: RecordingFilter): Promise<{
        recordings: Recording[];
        total: number;
    }>;
    /**
     * Get single recording by ID
     */
    getRecordingById(id: string): Promise<Recording | null>;
    /**
     * Delete recording
     */
    deleteRecording(id: string): Promise<boolean>;
    /**
     * Get recording statistics
     */
    getStats(): Promise<RecordingStats>;
}
export declare const recordingService: RecordingService;
//# sourceMappingURL=recording.service.d.ts.map