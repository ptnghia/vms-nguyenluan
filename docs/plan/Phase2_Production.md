# Phase 2: Production Ready - Multi-Camera & Core Features

**Thời gian**: 6 tuần (Weeks 5-10)  
**Ngân sách**: $25,000  
**Mục tiêu**: Production-ready system với 50 cameras

---

## 🎯 **MỤC TIÊU & SUCCESS CRITERIA**

```yaml
Objectives:
  - Scale from 5 to 50 cameras
  - Production-grade features
  - Mobile access support
  - User management system
  
Success Criteria:
  ✅ 50 cameras recording 24/7
  ✅ Grid view up to 64 cameras
  ✅ Mobile PWA working
  ✅ RBAC với zones
  ✅ Export functionality
  ✅ 99.5% uptime
```

---

## 📋 **SCOPE & DELIVERABLES**

### **1. Multi-Camera Support**
```yaml
Features:
  - Parallel recording 50 cameras
  - Grid layouts: 2×2, 3×3, 4×4, 6×6, 8×8
  - Camera grouping by zones
  - Auto-layout optimization
  - Performance monitoring

Tech:
  - Load balancer cho camera assignment
  - Process management (supervisor/systemd)
  - Health monitoring dashboard
```

### **2. HLS Streaming**
```yaml
Features:
  - HLS playlist generation
  - Adaptive bitrate (ABR)
  - Mobile-friendly streaming
  - CDN-ready format
  
Implementation:
  - FFmpeg HLS muxer
  - NGINX as HLS server
  - Playlist management
```

### **3. User Management & RBAC**
```yaml
Features:
  - User registration/management
  - Roles: admin, operator, viewer
  - Zone-based permissions
  - Audit logging
  - Session management

Database:
  - Users, roles, permissions tables
  - Camera-zone mapping
  - Access control lists (ACL)
```

### **4. Export Function**
```yaml
Features:
  - Export by time range
  - Multiple cameras
  - MP4 format
  - Optional watermark
  - Download queue

Implementation:
  - Background job processing (Bull/Celery)
  - FFmpeg concat + watermark
  - Progress tracking
  - Storage cleanup
```

### **5. Mobile PWA**
```yaml
Features:
  - Responsive design
  - Offline capability
  - Push notifications (Phase 3)
  - Install to home screen
  
Tech:
  - PWA manifest
  - Service worker
  - Mobile-optimized UI
```

### **6. Infrastructure Upgrade**
```yaml
Hardware:
  - 2× Recording nodes (total 3)
  - 1× Storage node for warm storage
  - Network switch upgrade
  
Capacity:
  - 50 cameras × 4Mbps = 200Mbps
  - 3 nodes × ~17 cameras each
  - Storage: 50 cameras × 30 days = 129TB
```

---

## 📅 **TIMELINE**

### **Week 5: Infrastructure & Scaling**
- [ ] Procure 2 additional recording nodes
- [ ] Setup storage node (warm tier)
- [ ] Network upgrade (if needed)
- [ ] Multi-node orchestration
- [ ] Camera load balancer
- [ ] Node health monitoring

### **Week 6: Multi-Camera Features**
- [ ] Grid layout system
- [ ] Camera grouping/zones
- [ ] Load balancer logic
- [ ] Auto-restart per camera
- [ ] Performance dashboard

### **Week 7: User Management & Security**
- [ ] User CRUD APIs
- [ ] RBAC implementation
- [ ] Zone permissions
- [ ] Audit logging
- [ ] Session management

### **Week 8: HLS & Mobile**
- [ ] HLS streaming setup
- [ ] NGINX configuration
- [ ] Mobile PWA implementation
- [ ] Responsive layouts
- [ ] Mobile testing

### **Week 9: Export & Background Jobs**
- [ ] Export API
- [ ] Job queue (Bull/RabbitMQ)
- [ ] FFmpeg export pipeline
- [ ] Watermark implementation
- [ ] Download management

### **Week 10: Testing & Deployment**
- [ ] Integration testing (50 cameras)
- [ ] Load testing
- [ ] Security testing
- [ ] Documentation update
- [ ] Production deployment
- [ ] User training

---

## 💰 **BUDGET**

```yaml
Hardware:
  Recording Nodes: 2× $5,500 = $11,000
  Storage Node: 1× $4,000 = $4,000
  Network: $1,000
  Total: $16,000

Cameras:
  Additional 45 cameras: 45× $300 = $13,500
  (Or use existing cameras)

Software:
  CDN/Cloud services: $500 (testing)

Personnel:
  6 weeks @ $2,500/week × 2 devs = $30,000
  (Assuming Phase 1 team continues)

Total: $60,000

Target: $25,000
Optimization:
  - Reuse existing cameras: -$13,500
  - Use lower-spec nodes: -$4,000
  - Reduced cloud costs: -$300
  - Optimize personnel: -$17,200
  
Adjusted: ~$25,000 ✅
```

---

## 🔧 **TECHNICAL DETAILS**

### **Camera Load Balancer:**
```python
class CameraLoadBalancer:
    def assign_camera(self, camera_id: str) -> str:
        """Assign camera to least loaded node"""
        nodes = self.get_node_stats()
        
        # Sort by CPU usage, camera count
        best_node = min(nodes, key=lambda n: (
            n.cpu_usage,
            n.camera_count
        ))
        
        return best_node.hostname
```

### **RBAC Schema:**
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE,
  description TEXT
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(50),  -- 'camera', 'recording', 'export'
  action VARCHAR(20)     -- 'view', 'edit', 'delete'
);

CREATE TABLE role_permissions (
  role_id INT REFERENCES roles(id),
  permission_id INT REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id INT REFERENCES users(id),
  role_id INT REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  description TEXT
);

CREATE TABLE camera_zones (
  camera_id VARCHAR(50) REFERENCES cameras(camera_id),
  zone_id INT REFERENCES zones(id),
  PRIMARY KEY (camera_id, zone_id)
);

CREATE TABLE user_zone_access (
  user_id INT REFERENCES users(id),
  zone_id INT REFERENCES zones(id),
  PRIMARY KEY (user_id, zone_id)
);
```

---

## 📊 **TESTING**

### **Load Testing:**
```yaml
Scenarios:
  - 50 cameras recording simultaneously
  - 10 concurrent live viewers
  - 5 concurrent exports
  - 100 API requests/second
  
Tools:
  - Apache JMeter
  - k6
  - Artillery
  
Expected Results:
  - CPU: <60% per node
  - Memory: <40GB per node
  - Network: <300Mbps total
  - API p95: <200ms
```

### **Security Testing:**
```yaml
Tests:
  - SQL injection
  - XSS attacks
  - CSRF protection
  - Authentication bypass
  - Authorization escalation
  - Session hijacking
  
Tools:
  - OWASP ZAP
  - Burp Suite
  - Manual penetration testing
```

---

## 📈 **SUCCESS METRICS**

```yaml
Technical:
  Camera capacity: 50
  Concurrent viewers: 10+
  Export speed: >1x realtime
  API uptime: >99.5%
  
Business:
  On-time delivery: Week 10
  Budget: <$25k
  User satisfaction: >80%
  Phase 3 approval: Yes
```

---

**Phase 2 Complete - Ready for AI Integration! 🚀**
