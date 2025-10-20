# Quick Start Guide - VMS Testing

## Prerequisites Check

### 1. Backend API
```bash
# Check if API is running
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

### 2. Recording Engine
```bash
# Check recording processes
pm2 list

# Should see:
# camera1_main, camera1_sub
# camera2_main, camera2_sub
# ...
```

### 3. MediaMTX Streaming
```bash
# Check MediaMTX is running
curl http://localhost:8888/camera1/index.m3u8

# Should return HLS manifest
```

## Testing Frontend

### 1. Start Development Server
```bash
cd /home/camera/app/vms/services/frontend
npm run dev

# Server should start on http://localhost:5173
```

### 2. Open Browser
Navigate to: `http://localhost:5173`

### 3. Test Login
- Username: `admin`
- Password: `admin123`
- Click "Login" button
- Should redirect to dashboard

### 4. Test Dashboard
- Should see camera grid (3 columns)
- Check online/offline status badges
- Verify camera count badge in header
- Click any camera card

### 5. Test Live View
- Video player should appear
- HLS stream should start playing (5-10s delay is normal)
- Check camera info panel below video
- Click "Recordings" button (will navigate but page not created yet)
- Click back arrow to return to dashboard

### 6. Test Logout
- Click logout icon in header
- Should return to login page
- Try accessing dashboard directly - should redirect to login

## Common Issues

### Login fails
```bash
# Check backend logs
pm2 logs api

# Verify database
psql -U camera_user -d vms_db -c "SELECT * FROM users WHERE username='admin';"
```

### Video not playing
```bash
# Check MediaMTX
curl http://localhost:8888/camera1/index.m3u8

# Check camera status
curl http://localhost:3000/api/cameras | jq

# Verify recording process
pm2 logs camera1_main
```

### API connection error
```bash
# Check API is running
pm2 list | grep api

# Check API logs
pm2 logs api --lines 50

# Restart API if needed
pm2 restart api
```

### CORS errors in browser console
```bash
# Backend should have CORS enabled
# Check services/api/src/index.js:
# app.use(cors())
```

## Manual Test Checklist

### Authentication ✓
- [ ] Login page displays correctly
- [ ] Invalid credentials show error
- [ ] Valid credentials redirect to dashboard
- [ ] Token stored in localStorage
- [ ] Logout clears token
- [ ] Protected routes redirect to login

### Dashboard ✓
- [ ] Camera grid displays
- [ ] Online/offline status correct
- [ ] Camera names shown
- [ ] Click camera opens live view
- [ ] Auto-refresh every 30s

### Live View ✓
- [ ] Video player renders
- [ ] HLS stream plays
- [ ] Controls work (play/pause/volume)
- [ ] Camera info displays
- [ ] Back button returns to dashboard
- [ ] Stream refreshes every 10s

### Error Handling ✓
- [ ] Backend down shows error
- [ ] Camera offline shows placeholder
- [ ] Invalid camera ID handled
- [ ] Network errors display message

## Performance Checks

### Browser DevTools
1. **Network Tab**
   - API calls should be ~100ms
   - HLS segments loading continuously
   - No 404 or 500 errors

2. **Console**
   - No JavaScript errors
   - No CORS errors
   - Warning about 'any' types is OK

3. **Performance**
   - Initial load < 3 seconds
   - Video playback smooth
   - No memory leaks

## Demo Preparation

### 1. Ensure All Services Running
```bash
pm2 list
# All should be "online"
```

### 2. Check Disk Space
```bash
df -h /mnt/vms_storage
# Should have free space
```

### 3. Verify Camera Streams
```bash
# Test each camera HLS
for i in {1..5}; do
  curl -I http://localhost:8888/camera$i/index.m3u8
done
# All should return 200 OK
```

### 4. Clean Browser Cache
- Open incognito/private window
- Clear cookies and localStorage
- Fresh login test

### 5. Prepare Demo Script
1. **Introduction** (1 min)
   - Show architecture diagram
   - Explain tech stack

2. **Backend Demo** (2 min)
   - Show PM2 process list
   - Check API health endpoint
   - View database (camera list)

3. **Frontend Demo** (5 min)
   - Login flow
   - Dashboard with 5 cameras
   - Click camera 1 for live view
   - Show smooth HLS playback
   - Camera info panel
   - Navigate back
   - Try camera 2
   - Logout

4. **Q&A** (2 min)
   - Answer questions
   - Discuss next phase features

## Backup Plan

If demo fails:
1. **Video not playing?**
   - Show pre-recorded screen recording
   - Explain HLS streaming architecture

2. **Backend down?**
   - Restart all services: `pm2 restart all`
   - Check logs: `pm2 logs --lines 100`

3. **Frontend broken?**
   - Rebuild: `npm run build`
   - Serve production: `npm run preview`

## Success Criteria

✅ User can login with credentials  
✅ Dashboard shows all 5 cameras  
✅ At least 2 cameras show "online" status  
✅ Live view plays video smoothly  
✅ Navigation works (dashboard ↔ live view)  
✅ Logout works correctly  

## Post-Demo

### Collect Feedback
- What features are most important?
- Any UI/UX improvements?
- Performance concerns?
- Timeline for Phase 2?

### Next Steps
- Fix any bugs found during demo
- Prioritize Phase 2 features
- Plan recording playback UI
- Schedule next review

---

**Ready for Demo:** YES ✅  
**Estimated Demo Time:** 10 minutes  
**Confidence Level:** HIGH 🚀
