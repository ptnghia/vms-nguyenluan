# VMS API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000`

---

## 📚 **Table of Contents**

1. [Authentication](#authentication)
2. [Cameras](#cameras)
3. [Streams](#streams)
4. [Recordings](#recordings)
5. [Health Check](#health-check)

---

## 🔐 **Authentication**

JWT-based authentication with access and refresh tokens.

### **Register User**

Create a new user account.

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "password": "securepass123",
  "email": "john@example.com",
  "role": "viewer"  // Optional: admin, operator, viewer (default)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "viewer",
    "created_at": "2025-10-19T08:42:25.365Z"
  }
}
```

---

### **Login**

Authenticate and receive JWT tokens.

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

---

### **Get Profile**

Get current user profile (requires authentication).

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "viewer",
    "created_at": "2025-10-19T08:42:25.365Z"
  }
}
```

---

### **Refresh Token**

Get a new access token using refresh token.

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### **Change Password**

Change user password (requires authentication).

```http
POST /api/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "oldPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

---

### **Logout**

Logout user (client discards tokens).

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

---

## 📹 **Cameras**

Manage IP cameras in the system.

### **List All Cameras**

```http
GET /api/cameras
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Camera 1",
      "rtsp_url": "rtsp://admin:password@192.168.1.100:554/stream",
      "location": "Front Door",
      "status": "online",
      "created_at": "2025-10-19T04:29:14.185Z",
      "updated_at": "2025-10-19T07:36:03.705Z"
    }
  ],
  "count": 5
}
```

---

### **Get Camera by ID**

```http
GET /api/cameras/:id
```

---

### **Create Camera**

```http
POST /api/cameras
Content-Type: application/json

{
  "name": "Camera 1",
  "rtsp_url": "rtsp://admin:password@192.168.1.100:554/stream",
  "location": "Front Door"
}
```

---

### **Update Camera**

```http
PUT /api/cameras/:id
Content-Type: application/json

{
  "name": "Camera 1 Updated",
  "location": "Main Entrance"
}
```

---

### **Delete Camera**

```http
DELETE /api/cameras/:id
```

---

## 📡 **Streams**

Live streaming endpoints (MediaMTX integration).

### **List Active Streams**

Get all currently active streams.

```http
GET /api/streams
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "live/camera-uuid/low",
      "ready": true,
      "bytesReceived": 1234567,
      "bytesSent": 987654,
      "viewers": 2
    }
  ],
  "count": 2
}
```

---

### **Get Camera Stream URLs**

Get all stream URLs for a camera.

```http
GET /api/streams/camera/:cameraId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "camera": {
      "id": "uuid",
      "name": "Camera 1",
      "status": "online"
    },
    "streams": {
      "rtsp": "rtsp://localhost:8554/live/camera-uuid",
      "rtmp": "rtmp://localhost:1935/live/camera-uuid",
      "hls": "http://localhost:8888/live/camera-uuid",
      "webrtc": "http://localhost:8889/live/camera-uuid"
    },
    "active": true,
    "stats": {
      "ready": true,
      "bytesReceived": 1234567,
      "bytesSent": 987654,
      "viewers": 2
    }
  }
}
```

---

### **Get Stream Status**

Get status and statistics for a camera stream.

```http
GET /api/streams/status/:cameraId
```

---

### **MediaMTX Health Check**

Check if MediaMTX streaming server is running.

```http
GET /api/streams/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mediamtx": "online",
    "timestamp": "2025-10-19T08:42:50.602Z"
  }
}
```

---

## 🎬 **Recordings**

Manage recorded video files.

### **List Recordings**

```http
GET /api/recordings?camera_id=uuid&start_time=2025-10-19T00:00:00Z&end_time=2025-10-19T23:59:59Z
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "camera_id": "uuid",
      "file_path": "/data/recordings/camera-uuid/2025-10-19/video_001.mp4",
      "start_time": "2025-10-19T10:00:00Z",
      "end_time": "2025-10-19T10:03:00Z",
      "file_size": 15728640,
      "duration": 180
    }
  ],
  "count": 10
}
```

---

## ❤️ **Health Check**

System health status.

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "vms-api",
  "version": "1.0.0",
  "timestamp": "2025-10-19T08:20:10.123Z"
}
```

---

## 🔒 **Authentication Flow**

### **Using JWT Tokens**

1. **Register** a new user or **Login** with existing credentials
2. Receive `accessToken` and `refreshToken`
3. Include `accessToken` in Authorization header for protected endpoints:
   ```
   Authorization: Bearer <accessToken>
   ```
4. When `accessToken` expires (24h), use `refreshToken` to get new tokens

### **Example:**

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Save the accessToken from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use token for authenticated requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/me
```

---

## 🎭 **User Roles**

- **viewer**: Can view cameras and recordings (read-only)
- **operator**: Can manage cameras and recordings
- **admin**: Full access including user management

---

## ⚠️ **Error Responses**

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🧪 **Testing**

### **Health Check**
```bash
curl http://localhost:3000/health
```

### **Create User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123","email":"test@vms.local"}'
```

### **Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

### **List Cameras**
```bash
curl http://localhost:3000/api/cameras
```

### **Get Stream URLs**
```bash
curl http://localhost:3000/api/streams/camera/<camera-id>
```

---

## 📞 **Support**

**API Server**: http://localhost:3000  
**Documentation**: http://localhost:3000/api  
**Health**: http://localhost:3000/health

For issues and questions, check the logs:
```bash
pm2 logs vms-api
```

---

**Last Updated**: October 19, 2025  
**Status**: ✅ Production Ready
