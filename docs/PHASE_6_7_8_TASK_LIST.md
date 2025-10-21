# Phase 6, 7, 8 - Task List Chi Tiết

**Date:** October 20, 2025  
**Status:** Planning Complete  
**Total Tasks:** 123 tasks  
**Timeline:** 12 weeks (4 + 6 + 2)

---

## 📊 **TỔNG QUAN**

### **Phase Breakdown:**
```yaml
Phase 6: API Backend Completion
  Duration: 4 weeks
  Tasks: 46 tasks
  Sub-phases: 4 (Recording, User, System, Security)

Phase 7: Frontend Development
  Duration: 6 weeks
  Tasks: 58 tasks
  Sub-phases: 5 (Setup, Dashboard, Recordings, Management, Polish)

Phase 8: Testing & Deployment
  Duration: 2 weeks
  Tasks: 19 tasks
  Sub-phases: 2 (Testing, Deployment)
```

---

## 🚀 **PHASE 6: API BACKEND COMPLETION (4 WEEKS)**

### **6.1: Recording Management API (Week 1-2) - 10 tasks**

**Priority:** HIGH  
**Dependencies:** None

#### **Tasks:**
1. ✅ **6.1.1:** Database schema updates
   - Update recordings table schema
   - Add missing columns (duration, resolution, fps, codec)
   - Add indexes for performance

2. ✅ **6.1.2:** Metadata extraction service
   - Create service using ffprobe
   - Extract: duration, resolution, fps, codec, bitrate
   - Handle errors gracefully

3. ✅ **6.1.3:** File system scanner
   - Scan `/data/recordings` directory
   - Sync existing files to database
   - Schedule periodic sync

4. ✅ **6.1.4:** GET /api/recordings endpoint
   - List recordings with pagination
   - Filters: camera, date range, storage tier
   - Sort by start_time DESC

5. ✅ **6.1.5:** GET /api/recordings/search endpoint
   - Advanced search with multiple filters
   - Full-text search on filename
   - Support complex queries

6. ✅ **6.1.6:** GET /api/recordings/:id endpoint
   - Get single recording details
   - Include metadata and camera info

7. ✅ **6.1.7:** GET /api/recordings/:id/download endpoint
   - Download recording file
   - Support range requests (partial content)
   - Stream large files

8. ✅ **6.1.8:** DELETE /api/recordings/:id endpoint
   - Delete recording (admin only)
   - Remove from database and file system
   - Confirmation required

9. ✅ **6.1.9:** GET /api/recordings/stats endpoint
   - Storage statistics
   - Total size, count by camera
   - Storage tier distribution

10. ✅ **6.1.10:** Unit tests for recording API
    - Test all endpoints
    - Mock database and file system
    - Coverage > 80%

---

### **6.2: User Management API (Week 2-3) - 10 tasks**

**Priority:** MEDIUM  
**Dependencies:** None

#### **Tasks:**
1. ✅ **6.2.1:** User activity table schema
   - Create user_activity table
   - Track user actions (login, CRUD operations)

2. ✅ **6.2.2:** Admin middleware
   - Check admin role for protected endpoints
   - Return 403 if not admin

3. ✅ **6.2.3:** GET /api/users endpoint
   - List users with pagination (admin only)
   - Filter by role, status

4. ✅ **6.2.4:** GET /api/users/:id endpoint
   - Get user details
   - Hide password hash

5. ✅ **6.2.5:** POST /api/users endpoint
   - Create new user (admin only)
   - Validate inputs, hash password

6. ✅ **6.2.6:** PUT /api/users/:id endpoint
   - Update user details
   - Users can update own profile

7. ✅ **6.2.7:** DELETE /api/users/:id endpoint
   - Delete user (admin only)
   - Cannot delete self

8. ✅ **6.2.8:** PUT /api/users/:id/role endpoint
   - Change user role (admin only)
   - Validate role values

9. ✅ **6.2.9:** User activity logging
   - Log all user actions
   - Store IP, user agent, timestamp

10. ✅ **6.2.10:** Unit tests for user API
    - Test all endpoints
    - Test admin authorization
    - Coverage > 80%

---

### **6.3: System Monitoring API (Week 3-4) - 10 tasks**

**Priority:** MEDIUM  
**Dependencies:** None

#### **Tasks:**
1. ✅ **6.3.1:** PM2 integration service
   - Interact with PM2 API
   - Get process list and stats

2. ✅ **6.3.2:** GPU monitoring service
   - Parse nvidia-smi output
   - Get GPU stats (NVENC, NVDEC, memory, temp)

3. ✅ **6.3.3:** GET /api/system/status endpoint
   - Overall system status
   - Services health check

4. ✅ **6.3.4:** GET /api/system/stats endpoint
   - System statistics
   - CPU, GPU, memory, disk, cameras

5. ✅ **6.3.5:** GET /api/system/cpu endpoint
   - CPU usage details
   - Per core, per process

6. ✅ **6.3.6:** GET /api/system/gpu endpoint
   - GPU usage details
   - NVENC, NVDEC, memory, temperature

7. ✅ **6.3.7:** GET /api/system/disk endpoint
   - Disk usage
   - Total, used, free, recordings size

8. ✅ **6.3.8:** GET /api/system/processes endpoint
   - FFmpeg processes list
   - CPU/memory per camera

9. ✅ **6.3.9:** GET /api/system/logs endpoint
   - System logs with filtering
   - Filter by level, date, search

10. ✅ **6.3.10:** Unit tests for system API
    - Test all endpoints
    - Mock system commands
    - Coverage > 80%

---

### **6.4: Security Enhancements (Week 4) - 6 tasks**

**Priority:** HIGH  
**Dependencies:** None

#### **Tasks:**
1. ✅ **6.4.1:** RTSP URL encryption
   - Implement AES-256 encryption
   - Encrypt RTSP URLs in database
   - Decrypt on read

2. ✅ **6.4.2:** Rate limiting middleware
   - Use express-rate-limit
   - 100 requests per 15 minutes per IP

3. ✅ **6.4.3:** Input validation with Zod
   - Add Zod schema validation
   - Validate all API inputs

4. ✅ **6.4.4:** Security headers
   - Add helmet.js
   - HSTS, CSP, X-Frame-Options, etc.

5. ✅ **6.4.5:** API documentation with Swagger
   - Generate OpenAPI/Swagger docs
   - Document all endpoints

6. ✅ **6.4.6:** Security audit
   - Run npm audit
   - OWASP security checks
   - Fix vulnerabilities

---

## 🎨 **PHASE 7: FRONTEND DEVELOPMENT (6 WEEKS)**

### **7.1: Setup & Authentication (Week 1) - 8 tasks**

**Priority:** HIGH  
**Dependencies:** Phase 6 completion

#### **Tasks:**
1. ✅ **7.1.1:** Initialize React + Vite project
   - Create new project with Vite
   - Setup TypeScript
   - Create project structure

2. ✅ **7.1.2:** Install dependencies
   - MUI, axios, zustand, react-router
   - video.js, date-fns

3. ✅ **7.1.3:** Setup routing
   - Configure React Router
   - Protected routes

4. ✅ **7.1.4:** Create API client
   - Setup axios instance
   - JWT refresh interceptors

5. ✅ **7.1.5:** Create auth store
   - Zustand store for auth state
   - Login, logout, token management

6. ✅ **7.1.6:** Create login page
   - Login UI with form validation
   - Remember me checkbox

7. ✅ **7.1.7:** Implement authentication flow
   - Login, logout, token refresh
   - Protected routes

8. ✅ **7.1.8:** Create layout components
   - Header, Sidebar, Footer

---

### **7.2: Dashboard & Live View (Week 2-3) - 10 tasks**

**Priority:** HIGH  
**Dependencies:** 7.1 completion

#### **Tasks:**
1. ✅ **7.2.1:** Create dashboard page
2. ✅ **7.2.2:** System stats cards
3. ✅ **7.2.3:** Recent events list
4. ✅ **7.2.4:** Create VideoPlayer component (Video.js + HLS)
5. ✅ **7.2.5:** Create CameraCard component
6. ✅ **7.2.6:** Create CameraGrid component (1x1, 2x2, 3x3, 4x4)
7. ✅ **7.2.7:** Create live view page
8. ✅ **7.2.8:** Grid layout selector
9. ✅ **7.2.9:** Fullscreen mode
10. ✅ **7.2.10:** WebSocket integration

---

### **7.3: Recordings (Week 3-4) - 10 tasks**

**Priority:** HIGH  
**Dependencies:** 7.2 completion

#### **Tasks:**
1. ✅ **7.3.1:** Create recordings page
2. ✅ **7.3.2:** Date range picker
3. ✅ **7.3.3:** Camera filter dropdown
4. ✅ **7.3.4:** Search functionality
5. ✅ **7.3.5:** Pagination component
6. ✅ **7.3.6:** Recording card/table view
7. ✅ **7.3.7:** Video player modal
8. ✅ **7.3.8:** Download functionality
9. ✅ **7.3.9:** Delete functionality (admin only)
10. ✅ **7.3.10:** Timeline view

---

### **7.4: Management Pages (Week 4-5) - 10 tasks**

**Priority:** MEDIUM  
**Dependencies:** 7.3 completion

#### **Tasks:**
1. ✅ **7.4.1:** Create camera management page
2. ✅ **7.4.2:** Camera table component
3. ✅ **7.4.3:** Camera form modal
4. ✅ **7.4.4:** Camera form validation
5. ✅ **7.4.5:** Delete camera confirmation
6. ✅ **7.4.6:** Create user management page (admin only)
7. ✅ **7.4.7:** User table component
8. ✅ **7.4.8:** User form modal
9. ✅ **7.4.9:** Role selector component
10. ✅ **7.4.10:** Create settings page

---

### **7.5: Polish & Testing (Week 5-6) - 10 tasks**

**Priority:** MEDIUM  
**Dependencies:** 7.4 completion

#### **Tasks:**
1. ✅ **7.5.1:** Loading states
2. ✅ **7.5.2:** Error handling
3. ✅ **7.5.3:** Toast notifications
4. ✅ **7.5.4:** Responsive design
5. ✅ **7.5.5:** Dark mode (optional)
6. ✅ **7.5.6:** Component tests
7. ✅ **7.5.7:** Integration tests
8. ✅ **7.5.8:** Performance optimization
9. ✅ **7.5.9:** Accessibility (a11y)
10. ✅ **7.5.10:** User documentation

---

## 🧪 **PHASE 8: TESTING & DEPLOYMENT (2 WEEKS)**

### **8.1: End-to-End Testing (Week 1) - 7 tasks**

**Priority:** HIGH  
**Dependencies:** Phase 7 completion

#### **Tasks:**
1. ✅ **8.1.1:** API integration tests
2. ✅ **8.1.2:** Frontend E2E tests (Cypress/Playwright)
3. ✅ **8.1.3:** Load testing (12 cameras, multiple users)
4. ✅ **8.1.4:** Security testing
5. ✅ **8.1.5:** Browser compatibility
6. ✅ **8.1.6:** Performance testing
7. ✅ **8.1.7:** Bug fixes

---

### **8.2: Production Deployment (Week 2) - 10 tasks**

**Priority:** HIGH  
**Dependencies:** 8.1 completion

#### **Tasks:**
1. ✅ **8.2.1:** Production environment setup
2. ✅ **8.2.2:** SSL certificates (Let's Encrypt)
3. ✅ **8.2.3:** Nginx reverse proxy
4. ✅ **8.2.4:** Database migration
5. ✅ **8.2.5:** Environment variables
6. ✅ **8.2.6:** PM2 process management
7. ✅ **8.2.7:** Monitoring setup (Prometheus/Grafana)
8. ✅ **8.2.8:** Backup strategy
9. ✅ **8.2.9:** Deployment documentation
10. ✅ **8.2.10:** Production smoke tests

---

## 📈 **PROGRESS TRACKING**

### **Task Statistics:**
```yaml
Total Tasks: 123
Phase 6: 46 tasks (37%)
Phase 7: 58 tasks (47%)
Phase 8: 19 tasks (15%)

Completed: 0 (0%)
In Progress: 0 (0%)
Not Started: 123 (100%)
```

### **Timeline:**
```
Week 1-2:   Phase 6.1 (Recording API)
Week 2-3:   Phase 6.2 (User API)
Week 3-4:   Phase 6.3 (System API)
Week 4:     Phase 6.4 (Security)
Week 5:     Phase 7.1 (Setup & Auth)
Week 6-7:   Phase 7.2 (Dashboard & Live)
Week 7-8:   Phase 7.3 (Recordings)
Week 8-9:   Phase 7.4 (Management)
Week 9-10:  Phase 7.5 (Polish & Testing)
Week 11:    Phase 8.1 (E2E Testing)
Week 12:    Phase 8.2 (Deployment)
```

---

## 🎯 **NEXT STEPS**

1. **Review task list** với team
2. **Assign tasks** cho developers
3. **Setup development environment**
4. **Begin Phase 6.1** (Recording Management API)

---

**Document Version:** 1.0  
**Last Updated:** October 20, 2025

