# API Documentation

**Status:** ⚠️ In Development  
**Version:** 0.1 (Basic implementation)

---

## 📋 **Current API Endpoints**

### **Cameras:**
```
GET  /api/cameras          # List all cameras
GET  /api/cameras/:id      # Get camera details
POST /api/cameras          # Add new camera
PUT  /api/cameras/:id      # Update camera
DELETE /api/cameras/:id    # Delete camera
```

---

## ⚠️ **Limitations**

**Current Implementation:**
- ❌ No authentication
- ❌ No authorization
- ❌ Limited endpoints
- ❌ No recording playback API
- ❌ No user management
- ❌ No system monitoring API

---

## 📋 **Planned API Endpoints (Phase 6)**

### **Authentication:**
```
POST /api/auth/login       # User login
POST /api/auth/logout      # User logout
POST /api/auth/refresh     # Refresh token
GET  /api/auth/me          # Get current user
```

### **Users:**
```
GET  /api/users            # List users (admin only)
GET  /api/users/:id        # Get user details
POST /api/users            # Create user (admin only)
PUT  /api/users/:id        # Update user
DELETE /api/users/:id      # Delete user (admin only)
```

### **Cameras:**
```
GET  /api/cameras          # List all cameras
GET  /api/cameras/:id      # Get camera details
POST /api/cameras          # Add new camera
PUT  /api/cameras/:id      # Update camera
DELETE /api/cameras/:id    # Delete camera
GET  /api/cameras/:id/status  # Get camera status
POST /api/cameras/:id/restart # Restart camera
```

### **Recordings:**
```
GET  /api/recordings                    # List recordings
GET  /api/recordings/:id                # Get recording details
GET  /api/recordings/camera/:cameraId   # List recordings by camera
GET  /api/recordings/search             # Search recordings
GET  /api/recordings/:id/download       # Download recording
DELETE /api/recordings/:id              # Delete recording
```

### **Live Streams:**
```
GET  /api/streams                # List live streams
GET  /api/streams/:cameraId      # Get stream URL
GET  /api/streams/:cameraId/hls  # Get HLS URL
GET  /api/streams/:cameraId/rtsp # Get RTSP URL
```

### **System:**
```
GET  /api/system/status          # System status
GET  /api/system/health          # Health check
GET  /api/system/stats           # System statistics
GET  /api/system/logs            # System logs
```

---

## 🔐 **Authentication (Planned)**

### **JWT Token:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

### **Authorization Header:**
```
Authorization: Bearer <access_token>
```

### **Roles:**
- **admin:** Full access
- **operator:** View + control cameras
- **viewer:** View only

---

## 📊 **API Response Format**

### **Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Camera 1",
    "status": "online"
  }
}
```

### **Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "CAMERA_NOT_FOUND",
    "message": "Camera not found"
  }
}
```

---

## 🚀 **Development Roadmap**

### **Phase 6: API Backend Completion**
- [ ] Implement authentication (JWT)
- [ ] Implement authorization (RBAC)
- [ ] Complete camera endpoints
- [ ] Implement recording endpoints
- [ ] Implement user management
- [ ] Implement system monitoring API
- [ ] API documentation (Swagger/OpenAPI)
- [ ] API testing

---

## 📚 **Related Documentation**

- **System Architecture:** [../SYSTEM_ARCHITECTURE_FINAL.md](../SYSTEM_ARCHITECTURE_FINAL.md)
- **Roadmap:** [../ROADMAP.md](../ROADMAP.md) (TBD)

---

**Last Updated:** October 20, 2025

