# API Backend Completion Plan - Phase 6

**Date:** October 20, 2025  
**Status:** Planning  
**Target:** Complete REST API for VMS system

---

## 📊 **CURRENT STATUS ASSESSMENT**

### **✅ Implemented (Good Foundation):**

#### **1. Authentication System:**
```yaml
Status: ✅ COMPLETE
Technology: JWT (jsonwebtoken)
Features:
  - User registration
  - Login with JWT tokens
  - Token refresh
  - Password change
  - Get user profile
  - Logout
  - Role-based access (admin, operator, viewer)
  
Endpoints:
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/refresh
  - GET /api/auth/me
  - POST /api/auth/change-password
  - POST /api/auth/logout
```

#### **2. Camera Management:**
```yaml
Status: ✅ COMPLETE (Basic CRUD)
Features:
  - List all cameras
  - Get camera details
  - Create camera
  - Update camera
  - Delete camera
  
Endpoints:
  - GET /api/cameras
  - GET /api/cameras/:id
  - POST /api/cameras
  - PUT /api/cameras/:id
  - DELETE /api/cameras/:id
```

#### **3. Live Streaming:**
```yaml
Status: ✅ COMPLETE
Integration: MediaMTX
Features:
  - List active streams
  - Get stream URLs (RTSP/HLS/WebRTC)
  - Stream status and statistics
  - MediaMTX health check
  
Endpoints:
  - GET /api/streams
  - GET /api/streams/camera/:id
  - GET /api/streams/status/:id
  - GET /api/streams/health
```

#### **4. Infrastructure:**
```yaml
Technology Stack:
  - Runtime: Node.js 20+
  - Language: TypeScript
  - Framework: Express.js
  - Database: PostgreSQL (pg driver)
  - Cache: Redis (planned, not used yet)
  - Authentication: JWT + bcrypt
  
Build Tools:
  - TypeScript compiler
  - ts-node (development)
  - nodemon (hot reload)
  - Jest (testing framework)
```

---

## ❌ **MISSING FEATURES (Need Implementation)**

### **1. Recording Management API:**
```yaml
Status: ❌ NOT IMPLEMENTED
Priority: HIGH
Reason: Core feature for VMS system

Required Endpoints:
  - GET /api/recordings                    # List all recordings
  - GET /api/recordings/:id                # Get recording details
  - GET /api/recordings/camera/:cameraId   # List by camera
  - GET /api/recordings/search             # Search recordings
  - GET /api/recordings/:id/download       # Download recording
  - GET /api/recordings/:id/stream         # Stream recording
  - DELETE /api/recordings/:id             # Delete recording
  - GET /api/recordings/stats              # Storage statistics

Features Needed:
  - File system integration (read recordings directory)
  - MP4 file metadata extraction (duration, size, codec)
  - Date/time range filtering
  - Pagination for large result sets
  - Download with range support (partial content)
  - Streaming with HLS/MP4 support
```

### **2. User Management API:**
```yaml
Status: ❌ NOT IMPLEMENTED
Priority: MEDIUM
Reason: Admin needs to manage users

Required Endpoints:
  - GET /api/users                # List users (admin only)
  - GET /api/users/:id            # Get user details
  - POST /api/users               # Create user (admin only)
  - PUT /api/users/:id            # Update user
  - DELETE /api/users/:id         # Delete user (admin only)
  - PUT /api/users/:id/role       # Change user role (admin only)
  - PUT /api/users/:id/status     # Enable/disable user (admin only)

Features Needed:
  - Admin-only middleware
  - User status (active/disabled)
  - User activity logging
```

### **3. System Monitoring API:**
```yaml
Status: ❌ NOT IMPLEMENTED
Priority: MEDIUM
Reason: Need system health visibility

Required Endpoints:
  - GET /api/system/status         # Overall system status
  - GET /api/system/stats          # System statistics
  - GET /api/system/cpu            # CPU usage
  - GET /api/system/gpu            # GPU usage (NVIDIA)
  - GET /api/system/disk           # Disk usage
  - GET /api/system/processes      # FFmpeg processes
  - GET /api/system/logs           # System logs

Features Needed:
  - Integration with PM2 API
  - nvidia-smi integration for GPU stats
  - Disk usage calculation
  - FFmpeg process monitoring
  - Log file reading and filtering
```

### **4. Camera Control API:**
```yaml
Status: ❌ NOT IMPLEMENTED
Priority: LOW
Reason: Nice to have, not critical

Required Endpoints:
  - POST /api/cameras/:id/restart  # Restart camera recording
  - POST /api/cameras/:id/snapshot # Take snapshot
  - GET /api/cameras/:id/stats     # Camera statistics

Features Needed:
  - Integration with recorder service
  - Process control (restart FFmpeg)
  - Snapshot capture from stream
```

### **5. Event/Alert System:**
```yaml
Status: ❌ NOT IMPLEMENTED
Priority: LOW
Reason: Future feature

Required Endpoints:
  - GET /api/events                # List events
  - GET /api/events/:id            # Get event details
  - POST /api/events               # Create event
  - PUT /api/events/:id            # Update event
  - DELETE /api/events/:id         # Delete event

Features Needed:
  - Event types (motion, offline, error)
  - Event notifications
  - Event history
```

---

## 🗄️ **DATABASE SCHEMA UPDATES**

### **Current Schema:**
```sql
-- Cameras table (EXISTS)
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    rtsp_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table (EXISTS)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Required New Tables:**

#### **1. Recordings Table:**
```sql
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    duration INTEGER NOT NULL,  -- seconds
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    codec VARCHAR(50),
    resolution VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recordings_camera_id ON recordings(camera_id);
CREATE INDEX idx_recordings_start_time ON recordings(start_time);
CREATE INDEX idx_recordings_end_time ON recordings(end_time);
```

#### **2. Events Table:**
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- motion, offline, error, etc.
    severity VARCHAR(50) NOT NULL,  -- info, warning, error, critical
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_camera_id ON events(camera_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created_at ON events(created_at);
```

#### **3. User Activity Log:**
```sql
CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at);
```

#### **4. System Stats (Optional):**
```sql
CREATE TABLE system_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpu_usage FLOAT,
    gpu_usage FLOAT,
    disk_usage BIGINT,
    memory_usage BIGINT,
    active_cameras INTEGER,
    active_streams INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_stats_created_at ON system_stats(created_at);
```

---

## 🔐 **SECURITY ENHANCEMENTS**

### **Current Security:**
```yaml
✅ JWT authentication
✅ Password hashing (bcrypt)
✅ Role-based access control (RBAC)
✅ CORS configuration
```

### **Required Enhancements:**

#### **1. RTSP URL Encryption:**
```yaml
Issue: RTSP URLs stored in plain text (contains credentials)
Solution: Encrypt RTSP URLs in database
Implementation:
  - Use crypto module for AES-256 encryption
  - Store encryption key in environment variable
  - Decrypt on read, encrypt on write
```

#### **2. Rate Limiting:**
```yaml
Issue: No rate limiting on API endpoints
Solution: Implement rate limiting middleware
Implementation:
  - Use express-rate-limit package
  - Different limits for different endpoints
  - Example: 100 requests/15 minutes per IP
```

#### **3. Input Validation:**
```yaml
Issue: Basic validation only
Solution: Comprehensive input validation
Implementation:
  - Use joi or zod for schema validation
  - Validate all user inputs
  - Sanitize inputs to prevent injection
```

#### **4. HTTPS:**
```yaml
Issue: HTTP only (development)
Solution: HTTPS in production
Implementation:
  - Use Let's Encrypt for SSL certificates
  - Redirect HTTP to HTTPS
  - HSTS headers
```

---

## 📝 **IMPLEMENTATION PRIORITY**

### **Phase 6.1: Recording Management (Week 1-2)**
```yaml
Priority: HIGH
Effort: Medium
Dependencies: None

Tasks:
  1. Create recordings table schema
  2. Implement file system scanner
  3. Implement recording endpoints
  4. Add pagination and filtering
  5. Implement download endpoint
  6. Add tests
```

### **Phase 6.2: User Management (Week 2-3)**
```yaml
Priority: MEDIUM
Effort: Low
Dependencies: None

Tasks:
  1. Create user activity table
  2. Implement admin middleware
  3. Implement user management endpoints
  4. Add user activity logging
  5. Add tests
```

### **Phase 6.3: System Monitoring (Week 3-4)**
```yaml
Priority: MEDIUM
Effort: Medium
Dependencies: None

Tasks:
  1. Integrate PM2 API
  2. Implement GPU monitoring (nvidia-smi)
  3. Implement system stats endpoints
  4. Add caching for expensive operations
  5. Add tests
```

### **Phase 6.4: Security Enhancements (Week 4)**
```yaml
Priority: HIGH
Effort: Low
Dependencies: None

Tasks:
  1. Implement RTSP URL encryption
  2. Add rate limiting
  3. Add input validation (joi/zod)
  4. Add security headers
  5. Add tests
```

---

## 📚 **NEXT STEPS**

1. **Review and approve this plan**
2. **Create detailed task breakdown for Phase 6.1**
3. **Set up development environment**
4. **Begin implementation**

---

**Document Status:** Draft  
**Last Updated:** October 20, 2025

