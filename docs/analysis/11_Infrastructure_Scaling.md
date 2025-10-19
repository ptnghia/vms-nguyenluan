# 11_Infrastructure_Scaling.md

## 🎯 Giải pháp Scale cho 200+ Cameras

### 📊 **Kiến trúc Horizontal Scaling**

```
                    ┌─────────────────────────────────────┐
                    │     Load Balancer (HAProxy)        │
                    │   Camera Assignment & Health Check  │
                    └─────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐      ┌───────────────┐
    │ Recording     │       │ Recording     │      │ Recording     │
    │ Node 1        │       │ Node 2        │ ...  │ Node N        │
    │ (40 cameras)  │       │ (40 cameras)  │      │ (40 cameras)  │
    └───────────────┘       └───────────────┘      └───────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    ▼
                    ┌─────────────────────────────────────┐
                    │   Distributed Storage Cluster       │
                    │   (Ceph/GlusterFS/MinIO)           │
                    └─────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐      ┌───────────────┐
    │ Streaming     │       │ Streaming     │      │ Streaming     │
    │ Gateway 1     │       │ Gateway 2     │ ...  │ Gateway N     │
    │ (WebRTC/HLS)  │       │ (WebRTC/HLS)  │      │ (WebRTC/HLS)  │
    └───────────────┘       └───────────────┘      └───────────────┘
```

---

## 🖥️ **Recording Node Specifications**

### **Standard Recording Node (40 cameras capacity)**
```yaml
Hardware Specs:
  CPU: 
    - Intel Xeon E5-2680 v4 (14 cores, 28 threads) hoặc tương đương
    - AMD EPYC 7302P (16 cores, 32 threads)
  RAM: 64GB DDR4 ECC
  Storage:
    - OS: 2x 480GB SSD RAID1
    - Cache: 2x 2TB NVMe SSD RAID1 (write cache)
    - Network: 2x 10GbE (bonded for redundancy)
  GPU: Optional - NVIDIA T4 cho hardware transcoding
  
Software Stack:
  OS: Ubuntu 22.04 LTS Server
  Docker: 24.x
  C++ Runtime: GCC 11+
  FFmpeg: 6.x với hardware acceleration
  
Camera Allocation:
  - 40 cameras × 4Mbps = 160Mbps ingress
  - Recording overhead: ~20% CPU per camera
  - Write throughput: 80MB/s sustained
```

### **Resource Calculator**
```python
def calculate_recording_nodes(total_cameras, cameras_per_node=40):
    """
    Tính số lượng node cần thiết cho recording cluster
    """
    nodes_required = math.ceil(total_cameras / cameras_per_node)
    redundancy_nodes = math.ceil(nodes_required * 0.2)  # 20% redundancy
    
    return {
        'active_nodes': nodes_required,
        'standby_nodes': redundancy_nodes,
        'total_nodes': nodes_required + redundancy_nodes,
        'cameras_per_node': cameras_per_node,
        'total_bandwidth_gbps': (total_cameras * 4 * 1.2) / 1000,  # 20% overhead
        'total_storage_tb_per_day': (total_cameras * 4 * 3600 * 24) / (8 * 1024 * 1024 * 1024)
    }

# For 200 cameras:
# {
#   'active_nodes': 5,
#   'standby_nodes': 1,
#   'total_nodes': 6,
#   'total_bandwidth_gbps': 0.96,
#   'total_storage_tb_per_day': 8.4 TB
# }
```

---

## 🌐 **Network Architecture**

### **Network Topology**
```
┌─────────────────────────────────────────────────────────────┐
│                    Core Switch 10GbE                        │
│                  (Redundant + LACP Bonding)                 │
└─────────────────────────────────────────────────────────────┘
        │                   │                      │
        │                   │                      │
┌───────▼─────────┐  ┌──────▼──────────┐  ┌──────▼──────────┐
│ Camera VLAN     │  │ Server VLAN     │  │ Storage VLAN    │
│ 192.168.10.0/24 │  │ 10.0.1.0/24     │  │ 10.0.2.0/24     │
│ (200 cameras)   │  │ (Recording +    │  │ (Storage        │
│                 │  │  Streaming)     │  │  Cluster)       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### **Bandwidth Planning**
```yaml
Camera Network (VLAN 10):
  Total Cameras: 200
  Per Camera Bitrate: 4Mbps (1080p main stream)
  Total Required: 800Mbps
  Network Capacity: 1Gbps (with 20% headroom)
  
Recording Network (VLAN 1):
  Recording Nodes: 6
  Per Node Bandwidth: 160Mbps ingress + 80Mbps egress
  Total Required: 1.44Gbps
  Network Capacity: 10GbE bonded (20Gbps theoretical)
  
Storage Network (VLAN 2):
  Write Throughput: ~100MB/s per node × 6 = 600MB/s
  Read Throughput: Playback + AI processing = 300MB/s
  Network Capacity: 10GbE (1.25GB/s theoretical)
  
Internet Uplink (for remote access):
  Live Streaming: 50 concurrent viewers × 2Mbps = 100Mbps
  API Traffic: 20Mbps
  Total Required: 150Mbps
  Recommended: 500Mbps fiber (with CDN offload)
```

---

## 💾 **Storage Architecture**

### **Tiered Storage Strategy**

```
┌─────────────────────────────────────────────────────────┐
│  Tier 1: Hot Storage (SSD) - 7 days retention           │
│  - 200 cameras × 4Mbps × 86400s × 7 days = 58.8 TB     │
│  - 2x 2TB NVMe per node × 6 nodes = 24TB usable        │
│  - Compression ratio: 0.7 → ~34TB after compression     │
│  - Strategy: Real NVMe for 3-day hot cache only         │
└─────────────────────────────────────────────────────────┘
                            ↓ Auto-archive after 3 days
┌─────────────────────────────────────────────────────────┐
│  Tier 2: Warm Storage (HDD) - 30 days retention         │
│  - 200 cameras × 30 days = 252 TB raw                   │
│  - RAID6 efficiency: 0.8 → 315TB raw capacity needed    │
│  - 8x 10TB HDD per node × 4 storage nodes = 256TB      │
│  - Strategy: Distributed across recording nodes          │
└─────────────────────────────────────────────────────────┘
                            ↓ Archive after 30 days
┌─────────────────────────────────────────────────────────┐
│  Tier 3: Cold Storage (Object Storage) - 1 year         │
│  - MinIO/Ceph cluster or AWS S3 Glacier                 │
│  - 200 cameras × 365 days = 3 PB (compressed)          │
│  - Replicated to offsite backup                         │
└─────────────────────────────────────────────────────────┘
```

### **Storage Lifecycle Management**
```python
# Automated storage lifecycle policy
storage_policy = {
    'tiers': [
        {
            'name': 'hot',
            'type': 'nvme_ssd',
            'retention_days': 3,
            'path': '/data/hot',
            'delete_after_move': True
        },
        {
            'name': 'warm', 
            'type': 'hdd_raid6',
            'retention_days': 30,
            'path': '/data/warm',
            'delete_after_move': True
        },
        {
            'name': 'cold',
            'type': 'object_storage',
            'retention_days': 365,
            'endpoint': 's3://vms-archive',
            'storage_class': 'GLACIER'
        }
    ],
    'lifecycle_check_interval': '1h',
    'parallel_migrations': 4
}

# Example migration job
def migrate_segments(camera_id, from_tier, to_tier):
    """
    Async migration between storage tiers
    """
    segments = get_segments_for_migration(camera_id, from_tier)
    
    for segment in segments:
        # Compress before moving to cold storage
        if to_tier == 'cold':
            compressed = compress_segment(segment, quality=0.8)
            upload_to_s3(compressed, retention_policy='GLACIER')
        else:
            move_segment(segment, to_tier)
        
        # Update database pointers
        update_segment_location(segment.id, to_tier)
        
        # Verify integrity
        if verify_segment_integrity(segment, to_tier):
            delete_from_tier(segment, from_tier)
```

---

## ⚖️ **Load Balancing Strategy**

### **Camera Assignment Algorithm**
```python
class CameraLoadBalancer:
    """
    Intelligent camera-to-node assignment với health checking
    """
    
    def __init__(self, recording_nodes):
        self.nodes = recording_nodes
        self.max_cameras_per_node = 40
        self.health_check_interval = 30  # seconds
    
    def assign_camera(self, camera_id, camera_metadata):
        """
        Assign camera to optimal recording node
        
        Factors considered:
        1. Current node load (CPU, memory, network)
        2. Geographic proximity (reduce network latency)
        3. Camera bitrate requirements
        4. Node health status
        5. Existing camera distribution
        """
        
        # Get current node stats
        node_stats = self.get_node_statistics()
        
        # Score each node
        scored_nodes = []
        for node in self.nodes:
            if node['status'] != 'healthy':
                continue
                
            if node['camera_count'] >= self.max_cameras_per_node:
                continue
            
            score = self.calculate_node_score(
                node, 
                camera_metadata,
                node_stats[node['id']]
            )
            
            scored_nodes.append((node, score))
        
        # Select best node
        if not scored_nodes:
            raise NoAvailableNodesError("All nodes at capacity")
        
        best_node = max(scored_nodes, key=lambda x: x[1])[0]
        
        # Assign camera
        self.register_camera_assignment(camera_id, best_node['id'])
        
        return best_node
    
    def calculate_node_score(self, node, camera_meta, stats):
        """
        Multi-factor scoring algorithm
        """
        # Lower is better for these metrics
        load_score = 100 - stats['cpu_percent']
        network_score = 100 - (stats['network_utilization'] / 10)  # Max 10Gbps
        
        # Geographic proximity (if cameras have location data)
        proximity_score = self.calculate_proximity_score(
            camera_meta.get('location'),
            node['location']
        )
        
        # Balance distribution
        balance_score = 100 - (node['camera_count'] / self.max_cameras_per_node * 100)
        
        # Weighted total
        total_score = (
            load_score * 0.3 +
            network_score * 0.3 +
            proximity_score * 0.2 +
            balance_score * 0.2
        )
        
        return total_score
    
    def handle_node_failure(self, failed_node_id):
        """
        Automatic failover when node fails
        """
        # Get all cameras on failed node
        cameras = self.get_cameras_on_node(failed_node_id)
        
        # Mark node as failed
        self.update_node_status(failed_node_id, 'failed')
        
        # Redistribute cameras
        for camera in cameras:
            try:
                new_node = self.assign_camera(camera.id, camera.metadata)
                
                # Send restart command to new node
                self.restart_camera_recording(camera.id, new_node['id'])
                
                # Log failover event
                self.log_failover(camera.id, failed_node_id, new_node['id'])
                
            except Exception as e:
                # Critical: send alert
                self.send_critical_alert(
                    f"Failed to reassign camera {camera.id}: {e}"
                )
```

### **HAProxy Configuration**
```haproxy
# /etc/haproxy/haproxy.cfg
global
    log /dev/log local0
    maxconn 50000
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

# Health check endpoint
listen health_check
    bind *:8080
    mode http
    monitor-uri /health

# Recording node cluster
backend recording_nodes
    mode http
    balance leastconn  # Route to node with fewest connections
    
    option httpchk GET /health
    http-check expect status 200
    
    server recording-node-1 10.0.1.11:8000 check inter 5s fall 3 rise 2 weight 100
    server recording-node-2 10.0.1.12:8000 check inter 5s fall 3 rise 2 weight 100
    server recording-node-3 10.0.1.13:8000 check inter 5s fall 3 rise 2 weight 100
    server recording-node-4 10.0.1.14:8000 check inter 5s fall 3 rise 2 weight 100
    server recording-node-5 10.0.1.15:8000 check inter 5s fall 3 rise 2 weight 100
    server recording-node-6 10.0.1.16:8000 check inter 5s fall 3 rise 2 backup  # Standby

# Streaming gateway cluster
backend streaming_gateways
    mode http
    balance roundrobin
    
    option httpchk GET /health
    http-check expect status 200
    
    # Sticky sessions for WebRTC
    cookie SERVERID insert indirect nocache
    
    server stream-gateway-1 10.0.1.21:8554 check cookie s1
    server stream-gateway-2 10.0.1.22:8554 check cookie s2
    server stream-gateway-3 10.0.1.23:8554 check cookie s3

# Frontend routing
frontend vms_frontend
    bind *:443 ssl crt /etc/ssl/certs/vms.pem
    bind *:80
    
    # Redirect HTTP to HTTPS
    redirect scheme https if !{ ssl_fc }
    
    # ACLs for routing
    acl is_recording path_beg /api/recording
    acl is_streaming path_beg /api/stream /live
    
    use_backend recording_nodes if is_recording
    use_backend streaming_gateways if is_streaming
    
    default_backend recording_nodes
```

---

## 🔄 **High Availability & Failover**

### **Component Redundancy**
```yaml
Critical Components:
  Load Balancer:
    Primary: HAProxy on server-lb-1
    Secondary: HAProxy on server-lb-2 (VRRP keepalived)
    Virtual IP: 10.0.1.100 (floating IP)
    
  Database:
    Primary: PostgreSQL 15 on db-primary
    Replicas: 
      - db-replica-1 (sync replication)
      - db-replica-2 (async replication for reads)
    Failover: Patroni + etcd for automatic failover
    
  Redis:
    Mode: Redis Sentinel (3 nodes)
    Master: redis-master
    Slaves: redis-slave-1, redis-slave-2
    Auto-failover: Yes (Sentinel quorum = 2)
    
  Recording Nodes:
    Active: 5 nodes (40 cameras each)
    Standby: 1 node (hot standby, ready to take load)
    Failover Time: < 60 seconds
    Data Loss: None (segments written to shared storage)
```

### **Disaster Recovery**
```python
class DisasterRecoveryOrchestrator:
    """
    Handles various failure scenarios
    """
    
    def handle_node_failure(self, node_id):
        """Node hardware failure"""
        # 1. Detect failure (via heartbeat timeout)
        # 2. Mark node as failed in load balancer
        # 3. Activate standby node
        # 4. Reassign cameras from failed node
        # 5. Resume recordings (< 60s downtime per camera)
        pass
    
    def handle_network_partition(self, partition_info):
        """Network split-brain scenario"""
        # 1. Detect partition via consensus protocol
        # 2. Elect new master in larger partition
        # 3. Fence minority partition (prevent split-brain)
        # 4. Cameras in minority partition pause recording
        # 5. Auto-recover when partition heals
        pass
    
    def handle_storage_failure(self, storage_node_id):
        """Storage node failure"""
        # 1. Detect via storage health checks
        # 2. Switch to replica storage node (RAID redundancy)
        # 3. Alert ops team for hardware replacement
        # 4. Rebuild RAID when new disk added
        # 5. Rebalance storage across cluster
        pass
    
    def handle_database_failure(self):
        """Database primary failure"""
        # 1. Patroni detects primary failure
        # 2. Automatic promote replica to primary (< 30s)
        # 3. Update connection strings via DNS
        # 4. Applications reconnect automatically
        # 5. Old primary rejoin as replica when recovered
        pass
```

---

## 📊 **Capacity Planning**

### **Growth Projections**
```python
def project_capacity_needs(current_cameras, growth_rate_yearly, years=3):
    """
    Project infrastructure needs for future growth
    """
    projections = []
    
    for year in range(1, years + 1):
        cameras = current_cameras * (1 + growth_rate_yearly) ** year
        
        nodes_needed = math.ceil(cameras / 40)
        standby_nodes = math.ceil(nodes_needed * 0.2)
        
        storage_tb_hot = (cameras * 4 * 86400 * 3) / (8 * 1024**4) * 0.7
        storage_tb_warm = (cameras * 4 * 86400 * 30) / (8 * 1024**4) * 0.7
        storage_tb_cold = (cameras * 4 * 86400 * 365) / (8 * 1024**4) * 0.7
        
        bandwidth_gbps = (cameras * 4 * 1.2) / 1000
        
        projections.append({
            'year': year,
            'cameras': int(cameras),
            'recording_nodes': nodes_needed,
            'standby_nodes': standby_nodes,
            'total_nodes': nodes_needed + standby_nodes,
            'storage_hot_tb': round(storage_tb_hot, 2),
            'storage_warm_tb': round(storage_tb_warm, 2),
            'storage_cold_tb': round(storage_tb_cold, 2),
            'network_bandwidth_gbps': round(bandwidth_gbps, 2),
            'estimated_monthly_cost_usd': estimate_monthly_cost(
                nodes_needed + standby_nodes,
                storage_tb_hot + storage_tb_warm,
                storage_tb_cold
            )
        })
    
    return projections

# Example: 200 cameras with 20% yearly growth
# Year 1: 240 cameras, 7 nodes, 10TB hot, 84TB warm, 1PB cold
# Year 2: 288 cameras, 8 nodes, 12TB hot, 101TB warm, 1.2PB cold
# Year 3: 346 cameras, 9 nodes, 14TB hot, 121TB warm, 1.4PB cold
```

### **Cost Estimation**
```python
def estimate_monthly_cost(nodes, storage_warm_tb, storage_cold_tb):
    """
    Rough monthly cost estimate (USD)
    """
    # Hardware (amortized over 3 years)
    server_cost = nodes * 5000 / 36  # $5k per server / 36 months
    storage_warm_cost = storage_warm_tb * 30  # $30/TB HDD
    
    # Operational costs
    power_cost = nodes * 200 * 0.12 * 24 * 30 / 1000  # 200W per server @ $0.12/kWh
    bandwidth_cost = 500  # $500/month for 500Mbps fiber
    storage_cold_cost = storage_cold_tb * 4  # $4/TB/month for S3 Glacier
    
    # Personnel (partial allocation)
    ops_cost = 3000  # 1 DevOps engineer (partial)
    
    total = (
        server_cost + 
        storage_warm_cost + 
        storage_cold_cost +
        power_cost + 
        bandwidth_cost + 
        ops_cost
    )
    
    return round(total, 2)

# For 200 cameras:
# ~$8,000-12,000/month total infrastructure cost
```

---

## 🧪 **Testing & Validation**

### **Load Testing Scenarios**
```python
# Stress test với Locust
from locust import HttpUser, task, between

class VMSLoadTest(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def view_live_stream(self):
        """Simulate live stream viewing"""
        camera_id = random.choice(self.camera_ids)
        self.client.get(f"/live/{camera_id}/webrtc")
    
    @task(2)
    def query_playback(self):
        """Simulate playback queries"""
        camera_id = random.choice(self.camera_ids)
        start_time = datetime.now() - timedelta(hours=2)
        self.client.get(
            f"/playback/{camera_id}",
            params={'start': start_time.isoformat()}
        )
    
    @task(1)
    def get_camera_status(self):
        """Check camera status"""
        self.client.get("/cameras?status=true")

# Test scenarios:
# 1. Normal load: 50 concurrent viewers, 200 cameras recording
# 2. Peak load: 200 concurrent viewers, 200 cameras recording
# 3. Failure scenario: 1 node fails during peak load
# 4. Network degradation: Simulate 30% packet loss
# 5. Storage stress: Fill storage to 90% capacity
```

### **Acceptance Criteria**
```yaml
Performance Requirements:
  Recording:
    - No dropped frames under normal conditions
    - < 1% frame drop under peak load
    - Recovery time after failure: < 60 seconds
    - Disk write latency: < 10ms p99
    
  Live Streaming:
    - WebRTC latency: < 500ms p95
    - HLS latency: < 5 seconds
    - Concurrent viewers: 200+ without degradation
    - Stream startup time: < 2 seconds
    
  API Performance:
    - Response time: < 200ms p95
    - Throughput: 1000 req/s sustained
    - Error rate: < 0.1%
    
  Storage:
    - Write throughput: 100MB/s per node sustained
    - Read throughput: 200MB/s for playback
    - RAID rebuild: < 12 hours for 10TB disk
    
  High Availability:
    - System uptime: 99.9% (< 43 minutes downtime/month)
    - Node failover: < 60 seconds
    - Data durability: 99.999999% (no data loss)
```

