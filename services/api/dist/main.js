"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cameras_1 = __importDefault(require("./routes/cameras"));
const auth_1 = __importDefault(require("./routes/auth"));
const streams_1 = __importDefault(require("./routes/streams"));
const recordings_1 = __importDefault(require("./routes/recordings"));
const users_1 = __importDefault(require("./routes/users"));
const activity_1 = __importDefault(require("./routes/activity"));
const system_1 = __importDefault(require("./routes/system"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*', // Allow all origins in development
    credentials: true,
}));
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'vms-api',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'VMS API Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api: '/api',
            docs: '/api/docs'
        }
    });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/cameras', cameras_1.default);
app.use('/api/streams', streams_1.default);
app.use('/api/recordings', recordings_1.default);
app.use('/api/users', users_1.default);
app.use('/api/activity', activity_1.default);
app.use('/api/system', system_1.default);
app.get('/api', (req, res) => {
    res.json({
        message: 'VMS API v1.0.0',
        endpoints: [
            'POST /api/auth/register - Register user',
            'POST /api/auth/login - Login',
            'POST /api/auth/refresh - Refresh token',
            'GET /api/auth/me - Get profile',
            'POST /api/auth/change-password - Change password',
            'POST /api/auth/logout - Logout',
            'GET /api/cameras - List all cameras',
            'POST /api/cameras - Create camera',
            'GET /api/cameras/:id - Get camera',
            'PUT /api/cameras/:id - Update camera',
            'DELETE /api/cameras/:id - Delete camera',
            'GET /api/streams - List active streams',
            'GET /api/streams/camera/:id - Get camera stream URLs',
            'GET /api/streams/status/:id - Get stream status',
            'GET /api/streams/health - MediaMTX health',
            'GET /api/recordings - List recordings',
            'GET /api/recordings/search - Search recordings',
            'GET /api/recordings/stats - Recording statistics',
            'GET /api/recordings/:id - Get recording details',
            'GET /api/recordings/:id/download - Download recording',
            'DELETE /api/recordings/:id - Delete recording (admin)',
            'POST /api/recordings/sync - Sync file system (admin)',
            'GET /api/users - List users (admin)',
            'GET /api/users/stats - User statistics (admin)',
            'GET /api/users/:id - Get user details',
            'POST /api/users - Create user (admin)',
            'PUT /api/users/:id - Update user',
            'PUT /api/users/:id/role - Change user role (admin)',
            'DELETE /api/users/:id - Delete user (admin)',
            'GET /api/activity - List activity logs (admin)',
            'GET /api/activity/stats - Activity statistics (admin)',
            'GET /api/activity/me - My recent activities',
            'GET /api/activity/:id - Get activity log (admin)',
            'DELETE /api/activity/cleanup - Cleanup old logs (admin)',
            'GET /api/system/status - System status (operator)',
            'GET /api/system/stats - System statistics (operator)',
            'GET /api/system/cpu - CPU details (operator)',
            'GET /api/system/gpu - GPU details (operator)',
            'GET /api/system/disk - Disk usage (operator)',
            'GET /api/system/processes - Process list (operator)',
            'GET /api/system/logs - System logs (admin)'
        ]
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 VMS API Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 API: http://localhost:${PORT}/api`);
    console.log(`📍 Cameras: http://localhost:${PORT}/api/cameras`);
});
//# sourceMappingURL=main.js.map