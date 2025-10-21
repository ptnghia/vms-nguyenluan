"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_service_1 = require("../services/system.service");
const activity_service_1 = require("../services/activity.service");
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
/**
 * GET /api/system/status
 * Overall system status
 */
router.get('/status', auth_1.requireOperator, async (req, res) => {
    try {
        // Get PM2 processes
        const processes = await system_service_1.systemService.getProcesses();
        // Get camera count
        const camerasResult = await database_1.default.query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM cameras");
        const cameras = {
            total: parseInt(camerasResult.rows[0].total, 10),
            active: parseInt(camerasResult.rows[0].active || '0', 10)
        };
        // Get recording count
        const recordingsResult = await database_1.default.query('SELECT COUNT(*) as total FROM recordings');
        const recordings = {
            total: parseInt(recordingsResult.rows[0].total, 10)
        };
        // Check service health
        const servicesHealth = processes.map(proc => ({
            name: proc.name,
            status: proc.status,
            healthy: proc.status === 'online'
        }));
        const allHealthy = servicesHealth.every(s => s.healthy);
        res.json({
            success: true,
            data: {
                health: allHealthy ? 'healthy' : 'degraded',
                services: servicesHealth,
                cameras,
                recordings,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[GET /api/system/status] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system status',
            message: error.message
        });
    }
});
/**
 * GET /api/system/stats
 * System statistics (CPU, GPU, memory, disk)
 */
router.get('/stats', auth_1.requireOperator, async (req, res) => {
    try {
        const stats = await system_service_1.systemService.getSystemStats();
        const gpu = await system_service_1.systemService.getGPUStats();
        // Format values
        const formatted = {
            cpu: {
                ...stats.cpu,
                usageFormatted: `${stats.cpu.usage}%`
            },
            memory: {
                ...stats.memory,
                totalFormatted: system_service_1.systemService.formatBytes(stats.memory.total),
                usedFormatted: system_service_1.systemService.formatBytes(stats.memory.used),
                freeFormatted: system_service_1.systemService.formatBytes(stats.memory.free)
            },
            disk: {
                ...stats.disk,
                totalFormatted: system_service_1.systemService.formatBytes(stats.disk.total),
                usedFormatted: system_service_1.systemService.formatBytes(stats.disk.used),
                freeFormatted: system_service_1.systemService.formatBytes(stats.disk.free),
                recordingsSizeFormatted: system_service_1.systemService.formatBytes(stats.disk.recordingsSize)
            },
            gpu: gpu.available ? {
                ...gpu,
                memory: gpu.memory ? {
                    ...gpu.memory,
                    totalFormatted: system_service_1.systemService.formatBytes(gpu.memory.total),
                    usedFormatted: system_service_1.systemService.formatBytes(gpu.memory.used),
                    freeFormatted: system_service_1.systemService.formatBytes(gpu.memory.free)
                } : undefined
            } : { available: false },
            uptime: stats.uptime,
            uptimeFormatted: system_service_1.systemService.formatUptime(stats.uptime)
        };
        res.json({
            success: true,
            data: formatted
        });
    }
    catch (error) {
        console.error('[GET /api/system/stats] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system statistics',
            message: error.message
        });
    }
});
/**
 * GET /api/system/cpu
 * CPU usage details
 */
router.get('/cpu', auth_1.requireOperator, async (req, res) => {
    try {
        const cpuDetails = await system_service_1.systemService.getCPUDetails();
        res.json({
            success: true,
            data: cpuDetails
        });
    }
    catch (error) {
        console.error('[GET /api/system/cpu] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch CPU details',
            message: error.message
        });
    }
});
/**
 * GET /api/system/gpu
 * GPU usage details
 */
router.get('/gpu', auth_1.requireOperator, async (req, res) => {
    try {
        const gpu = await system_service_1.systemService.getGPUStats();
        if (!gpu.available) {
            return res.json({
                success: true,
                data: { available: false, message: 'GPU not available or nvidia-smi not found' }
            });
        }
        // Format memory
        const formatted = {
            ...gpu,
            memory: gpu.memory ? {
                ...gpu.memory,
                totalFormatted: system_service_1.systemService.formatBytes(gpu.memory.total),
                usedFormatted: system_service_1.systemService.formatBytes(gpu.memory.used),
                freeFormatted: system_service_1.systemService.formatBytes(gpu.memory.free)
            } : undefined
        };
        res.json({
            success: true,
            data: formatted
        });
    }
    catch (error) {
        console.error('[GET /api/system/gpu] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch GPU details',
            message: error.message
        });
    }
});
/**
 * GET /api/system/disk
 * Disk usage details
 */
router.get('/disk', auth_1.requireOperator, async (req, res) => {
    try {
        const stats = await system_service_1.systemService.getSystemStats();
        const formatted = {
            total: stats.disk.total,
            used: stats.disk.used,
            free: stats.disk.free,
            usagePercent: stats.disk.usagePercent,
            recordingsSize: stats.disk.recordingsSize,
            totalFormatted: system_service_1.systemService.formatBytes(stats.disk.total),
            usedFormatted: system_service_1.systemService.formatBytes(stats.disk.used),
            freeFormatted: system_service_1.systemService.formatBytes(stats.disk.free),
            recordingsSizeFormatted: system_service_1.systemService.formatBytes(stats.disk.recordingsSize)
        };
        res.json({
            success: true,
            data: formatted
        });
    }
    catch (error) {
        console.error('[GET /api/system/disk] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch disk details',
            message: error.message
        });
    }
});
/**
 * GET /api/system/processes
 * FFmpeg processes list
 */
router.get('/processes', auth_1.requireOperator, async (req, res) => {
    try {
        const pm2Processes = await system_service_1.systemService.getProcesses();
        const ffmpegProcesses = await system_service_1.systemService.getFFmpegProcesses();
        res.json({
            success: true,
            data: {
                pm2: pm2Processes,
                ffmpeg: ffmpegProcesses
            }
        });
    }
    catch (error) {
        console.error('[GET /api/system/processes] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch processes',
            message: error.message
        });
    }
});
/**
 * GET /api/system/logs
 * System logs (PM2 logs)
 */
router.get('/logs', auth_1.requireAdmin, async (req, res) => {
    try {
        const { service = 'vms-api', lines = '50', type = 'out' } = req.query;
        // Validate service name to prevent command injection
        const validServices = ['vms-api', 'vms-recorder', 'vms-mediamtx'];
        if (!validServices.includes(service)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid service name'
            });
        }
        // Validate type
        const validTypes = ['out', 'err', 'all'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid log type'
            });
        }
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        let command = `pm2 logs ${service} --lines ${lines} --nostream`;
        if (type === 'err') {
            command += ' --err';
        }
        else if (type === 'out') {
            command += ' --out';
        }
        const { stdout } = await execAsync(command);
        // Log activity
        await activity_service_1.activityService.logFromRequest(req, 'view_system_logs', {
            resourceType: 'system',
            metadata: { service, lines, type }
        });
        res.json({
            success: true,
            data: {
                service,
                type,
                lines: stdout.split('\n').filter((line) => line.trim())
            }
        });
    }
    catch (error) {
        console.error('[GET /api/system/logs] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=system.js.map