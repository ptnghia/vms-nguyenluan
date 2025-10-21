# PM2 Operations Guide

## Tổng Quan

VMS sử dụng PM2 để quản lý tất cả các services:
- **vms-recorder**: Recording engine (C++)
- **vms-mediamtx**: Live streaming server
- **vms-api**: REST API backend (Node.js)

PM2 tự động khởi động lại services khi crash, quản lý logs, và monitor resources.

---

## Các Lệnh Cơ Bản

### 1. Kiểm Tra Trạng Thái
```bash
# Xem danh sách tất cả services
pm2 list

# Xem chi tiết một service
pm2 show vms-recorder
pm2 show vms-api
pm2 show vms-mediamtx

# Xem logs real-time
pm2 logs

# Xem logs của một service
pm2 logs vms-recorder
pm2 logs vms-api

# Xem 50 dòng logs gần nhất
pm2 logs --lines 50

# Xem logs không theo dõi real-time
pm2 logs --nostream
```

### 2. Quản Lý Services

```bash
# Start tất cả services
pm2 start /home/camera/app/vms/ecosystem.config.js

# Restart một service
pm2 restart vms-recorder
pm2 restart vms-api
pm2 restart vms-mediamtx

# Restart tất cả
pm2 restart all

# Stop một service
pm2 stop vms-recorder

# Start lại một service đã stop
pm2 start vms-recorder

# Delete một service khỏi PM2
pm2 delete vms-recorder

# Reload toàn bộ config
pm2 reload /home/camera/app/vms/ecosystem.config.js
```

### 3. Monitoring

```bash
# Dashboard real-time (CPU, RAM, logs)
pm2 monit

# Thông tin chi tiết
pm2 info vms-recorder

# Logs của tất cả services
pm2 logs

# Flush logs (xóa logs cũ)
pm2 flush
```

### 4. Lưu và Khởi Động Tự Động

```bash
# Lưu danh sách services hiện tại
pm2 save

# Setup khởi động cùng hệ thống
pm2 startup

# Disable auto-startup
pm2 unstartup
```

---

## Cấu Trúc Config (ecosystem.config.js)

### vms-recorder
- **Script**: C++ binary compiled từ services/recorder
- **Memory limit**: 8GB
- **Auto-restart**: Có (max 10 lần)
- **Logs**: `/home/camera/app/vms/logs/recorder-*.log`

### vms-mediamtx
- **Script**: Bash script khởi động MediaMTX
- **Memory limit**: Không giới hạn
- **Ports**: 8554 (RTSP), 8888 (HLS), 8889 (WebRTC), 9997 (API), 9998 (Metrics)
- **Logs**: `/home/camera/app/vms/logs/mediamtx-*.log`

### vms-api
- **Script**: Node.js compiled từ TypeScript
- **Memory limit**: 1GB
- **Port**: 3000
- **Logs**: `/home/camera/app/vms/logs/api-*.log`

---

## Troubleshooting

### Service Không Start
```bash
# Xem logs lỗi
pm2 logs vms-recorder --err --lines 50

# Restart với update env
pm2 restart vms-recorder --update-env

# Xóa và start lại
pm2 delete vms-recorder
pm2 start /home/camera/app/vms/ecosystem.config.js
```

### Service Restart Liên Tục
```bash
# Kiểm tra error logs
pm2 logs vms-mediamtx --err

# Kiểm tra memory usage
pm2 monit

# Tăng memory limit trong ecosystem.config.js
max_memory_restart: '2G'

# Reload config
pm2 reload /home/camera/app/vms/ecosystem.config.js
```

### Port Bị Chiếm
```bash
# Kiểm tra port 3000 (API)
sudo lsof -i :3000

# Kiểm tra port 8554 (MediaMTX RTSP)
sudo lsof -i :8554

# Kill process chiếm port
sudo kill -9 <PID>

# Restart service
pm2 restart vms-api
```

### Logs Quá Lớn
```bash
# Xóa logs cũ
pm2 flush

# Install PM2 log rotate (tự động rotate logs)
pm2 install pm2-logrotate

# Config log rotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## Health Checks

### API Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "vms-api",
  "version": "1.0.0",
  "timestamp": "2025-10-19T08:13:21.767Z"
}
```

### MediaMTX Health
```bash
# Check RTSP port
nc -zv localhost 8554

# Check API port
curl http://localhost:9997/v3/paths/list
```

### Recorder Health
```bash
# Kiểm tra trong PM2
pm2 list

# Kiểm tra process
ps aux | grep vms-recorder

# Kiểm tra logs
pm2 logs vms-recorder --lines 20
```

---

## Performance Monitoring

### CPU và RAM Usage
```bash
pm2 monit
```

### Chi Tiết Process
```bash
pm2 show vms-recorder
pm2 show vms-api
```

### Logs Performance
```bash
# Xem logs với timestamp
pm2 logs --timestamp

# Xem logs JSON format
pm2 logs --json
```

---

## Backup và Restore

### Backup PM2 Config
```bash
# Save current process list
pm2 save

# Backup file tại
cat ~/.pm2/dump.pm2
```

### Restore
```bash
# Restore từ dump.pm2
pm2 resurrect

# Hoặc start từ ecosystem config
pm2 start /home/camera/app/vms/ecosystem.config.js
```

---

## Advanced Operations

### Cluster Mode (cho API)
```bash
# Chỉnh trong ecosystem.config.js
instances: 4  # Số lượng instances
exec_mode: 'cluster'

# Reload
pm2 reload /home/camera/app/vms/ecosystem.config.js
```

### Environment Variables
```bash
# Update env cho một service
pm2 restart vms-api --update-env

# Set env trước khi start
PORT=3001 pm2 start vms-api
```

### Process Priority
```bash
# Tăng priority cho recorder (nice value)
pm2 restart vms-recorder --node-args="--max-old-space-size=4096"
```

---

## Các File Quan Trọng

- **PM2 Config**: `/home/camera/app/vms/ecosystem.config.js`
- **PM2 Dump**: `~/.pm2/dump.pm2`
- **Logs**: `/home/camera/app/vms/logs/`
- **Systemd Service**: `/etc/systemd/system/pm2-camera.service`

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `pm2 list` | Danh sách services |
| `pm2 logs` | Xem logs real-time |
| `pm2 monit` | Dashboard monitoring |
| `pm2 restart all` | Restart tất cả |
| `pm2 save` | Lưu process list |
| `pm2 flush` | Xóa logs |
| `pm2 reload ecosystem.config.js` | Reload config |

---

## Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `pm2 logs --err --lines 50`
2. Kiểm tra status: `pm2 list`
3. Restart service: `pm2 restart <service-name>`
4. Kiểm tra ports: `sudo lsof -i :<port>`
5. Review config: `cat /home/camera/app/vms/ecosystem.config.js`
