# 03_API_Management_Nodejs.md

## 🎯 Mục tiêu
- Quản lý camera, segment recording và **live streaming**.
- **Authentication & Authorization** với role-based access.
- **Live stream API** với WebRTC/HLS support.
- **Real-time events** (motion, violations) qua WebSocket.
- Playback API với timeline search.
- **Mobile API** cho CSGT và security personnel.

## 🧰 Công nghệ
- Node.js (Express/NestJS).
- PostgreSQL.

## 📡 Endpoint chính

### 🔐 Authentication
- `POST /auth/login` - User login với MFA support
- `POST /auth/refresh` - JWT token refresh
- `POST /auth/logout` - Session cleanup

## 🔐 Security & Rate Limiting

### **API Rate Limiting Strategy**
```typescript
// Rate limiting configuration
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Global rate limit
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Auth endpoint rate limit (stricter)
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts, please try again later'
});

// Live streaming rate limit (per user)
const streamLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:stream:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Max 20 stream requests per minute
  keyGenerator: (req) => req.user.id, // Per user, not per IP
  message: 'Too many stream requests, please slow down'
});

// Apply limiters
app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/live/', streamLimiter);
```

### **JWT Authentication Middleware**
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JWTPayload {
  userId: string;
  username: string;
  roleId: string;
  permissions: string[];
  zoneAccess: string[];
  iat: number;
  exp: number;
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = '7d'; // Long-lived refresh token

export const generateTokens = (user: User) => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    username: user.username,
    roleId: user.role_id,
    permissions: user.role.permissions,
    zoneAccess: user.zone_access
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
};

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Role-based access control middleware
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const hasPermission = permissions.some(permission =>
      req.user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permissions
      });
    }
    
    next();
  };
};

// Zone-based access control
export const requireZoneAccess = (req: Request, res: Response, next: NextFunction) => {
  const cameraId = req.params.camera_id || req.body.camera_id;
  
  if (!cameraId) {
    return next();
  }
  
  // Check if user has access to camera's zone
  db.cameras.findById(cameraId).then(camera => {
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    if (req.user.permissions.includes('access_all_zones')) {
      return next();
    }
    
    if (req.user.zoneAccess.includes(camera.zone_id)) {
      return next();
    }
    
    return res.status(403).json({
      error: 'Access denied to this zone',
      camera_zone: camera.zone_id
    });
  });
};
```

### **WebSocket Security**
```typescript
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true
  }
});

// WebSocket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    socket.data.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Room-based access control
io.on('connection', (socket) => {
  console.log(`User ${socket.data.user.userId} connected`);
  
  // Join camera event rooms based on zone access
  socket.on('subscribe:camera', async (cameraId: string) => {
    const camera = await db.cameras.findById(cameraId);
    
    if (!camera) {
      socket.emit('error', { message: 'Camera not found' });
      return;
    }
    
    // Check zone access
    if (!socket.data.user.zoneAccess.includes(camera.zone_id) &&
        !socket.data.user.permissions.includes('access_all_zones')) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }
    
    // Join room for this camera's events
    socket.join(`camera:${cameraId}`);
    socket.emit('subscribed', { cameraId });
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.data.user.userId} disconnected`);
  });
});

// Broadcast event to authorized users only
export const broadcastCameraEvent = (cameraId: string, event: any) => {
  io.to(`camera:${cameraId}`).emit('camera:event', event);
};
```

### 📹 Camera Management
- `GET/POST/PUT/DELETE /cameras` - CRUD cameras
- `GET /cameras/{id}/status` - Real-time camera status
- `POST /cameras/{id}/ptz` - PTZ control commands

### 🎥 Live Streaming
- `GET /live/cameras` - Available live streams
- `GET /live/{camera_id}/webrtc` - WebRTC stream URL + ICE
- `GET /live/{camera_id}/hls` - HLS playlist URL
- `POST /live/{camera_id}/start` - Start live stream
- `POST /live/{camera_id}/stop` - Stop live stream
- `GET /live/multi/{camera_ids}` - Multi-camera live view

### 📼 Recording & Playback
- `POST /recordings/start/{camera_id}` - Start recording
- `POST /recordings/stop/{camera_id}` - Stop recording
- `GET /playback/{camera_id}` - Get segments by time range
- `GET /playback/export` - Export video clips

### 🚨 Events & Alerts
- `WebSocket /events` - Real-time event stream
- `GET /events` - Event history với filtering
- `POST /events/{id}/acknowledge` - Acknowledge alerts

### 👥 User Management
- `GET/POST/PUT/DELETE /users` - User CRUD
- `GET/POST/PUT/DELETE /roles` - Role management
- `GET /permissions` - Available permissions

## 🗃️ Database Schema
```sql
-- Camera management
CREATE TABLE cameras (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  rtsp_url_main TEXT NOT NULL,
  rtsp_url_sub TEXT, -- for live streaming
  location JSONB, -- GPS coordinates
  zone_id UUID REFERENCES zones(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recording segments
CREATE TABLE segments (
  id UUID PRIMARY KEY,
  camera_id UUID REFERENCES cameras(id),
  file_path TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  file_size BIGINT,
  thumbnail_path TEXT,
  metadata JSONB, -- motion events, violations, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Live streaming sessions
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY,
  camera_id UUID REFERENCES cameras(id),
  user_id UUID REFERENCES users(id),
  stream_type TEXT, -- webrtc, hls, rtmp
  stream_url TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  client_info JSONB -- browser, mobile app, etc.
);

-- Events & Alerts
CREATE TABLE events (
  id UUID PRIMARY KEY,
  camera_id UUID REFERENCES cameras(id),
  event_type TEXT NOT NULL, -- motion, violation, alert
  severity TEXT DEFAULT 'info', -- info, warning, critical
  title TEXT,
  description TEXT,
  metadata JSONB, -- coordinates, confidence, etc.
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User management với RBAC
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role_id UUID REFERENCES roles(id),
  zone_access UUID[] DEFAULT '{}', -- zones user can access
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Geographic zones for access control
CREATE TABLE zones (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  boundary GEOMETRY, -- PostGIS for geographic queries
  parent_zone_id UUID REFERENCES zones(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```
