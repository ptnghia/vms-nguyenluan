export interface ProcessInfo {
    name: string;
    pid: number;
    status: string;
    cpu: number;
    memory: number;
    uptime: number;
    restarts: number;
}
export interface SystemStats {
    cpu: {
        usage: number;
        cores: number;
        model: string;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        usagePercent: number;
    };
    disk: {
        total: number;
        used: number;
        free: number;
        usagePercent: number;
        recordingsSize: number;
    };
    uptime: number;
}
export interface GPUStats {
    available: boolean;
    name?: string;
    driver?: string;
    utilization?: number;
    memory?: {
        total: number;
        used: number;
        free: number;
    };
    temperature?: number;
    encoderUtilization?: number;
    decoderUtilization?: number;
}
export declare class SystemService {
    /**
     * Get PM2 process list
     */
    getProcesses(): Promise<ProcessInfo[]>;
    /**
     * Get system statistics
     */
    getSystemStats(): Promise<SystemStats>;
    /**
     * Calculate CPU usage
     */
    private calculateCPUUsage;
    /**
     * Get disk statistics
     */
    private getDiskStats;
    /**
     * Get recordings directory size
     */
    private getRecordingsSize;
    /**
     * Get GPU statistics
     */
    getGPUStats(): Promise<GPUStats>;
    /**
     * Get CPU details per core
     */
    getCPUDetails(): Promise<{
        cores: Array<{
            core: number;
            model: string;
            speed: number;
            times: {
                user: number;
                nice: number;
                sys: number;
                idle: number;
                irq: number;
            };
        }>;
        loadAverage: number[];
    }>;
    /**
     * Get FFmpeg processes
     */
    getFFmpegProcesses(): Promise<Array<{
        pid: number;
        cpu: number;
        memory: number;
        command: string;
    }>>;
    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes: number): string;
    /**
     * Format uptime to human-readable string
     */
    formatUptime(seconds: number): string;
}
export declare const systemService: SystemService;
//# sourceMappingURL=system.service.d.ts.map