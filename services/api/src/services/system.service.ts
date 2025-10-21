import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

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

export class SystemService {
  /**
   * Get PM2 process list
   */
  async getProcesses(): Promise<ProcessInfo[]> {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);

      return processes.map((proc: any) => ({
        name: proc.name,
        pid: proc.pid,
        status: proc.pm2_env.status,
        cpu: proc.monit.cpu,
        memory: proc.monit.memory,
        uptime: Date.now() - proc.pm2_env.pm_uptime,
        restarts: proc.pm2_env.restart_time
      }));
    } catch (error) {
      console.error('[SystemService] Failed to get PM2 processes:', error);
      return [];
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<SystemStats> {
    // CPU stats
    const cpus = os.cpus();
    const cpuUsage = this.calculateCPUUsage();

    // Memory stats
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Disk stats
    const diskStats = await this.getDiskStats();

    // Recordings size
    const recordingsSize = await this.getRecordingsSize();

    return {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: Math.round((usedMem / totalMem) * 100 * 100) / 100
      },
      disk: {
        total: diskStats.total,
        used: diskStats.used,
        free: diskStats.free,
        usagePercent: diskStats.usagePercent,
        recordingsSize
      },
      uptime: os.uptime()
    };
  }

  /**
   * Calculate CPU usage
   */
  private calculateCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return Math.round(usage * 100) / 100;
  }

  /**
   * Get disk statistics
   */
  private async getDiskStats(): Promise<{
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  }> {
    try {
      const { stdout } = await execAsync('df -B1 / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const free = parseInt(parts[3], 10);
      const usagePercent = Math.round((used / total) * 100 * 100) / 100;

      return { total, used, free, usagePercent };
    } catch (error) {
      console.error('[SystemService] Failed to get disk stats:', error);
      return { total: 0, used: 0, free: 0, usagePercent: 0 };
    }
  }

  /**
   * Get recordings directory size
   */
  private async getRecordingsSize(): Promise<number> {
    try {
      const recordingPath = process.env.RECORDING_PATH || 
        path.join(process.cwd(), '..', '..', 'data', 'recordings');
      
      const { stdout } = await execAsync(`du -sb "${recordingPath}" 2>/dev/null || echo "0"`);
      const size = parseInt(stdout.split('\t')[0], 10);
      
      return size || 0;
    } catch (error) {
      console.error('[SystemService] Failed to get recordings size:', error);
      return 0;
    }
  }

  /**
   * Get GPU statistics
   */
  async getGPUStats(): Promise<GPUStats> {
    try {
      // Check if nvidia-smi is available
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=name,driver_version,utilization.gpu,memory.total,memory.used,memory.free,temperature.gpu,utilization.encoder,utilization.decoder --format=csv,noheader,nounits'
      );

      const parts = stdout.trim().split(',').map(s => s.trim());

      return {
        available: true,
        name: parts[0],
        driver: parts[1],
        utilization: parseFloat(parts[2]),
        memory: {
          total: parseInt(parts[3], 10) * 1024 * 1024, // Convert MB to bytes
          used: parseInt(parts[4], 10) * 1024 * 1024,
          free: parseInt(parts[5], 10) * 1024 * 1024
        },
        temperature: parseInt(parts[6], 10),
        encoderUtilization: parseFloat(parts[7]),
        decoderUtilization: parseFloat(parts[8])
      };
    } catch (error) {
      // GPU not available or nvidia-smi not found
      return { available: false };
    }
  }

  /**
   * Get CPU details per core
   */
  async getCPUDetails(): Promise<{
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
  }> {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    return {
      cores: cpus.map((cpu, index) => ({
        core: index,
        model: cpu.model,
        speed: cpu.speed,
        times: cpu.times
      })),
      loadAverage: loadAvg
    };
  }

  /**
   * Get FFmpeg processes
   */
  async getFFmpegProcesses(): Promise<Array<{
    pid: number;
    cpu: number;
    memory: number;
    command: string;
  }>> {
    try {
      const { stdout } = await execAsync(
        'ps aux | grep ffmpeg | grep -v grep | awk \'{print $2,$3,$4,$11}\''
      );

      if (!stdout.trim()) {
        return [];
      }

      const lines = stdout.trim().split('\n');
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[0], 10),
          cpu: parseFloat(parts[1]),
          memory: parseFloat(parts[2]),
          command: parts.slice(3).join(' ')
        };
      });
    } catch (error) {
      console.error('[SystemService] Failed to get FFmpeg processes:', error);
      return [];
    }
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
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
   * Format uptime to human-readable string
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

// Export singleton instance
export const systemService = new SystemService();

