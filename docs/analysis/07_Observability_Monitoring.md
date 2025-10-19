# 07_Observability_Monitoring.md

## 🎯 Observability Strategy

### **Three Pillars of Observability**
1. **Metrics**: Time-series data (Prometheus)
2. **Logs**: Event records (ELK Stack)
3. **Traces**: Request flows (Jaeger - optional)

---

## 📈 Metrics Collection (Prometheus)

### **System Metrics**
```yaml
# Recording Node Metrics
recording_node_metrics:
  # Camera health
  - camera_connection_status{camera_id, status}
  - camera_fps{camera_id} 
  - camera_bitrate{camera_id}
  - camera_frames_dropped{camera_id}
  - camera_last_frame_timestamp{camera_id}
  
  # Process health
  - ffmpeg_process_cpu_percent{camera_id}
  - ffmpeg_process_memory_mb{camera_id}
  - ffmpeg_process_uptime_seconds{camera_id}
  - ffmpeg_process_restarts_total{camera_id}
  
  # Storage metrics
  - disk_space_free_bytes{mount_point}
  - disk_space_used_bytes{mount_point}
  - disk_io_read_bytes_total{device}
  - disk_io_write_bytes_total{device}
  - disk_io_latency_ms{device, operation}
  
  # Network metrics
  - network_bytes_sent_total{interface}
  - network_bytes_received_total{interface}
  - network_errors_total{interface}
  - network_drops_total{interface}

# Streaming Gateway Metrics
streaming_metrics:
  - active_streams_total
  - stream_viewers_count{camera_id}
  - stream_bitrate{camera_id, quality}
  - stream_latency_ms{camera_id, protocol}
  - webrtc_connection_failures_total
  - hls_playlist_requests_total
  
# API Server Metrics
api_metrics:
  - http_requests_total{method, endpoint, status}
  - http_request_duration_seconds{method, endpoint}
  - active_connections_total
  - websocket_connections_total
  - jwt_token_validations_total{result}
  - database_query_duration_seconds{query_type}
  
# AI Worker Metrics
ai_worker_metrics:
  - ai_jobs_queued_total{job_type}
  - ai_jobs_processed_total{job_type, status}
  - ai_processing_duration_seconds{job_type}
  - lpr_detection_accuracy{camera_id}
  - motion_events_detected_total{camera_id}
```

### **Prometheus Configuration**
```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'vms-production'
    datacenter: 'hcm'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

# Scrape configurations
scrape_configs:
  # Recording nodes
  - job_name: 'recording-nodes'
    static_configs:
      - targets:
          - 'recording-node-1:9090'
          - 'recording-node-2:9090'
          - 'recording-node-3:9090'
          - 'recording-node-4:9090'
          - 'recording-node-5:9090'
          - 'recording-node-6:9090'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        
  # Streaming gateways
  - job_name: 'streaming-gateways'
    static_configs:
      - targets:
          - 'stream-gateway-1:9091'
          - 'stream-gateway-2:9091'
          - 'stream-gateway-3:9091'
          
  # API servers
  - job_name: 'api-servers'
    static_configs:
      - targets:
          - 'api-server-1:9092'
          - 'api-server-2:9092'
          
  # Node exporters (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets:
          - 'recording-node-1:9100'
          - 'recording-node-2:9100'
          - 'recording-node-3:9100'
          - 'recording-node-4:9100'
          - 'recording-node-5:9100'
          - 'recording-node-6:9100'
          - 'stream-gateway-1:9100'
          - 'stream-gateway-2:9100'
          - 'stream-gateway-3:9100'
          
  # PostgreSQL exporter
  - job_name: 'postgresql'
    static_configs:
      - targets: ['db-primary:9187']
      
  # Redis exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-master:9121']
```

### **Custom Metrics Exporter (Python)**
```python
from prometheus_client import start_http_server, Gauge, Counter, Histogram
import time

# Define metrics
camera_fps = Gauge('camera_fps', 'Current FPS of camera', ['camera_id'])
camera_status = Gauge('camera_connection_status', 'Camera connection status (1=up, 0=down)', ['camera_id'])
frames_dropped = Counter('camera_frames_dropped_total', 'Total frames dropped', ['camera_id'])
processing_time = Histogram('segment_processing_seconds', 'Time to process segment', ['camera_id'])

class MetricsExporter:
    """
    Custom metrics exporter for VMS components
    """
    
    def __init__(self, port=9090):
        self.port = port
        
    def start(self):
        """Start HTTP server for Prometheus to scrape"""
        start_http_server(self.port)
        print(f"Metrics server started on port {self.port}")
        
        # Update metrics continuously
        while True:
            self.update_camera_metrics()
            time.sleep(10)  # Update every 10 seconds
    
    def update_camera_metrics(self):
        """Update camera-related metrics"""
        cameras = self.get_active_cameras()
        
        for camera in cameras:
            # Update FPS
            fps = self.get_camera_fps(camera['id'])
            camera_fps.labels(camera_id=camera['id']).set(fps)
            
            # Update connection status
            status = 1 if camera['connected'] else 0
            camera_status.labels(camera_id=camera['id']).set(status)
            
            # Increment dropped frames if any
            if camera['frames_dropped'] > 0:
                frames_dropped.labels(camera_id=camera['id']).inc(
                    camera['frames_dropped']
                )
    
    def record_processing_time(self, camera_id: str, duration: float):
        """Record segment processing time"""
        processing_time.labels(camera_id=camera_id).observe(duration)

# Start exporter
if __name__ == '__main__':
    exporter = MetricsExporter(port=9090)
    exporter.start()
```

---

## 📊 Visualization (Grafana)

### **Dashboard Panels**

**1. System Overview Dashboard**
```yaml
panels:
  - title: "Camera Status Grid"
    type: stat
    query: "sum(camera_connection_status) / count(camera_connection_status) * 100"
    description: "Percentage of cameras online"
    
  - title: "Total Bandwidth Usage"
    type: graph
    queries:
      - "sum(rate(network_bytes_received_total{interface='eth0'}[5m])) * 8 / 1000000"
    unit: Mbps
    
  - title: "Storage Capacity"
    type: gauge
    queries:
      - "100 - (disk_space_free_bytes / disk_space_total_bytes * 100)"
    thresholds: [70, 85, 95]
    
  - title: "Active Live Viewers"
    type: stat
    query: "sum(stream_viewers_count)"
    
  - title: "System Health Score"
    type: gauge
    query: |
      (
        (sum(camera_connection_status) / count(camera_connection_status) * 40) +
        (sum(rate(http_requests_total{status=~"2.."}[5m])) / 
         sum(rate(http_requests_total[5m])) * 30) +
        ((100 - avg(disk_space_used_percent)) * 0.2) +
        (avg(1 - rate(camera_frames_dropped_total[5m])) * 10)
      )
```

**2. Recording Performance Dashboard**
```yaml
panels:
  - title: "Recording FPS by Camera"
    type: graph
    query: "camera_fps"
    legend: "{{camera_id}}"
    
  - title: "Frame Drops Rate"
    type: graph
    query: "rate(camera_frames_dropped_total[5m])"
    alert_threshold: 0.01  # Alert if >1% frame drop
    
  - title: "Disk Write Throughput"
    type: graph
    query: "rate(disk_io_write_bytes_total[5m])"
    unit: MB/s
    
  - title: "FFmpeg Process Memory"
    type: graph
    query: "ffmpeg_process_memory_mb"
    legend: "{{camera_id}}"
    alert_threshold: 1000  # Alert if >1GB per process
    
  - title: "Storage Write Latency P99"
    type: graph
    query: "histogram_quantile(0.99, disk_io_latency_ms)"
    alert_threshold: 50  # Alert if >50ms
```

**3. Live Streaming Dashboard**
```yaml
panels:
  - title: "Active Streams"
    type: stat
    query: "active_streams_total"
    
  - title: "Stream Latency by Protocol"
    type: graph
    queries:
      - "avg(stream_latency_ms{protocol='webrtc'})"
      - "avg(stream_latency_ms{protocol='hls'})"
    legend: ["WebRTC", "HLS"]
    
  - title: "Concurrent Viewers"
    type: graph
    query: "sum(stream_viewers_count) by (camera_id)"
    
  - title: "WebRTC Connection Success Rate"
    type: stat
    query: |
      sum(rate(webrtc_connections_success_total[5m])) /
      sum(rate(webrtc_connections_attempts_total[5m])) * 100
    unit: "%"
    
  - title: "Streaming Bandwidth"
    type: graph
    query: "sum(rate(stream_bytes_sent_total[5m])) * 8 / 1000000"
    unit: Mbps
```

**4. AI Processing Dashboard**
```yaml
panels:
  - title: "AI Job Queue Depth"
    type: graph
    query: "ai_jobs_queued_total"
    legend: "{{job_type}}"
    
  - title: "LPR Processing Rate"
    type: stat
    query: "rate(ai_jobs_processed_total{job_type='lpr'}[5m])"
    unit: "jobs/sec"
    
  - title: "AI Processing Latency"
    type: graph
    query: "ai_processing_duration_seconds"
    legend: "{{job_type}}"
    
  - title: "License Plate Detection Accuracy"
    type: gauge
    query: "avg(lpr_detection_accuracy)"
    unit: "%"
```

---

## 🛑 Alerting (Prometheus Alertmanager)

### **Alert Rules**
```yaml
# /etc/prometheus/alert_rules.yml
groups:
  - name: camera_alerts
    interval: 30s
    rules:
      # Critical: Camera offline
      - alert: CameraOffline
        expr: camera_connection_status == 0
        for: 2m
        labels:
          severity: critical
          component: recording
        annotations:
          summary: "Camera {{ $labels.camera_id }} is offline"
          description: "Camera has been offline for 2 minutes"
          
      # Critical: High frame drop rate
      - alert: HighFrameDropRate
        expr: rate(camera_frames_dropped_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          component: recording
        annotations:
          summary: "High frame drop rate on {{ $labels.camera_id }}"
          description: "Frame drop rate is {{ $value | humanizePercentage }}"
          
      # Warning: Low FPS
      - alert: LowCameraFPS
        expr: camera_fps < 20
        for: 3m
        labels:
          severity: warning
          component: recording
        annotations:
          summary: "Low FPS on {{ $labels.camera_id }}"
          description: "FPS is {{ $value }}, expected 25-30"

  - name: storage_alerts
    interval: 60s
    rules:
      # Critical: Disk space low
      - alert: DiskSpaceCritical
        expr: (disk_space_free_bytes / disk_space_total_bytes) < 0.1
        for: 5m
        labels:
          severity: critical
          component: storage
        annotations:
          summary: "Disk space critically low on {{ $labels.instance }}"
          description: "Only {{ $value | humanizePercentage }} free space remaining"
          
      # Warning: Disk space low
      - alert: DiskSpaceWarning
        expr: (disk_space_free_bytes / disk_space_total_bytes) < 0.2
        for: 10m
        labels:
          severity: warning
          component: storage
        annotations:
          summary: "Disk space running low on {{ $labels.instance }}"
          description: "{{ $value | humanizePercentage }} free space remaining"
          
      # Critical: High disk latency
      - alert: HighDiskLatency
        expr: histogram_quantile(0.99, disk_io_latency_ms) > 100
        for: 5m
        labels:
          severity: critical
          component: storage
        annotations:
          summary: "High disk latency on {{ $labels.instance }}"
          description: "P99 latency is {{ $value }}ms"

  - name: streaming_alerts
    interval: 30s
    rules:
      # Critical: High stream latency
      - alert: HighStreamLatency
        expr: stream_latency_ms{protocol="webrtc"} > 1000
        for: 2m
        labels:
          severity: critical
          component: streaming
        annotations:
          summary: "High latency on stream {{ $labels.camera_id }}"
          description: "WebRTC latency is {{ $value }}ms (target <500ms)"
          
      # Warning: WebRTC connection failures
      - alert: WebRTCConnectionFailures
        expr: |
          rate(webrtc_connection_failures_total[5m]) /
          rate(webrtc_connection_attempts_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
          component: streaming
        annotations:
          summary: "High WebRTC connection failure rate"
          description: "{{ $value | humanizePercentage }} of connections failing"

  - name: system_alerts
    interval: 30s
    rules:
      # Critical: Node down
      - alert: NodeDown
        expr: up{job="node-exporter"} == 0
        for: 1m
        labels:
          severity: critical
          component: infrastructure
        annotations:
          summary: "Node {{ $labels.instance }} is down"
          description: "Node has been unreachable for 1 minute"
          
      # Critical: High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 10m
        labels:
          severity: warning
          component: infrastructure
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | humanize }}%"
          
      # Critical: High memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.9
        for: 5m
        labels:
          severity: critical
          component: infrastructure
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"

  - name: api_alerts
    interval: 30s
    rules:
      # Critical: High error rate
      - alert: HighAPIErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
          component: api
        annotations:
          summary: "High API error rate"
          description: "{{ $value | humanizePercentage }} of requests failing"
          
      # Warning: Slow API responses
      - alert: SlowAPIResponses
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 10m
        labels:
          severity: warning
          component: api
        annotations:
          summary: "API responses are slow"
          description: "P95 response time is {{ $value }}s"
```

### **Alertmanager Configuration**
```yaml
# /etc/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'vms-alerts@example.com'
  smtp_auth_username: 'vms-alerts@example.com'
  smtp_auth_password: 'password'

# Alert routing
route:
  receiver: 'default'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  
  routes:
    # Critical alerts: immediate notification via multiple channels
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
      repeat_interval: 1h
      
    # Warning alerts: email only
    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 12h

# Receivers
receivers:
  - name: 'default'
    email_configs:
      - to: 'ops-team@example.com'
        
  - name: 'critical-alerts'
    email_configs:
      - to: 'ops-team@example.com,managers@example.com'
        headers:
          Subject: '[CRITICAL] VMS Alert: {{ .GroupLabels.alertname }}'
    
    # Slack integration
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#vms-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        
    # SMS via Twilio (optional)
    webhook_configs:
      - url: 'http://localhost:5000/send-sms'
        send_resolved: false
        
  - name: 'warning-alerts'
    email_configs:
      - to: 'ops-team@example.com'
        headers:
          Subject: '[WARNING] VMS Alert: {{ .GroupLabels.alertname }}'

# Inhibition rules (suppress certain alerts when others are firing)
inhibit_rules:
  # If node is down, don't alert on individual services
  - source_match:
      alertname: 'NodeDown'
    target_match_re:
      alertname: 'Camera.*|High.*'
    equal: ['instance']
```

---

## � Logging (ELK Stack)

### **Log Collection Architecture**
```
Application Logs → Filebeat → Logstash → Elasticsearch → Kibana
```

### **Filebeat Configuration**
```yaml
# /etc/filebeat/filebeat.yml
filebeat.inputs:
  # Recording engine logs
  - type: log
    enabled: true
    paths:
      - /var/log/vms/recording-engine/*.log
    fields:
      component: recording
      environment: production
    multiline:
      pattern: '^\d{4}-\d{2}-\d{2}'
      negate: true
      match: after
      
  # API server logs
  - type: log
    enabled: true
    paths:
      - /var/log/vms/api/*.log
    fields:
      component: api
    json:
      keys_under_root: true
      add_error_key: true
      
  # Nginx access logs
  - type: log
    enabled: true
    paths:
      - /var/log/nginx/access.log
    fields:
      component: nginx

output.logstash:
  hosts: ["logstash:5044"]
  
processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
```

### **Log Queries & Dashboards**
```
# Common log queries in Kibana

# Find all errors in last hour
component:recording AND level:ERROR AND @timestamp:[now-1h TO now]

# Camera connection failures
message:"connection failed" AND component:recording

# API errors by endpoint
component:api AND status:>=500 AND @timestamp:[now-15m TO now]

# High latency requests
component:api AND response_time:>1000

# Security events
component:auth AND (event:failed_login OR event:unauthorized_access)
```
