import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cameraRoutes from './routes/cameras';
import authRoutes from './routes/auth';
import streamRoutes from './routes/streams';
import recordingRoutes from './routes/recordings';
import userRoutes from './routes/users';
import activityRoutes from './routes/activity';
import systemRoutes from './routes/system';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Allow all origins in development
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'vms-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
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
app.use('/api/auth', authRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/system', systemRoutes);

app.get('/api', (req: Request, res: Response) => {
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
