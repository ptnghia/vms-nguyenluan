# 04_Workers_Python.md

## 🎯 Chức năng chuyên biệt cho An ninh & Giao thông
- **AI Processing**: License Plate Recognition (LPR), Motion Detection
- **Traffic Analytics**: Vehicle counting, speed detection, violation detection
- **Security Analytics**: Intrusion detection, crowd detection, suspicious object detection
- **Media Processing**: Thumbnail generation, video export, format conversion
- **Background Tasks**: Auto-archive, backup, cleanup, reporting
- **Real-time Alerts**: Integration với SMS, email, mobile push notifications

## 🧰 Công nghệ Stack
- **Python 3.9+** với async/await support
- **OpenCV** cho computer vision processing
- **YOLO v8/v9** cho object detection
- **EasyOCR/PaddleOCR** cho license plate recognition
- **ffmpeg-python** cho video processing
- **Celery + Redis** cho background job queue
- **FastAPI** cho microservice APIs
- **TensorFlow/PyTorch** cho custom AI models

## 🧪 Worker Services & Processing Pipeline

### 🚗 Traffic Analysis Worker
```python
# License Plate Recognition
@celery.task
def process_license_plate(camera_id, frame_data, timestamp):
    """
    - Detect vehicles using YOLO
    - Extract license plate regions
    - OCR với EasyOCR cho biển số VN
    - Validate format (29A-12345, 30E-123.45)
    - Check against blacklist/whitelist
    - Store results với confidence score
    """
    
# Traffic Violation Detection  
@celery.task
def detect_traffic_violation(camera_id, frame_data, traffic_rules):
    """
    - Red light violation detection
    - Speed limit enforcement
    - Wrong way detection
    - Lane violation detection
    - Generate violation evidence package
    """

# Vehicle Analytics
@celery.task
def analyze_traffic_flow(camera_id, time_window):
    """
    - Count vehicles by type (motorbike, car, truck, bus)
    - Calculate average speed
    - Detect traffic congestion
    - Generate hourly/daily reports
    """
```

### 🛡️ Security Analysis Worker
```python
# Motion & Intrusion Detection
@celery.task
def detect_motion_events(camera_id, frame_data, zones):
    """
    - Background subtraction
    - Motion tracking trong restricted zones
    - Người detection với confidence filtering
    - Generate real-time alerts
    """

# Object Detection
@celery.task  
def detect_suspicious_objects(camera_id, frame_data):
    """
    - Abandoned object detection
    - Weapon detection (optional)
    - Crowd gathering analysis
    - Fall detection for elderly monitoring
    """
```

### 📹 Media Processing Worker
```python
# Live Stream Processing
@celery.task
def process_live_frame(camera_id, frame_data):
    """
    - Real-time AI analysis của live streams
    - Overlay detection results lên video
    - Generate thumbnails cho motion events
    - Forward processed frames tới UI
    """

# Export & Archive Worker
@celery.task
def export_video_clip(camera_id, start_time, end_time, export_format):
    """
    - Concat multiple segments
    - Add watermark với timestamp
    - Convert to requested format (MP4, AVI)
    - Generate evidence package với metadata
    """
    
@celery.task
def archive_old_recordings(retention_policy):
    """
    - Move old recordings to cold storage
    - Compress files before archiving
    - Update database pointers
    - Generate archive reports
    """
```

### 🚨 Alert & Notification Worker  
```python
# Real-time Alert Processing
@celery.task
def process_alert(event_data):
    """
    - Validate alert conditions
    - Apply escalation rules
    - Send SMS/Email notifications
    - Push to mobile apps
    - Log to audit trail
    """

# Periodic Health Checks
@celery.task
def monitor_camera_health():
    """
    - Check camera connectivity
    - Monitor stream quality
    - Detect disk space issues
    - Generate system health reports
    """
```
