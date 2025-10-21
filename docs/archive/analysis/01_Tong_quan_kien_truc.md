# 01_Tong_quan_kien_truc.md

## 🎯 Mục tiêu dự án
Xây dựng hệ thống **VMS (Video Management System)** chuyên biệt cho **an ninh và giám sát giao thông** có khả năng:
- Ghi và lưu trữ luồng RTSP từ nhiều loại camera khác nhau (không phụ thuộc đầu ghi của hãng).
- **Xem live real-time** với độ trễ thấp (< 500ms) cho giám sát an ninh và giao thông.
- Quản lý camera, người dùng, lịch sử ghi và phân quyền theo vùng địa lý.
- **Phát lại nhanh** với timeline tìm kiếm theo sự kiện.
- **Tích hợp AI** cho nhận diện biển số, phát hiện vi phạm giao thông.
- Đảm bảo độ ổn định 24/7, độ trễ thấp, khả năng mở rộng lên 200+ camera.

## 🧭 Kiến trúc tổng thể
```
[ Cameras (RTSP) ]
        ↓
[ Recording Engine (C++) ]  →  [ Storage (SSD + HDD + Archive) ]
        ↓                              ↓
[ Node.js API Management ]  →  [ PostgreSQL Metadata DB ]
        ↓                              ↓
[ Streaming Gateway (HLS/WebRTC) ]  ←  [ Python Workers (AI/Analytics) ]
        ↓                              ↓
[ Live Stream Cache (Redis) ] ←→ [ Web UI (React) + Mobile Apps ]
```

### 🎥 Live Streaming Architecture
```
Camera RTSP → C++ Recorder → WebRTC/HLS Gateway → Browser/Mobile
                    ↓
              Live Stream Relay (rtsp-simple-server)
                    ↓
              Multi-bitrate Transcoding (FFmpeg)
                    ↓
              CDN Distribution (cho mobile/remote access)
```

**Các thành phần chính:**
- **C++**: Ghi và xử lý luồng video nhanh, ổn định + Live relay.
- **Node.js**: Quản lý, cung cấp API, điều khiển streaming.
- **Python**: AI processing (LPR, motion detection), analytics.
- **React UI**: Giao diện live monitoring, playback, quản trị.
- **PostgreSQL**: Metadata, users, events, violations.
- **Redis**: Live stream caching, session management.

## 📈 Quy mô hệ thống
- **200+ camera** đồng thời ghi và live streaming.
- **Multi-viewer**: Hiển thị 16-64 camera cùng lúc trên dashboard.
- **Mobile support**: Live view trên smartphone cho CSGT/bảo vệ.
- **Low latency**: < 500ms cho emergency response.
- **High availability**: Ổn định 24/7 với failover tự động.
- **Storage scalability**: Dữ liệu mở rộng sang Object Storage (MinIO/S3).
- **Bandwidth optimization**: Adaptive streaming theo network conditions.
