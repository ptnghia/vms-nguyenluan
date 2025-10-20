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
            '/api/recordings'
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