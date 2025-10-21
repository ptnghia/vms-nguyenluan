# 05_Storage_Network_Security.md

## 📦 Chi tiết Cấu trúc Lưu trữ

### **Storage Hierarchy**
```
/data/
├── hot/                          # NVMe SSD - 3 days hot cache
│   ├── cam_001/
│   │   ├── 20251019/
│   │   │   ├── 20251019_080000.mp4   (180s segment)
│   │   │   ├── 20251019_080300.mp4
│   │   │   └── 20251019_080600.mp4
│   │   └── 20251020/
│   └── cam_002/
├── warm/                         # HDD RAID6 - 30 days retention
│   ├── cam_001/
│   │   ├── 2025/
│   │   │   ├── 09/
│   │   │   │   ├── 15/
│   │   │   │   │   ├── segments.tar.gz  (Compressed daily archive)
│   │   │   │   │   └── index.json       (Segment metadata)
│   │   │   └── 10/
│   │   └── index.db              (SQLite index for fast lookup)
│   └── cam_002/
└── archive/                      # Object Storage (MinIO/S3) - 1 year
    └── [Managed by object storage lifecycle]
```

### **Storage Capacity Planning**
```yaml
# For 200 cameras @ 4Mbps, 1080p
capacity_requirements:
  per_camera_per_day: 42GB  # 4Mbps × 86400s ÷ 8 ÷ 1024³
  
  hot_storage:
    retention_days: 3
    per_camera: 126GB
    total_200_cameras: 25.2TB
    with_overhead: 28TB  # 10% overhead
    hardware: "6 nodes × 2TB NVMe SSD RAID1 = 6TB per node"
    
  warm_storage:
    retention_days: 30
    per_camera: 1.26TB
    total_200_cameras: 252TB
    compression_ratio: 0.7  # 30% compression with zstd
    after_compression: 176TB
    with_raid6_overhead: 220TB  # RAID6 efficiency ~80%
    hardware: "8× 10TB HDD per node × 4 nodes = 256TB raw"
    
  cold_storage:
    retention_days: 365
    per_camera: 15.3TB
    total_200_cameras: 3.06PB
    after_compression: 2.14PB
    storage_type: "S3 Glacier or MinIO"
    monthly_cost: "$8,500 @ $4/TB/month"
```

### **Tiered Storage Workflow**
```python
# Automated lifecycle policy
class StorageLifecycle:
    """
    Manage automatic data movement between tiers
    """
    
    tiers = {
        'hot': {
            'path': '/data/hot',
            'retention_hours': 72,
            'next_tier': 'warm'
        },
        'warm': {
            'path': '/data/warm',
            'retention_days': 30,
            'compression': True,
            'next_tier': 'cold'
        },
        'cold': {
            'type': 's3',
            'bucket': 'vms-archive',
            'storage_class': 'GLACIER',
            'retention_days': 365
        }
    }
    
    async def migrate_segments(self):
        """Run every hour to migrate old segments"""
        # Hot → Warm (after 3 days)
        await self.migrate_hot_to_warm()
        
        # Warm → Cold (after 30 days)
        await self.archive_warm_to_cold()
        
        # Delete from Cold (after 1 year)
        await self.cleanup_expired_archives()
```

## 🌐 Network Architecture Chi tiết

### **VLAN Segmentation**
```
┌──────────────────────────────────────────────────────────┐
│         Core Switch (10GbE, Layer 3)                     │
│      Cisco Catalyst 9300 or equivalent                   │
└──────────────────────────────────────────────────────────┘
         │                │                 │
         │ VLAN 10        │ VLAN 20        │ VLAN 30
         │ 192.168.10/24  │ 10.0.1.0/24    │ 10.0.2.0/24
         │                │                 │
    ┌────▼─────┐    ┌────▼─────┐      ┌───▼──────┐
    │ Camera   │    │ Server   │      │ Storage  │
    │ Network  │    │ Network  │      │ Network  │
    │          │    │          │      │          │
    │ 200 cams │    │ 6 nodes  │      │ 4 nodes  │
    │ Access   │    │ Trunk    │      │ Trunk    │
    │ Ports    │    │ 10GbE    │      │ 10GbE    │
    └──────────┘    └──────────┘      └──────────┘
```

### **Network Configuration**
```yaml
vlans:
  vlan_10_cameras:
    id: 10
    name: "Camera Network"
    subnet: "192.168.10.0/24"
    gateway: "192.168.10.1"
    dhcp: false  # Static IPs for cameras
    access_list:
      - allow: 10.0.1.0/24  # Server VLAN can access
      - deny: any
    bandwidth: 1Gbps
    
  vlan_20_servers:
    id: 20
    name: "Server Network"  
    subnet: "10.0.1.0/24"
    gateway: "10.0.1.1"
    dhcp: true
    routing:
      - to: 192.168.10.0/24  # Can access cameras
      - to: 10.0.2.0/24      # Can access storage
      - to: 0.0.0.0/0        # Internet access
    bandwidth: 10Gbps
  
  vlan_30_storage:
    id: 30
    name: "Storage Network"
    subnet: "10.0.2.0/24"
    gateway: "10.0.2.1"
    dhcp: true
    routing:
      - to: 10.0.1.0/24  # Servers only
    jumbo_frames: true  # MTU 9000
    bandwidth: 10Gbps

# Bandwidth Planning
bandwidth_allocation:
  camera_ingress: 800Mbps  # 200 cameras × 4Mbps
  live_streaming_egress: 200Mbps  # Peak load
  storage_traffic: 600MB/s  # 100MB/s × 6 nodes
  api_traffic: 50Mbps
  total_required: 1.2Gbps peak
  
# Firewall Rules
firewall:
  camera_to_internet: BLOCK
  camera_to_server: ALLOW port 554 (RTSP)
  server_to_camera: ALLOW ports 80,554,8000
  server_to_storage: ALLOW ports 2049,3260,9000
  server_to_internet: ALLOW (for APIs, updates)
```

### **QoS Configuration**
```yaml
# Quality of Service for traffic prioritization
qos:
  high_priority:  # Real-time traffic
    - RTSP camera streams
    - WebRTC live streaming
    - VoIP (if used for alerts)
    dscp: EF (Expedited Forwarding)
    
  medium_priority:  # Important but not real-time
    - API requests
    - Database queries
    - WebSocket events
    dscp: AF41
    
  low_priority:  # Bulk transfers
    - Storage replication
    - Backup operations
    - Log shipping
    dscp: AF21
```

## 🔐 Security Implementation

### **TLS/SSL Configuration**
```yaml
# Nginx SSL Configuration
ssl:
  certificate: /etc/ssl/certs/vms.crt
  certificate_key: /etc/ssl/private/vms.key
  protocols: 
    - TLSv1.2
    - TLSv1.3
  ciphers: 
    - ECDHE-ECDSA-AES128-GCM-SHA256
    - ECDHE-RSA-AES128-GCM-SHA256
    - ECDHE-ECDSA-AES256-GCM-SHA384
    - ECDHE-RSA-AES256-GCM-SHA384
  prefer_server_ciphers: on
  session_cache: shared:SSL:10m
  session_timeout: 10m
  hsts_max_age: 31536000  # 1 year
  
# Certificate Management (Let's Encrypt)
certbot:
  domains:
    - vms.example.com
    - api.vms.example.com
    - stream.vms.example.com
  auto_renewal: true
  renewal_days_before: 30
```

### **Authentication & Authorization**
```yaml
authentication:
  method: JWT
  access_token_expiry: 15m
  refresh_token_expiry: 7d
  mfa_enabled: true  # For admin users
  password_policy:
    min_length: 12
    require_uppercase: true
    require_lowercase: true
    require_numbers: true
    require_special: true
    max_age_days: 90
    
authorization:
  model: RBAC  # Role-Based Access Control
  roles:
    - admin: all_permissions
    - operator: view_all, control_cameras, export_video
    - viewer: view_assigned_zones
    - auditor: read_only, access_logs
  
  zone_based_access: true
  audit_logging: true
```

### **Data Encryption**
```yaml
encryption:
  at_rest:
    hot_storage:
      method: LUKS  # Linux Unified Key Setup
      cipher: aes-xts-plain64
      key_size: 512
      
    warm_storage:
      method: LUKS
      cipher: aes-xts-plain64
      key_size: 512
      
    cold_storage:
      method: S3_SSE  # Server-Side Encryption
      algorithm: AES256
  
  in_transit:
    api_traffic: TLS 1.3
    storage_traffic: TLS 1.2+
    rtsp_traffic: "Isolated VLAN (no public access)"
    
  key_management:
    provider: HashiCorp_Vault
    auto_rotation: true
    rotation_period_days: 90
```

### **Security Monitoring**
```python
# Security event monitoring
class SecurityMonitor:
    """
    Monitor and alert on security events
    """
    
    events_to_monitor = [
        'failed_login_attempts',
        'unauthorized_camera_access',
        'unusual_api_traffic',
        'network_intrusion_attempts',
        'disk_encryption_status',
        'certificate_expiration',
        'privilege_escalation_attempts'
    ]
    
    def check_failed_logins(self):
        """Alert on brute force attempts"""
        threshold = 5  # Failed attempts in 15 minutes
        # Trigger account lockout and alert
        
    def check_unauthorized_access(self):
        """Monitor for access to unauthorized zones"""
        # Log and alert security team
        
    def check_certificate_expiry(self):
        """Warn before certificate expiration"""
        warning_days = 30
        # Send notification to ops team
```

### **Compliance & Audit**
```yaml
compliance:
  data_retention:
    min_days: 30  # Legal minimum
    max_days: 365  # Cost optimization
    
  audit_logs:
    enabled: true
    retention_days: 730  # 2 years
    includes:
      - user_authentication
      - camera_access
      - configuration_changes
      - video_exports
      - system_errors
    
  privacy:
    pii_handling: anonymized
    access_logs: detailed
    data_deletion: automated_after_retention
    
  standards:
    - ISO27001  # Information security
    - GDPR  # Data protection (if applicable)
    - Local_regulations  # Vietnam cybersecurity law
```
