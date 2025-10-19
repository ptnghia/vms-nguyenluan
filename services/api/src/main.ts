import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cameraRoutes from './routes/cameras';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
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
app.use('/api/cameras', cameraRoutes);

app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'VMS API v1.0.0',
    endpoints: [
      'GET /api/cameras - List all cameras',
      'POST /api/cameras - Create camera',
      'GET /api/cameras/:id - Get camera',
      'PUT /api/cameras/:id - Update camera',
      'DELETE /api/cameras/:id - Delete camera',
      '/api/recordings',
      '/api/streams',
      '/api/events',
      '/api/users'
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
