# Cleanup Plan - VMS Codebase

**Date:** October 20, 2025  
**Purpose:** Remove deprecated files, backup files, and unused code after Phase 5 optimization

---

## 📋 **FILES TO DELETE**

### **1. Backup Files (Safe to delete)**

#### **Binary Backups:**
```bash
services/recorder/build/vms-recorder.before-phase1-optimization
services/recorder/build/vms-recorder.before-phase3
services/recorder/build/vms-recorder.before-phase5
services/recorder/build/vms-recorder.old
services/recorder/build/vms-recorder.old.v2
```
**Reason:** Binary backups from previous phases, no longer needed  
**Size:** ~50-100 MB total  
**Risk:** ✅ SAFE - Can rebuild from source

#### **Config Backups:**
```bash
ecosystem.config.js.backup
README.md.backup
README.md.old
```
**Reason:** Old config files, superseded by current versions  
**Risk:** ✅ SAFE - Current versions are working

---

### **2. Deprecated Source Code (Requires verification)**

#### **Deprecated Classes:**
```bash
services/recorder/src/live_transcoder.hpp
services/recorder/src/ffmpeg_process.hpp
```

**Details:**

**`live_transcoder.hpp`:**
- **Purpose:** Separate process for live streaming (Phase 1-2)
- **Status:** ❌ DEPRECATED in Phase 3
- **Replaced by:** `FFmpegMultiOutput` (single process with dual outputs)
- **References:** Commented out in `camera_recorder.hpp` line 10
- **Risk:** ✅ SAFE - Not included anywhere
- **Action:** DELETE

**`ffmpeg_process.hpp`:**
- **Purpose:** Simple FFmpeg wrapper for original recording
- **Status:** ❌ DEPRECATED (MVP code)
- **Replaced by:** `FFmpegMultiOutput`
- **References:** None found
- **Risk:** ✅ SAFE - Not included anywhere
- **Action:** DELETE

---

### **3. Backup Directories**

#### **Recorder Backup:**
```bash
services/recorder-backup-20251019_062314/
```
**Reason:** Full backup from October 19, before Phase 3  
**Size:** ~5-10 MB  
**Risk:** ⚠️ MEDIUM - Contains old code, but git history has everything  
**Action:** DELETE (git history is sufficient)

#### **Docs Archive:**
```bash
docs/archive/old_docs/
docs/archive/old_reports/
docs/archive/old_analysis/
```
**Reason:** Old documentation, superseded by current docs  
**Risk:** ⚠️ MEDIUM - May contain useful historical info  
**Action:** REVIEW FIRST, then delete if not needed

---

### **4. Potentially Deprecated Code (Needs review)**

#### **`encoder_detector.hpp`:**
```bash
services/recorder/src/encoder_detector.hpp
```

**Analysis:**
- **Purpose:** Auto-detect hardware encoder (VAAPI vs NVENC)
- **Current usage:** 
  - Included in `ffmpeg_multi_output.hpp`
  - Used for `getEncoderName()` method only
  - Encoder type is now hardcoded based on GPU type (Phase 5)
- **Status:** ⚠️ PARTIALLY DEPRECATED
- **Risk:** ⚠️ MEDIUM - Still referenced, but logic is bypassed
- **Action:** REFACTOR (remove auto-detection, keep enum and name mapping)

**Recommendation:**
- Keep `EncoderType` enum
- Remove auto-detection logic (`testVAAPI()`, `testNVENC()`, `detect()`)
- Keep `getEncoderName()` for logging
- Simplify to ~30 lines (from 270 lines)

---

## 🎯 **SUMMARY**

### **Safe to Delete (No risk):**
```yaml
Total files: 8
Total size: ~50-100 MB

Files:
  - 5 binary backups (vms-recorder.*)
  - 3 config backups (.backup, .old)
  - 2 deprecated source files (live_transcoder.hpp, ffmpeg_process.hpp)
```

### **Review Before Delete (Medium risk):**
```yaml
Total directories: 4
Total size: ~10-20 MB

Directories:
  - services/recorder-backup-20251019_062314/
  - docs/archive/old_docs/
  - docs/archive/old_reports/
  - docs/archive/old_analysis/
```

### **Refactor (Don't delete):**
```yaml
Files: 1
Action: Simplify encoder_detector.hpp (270 → 30 lines)
```

---

## 📝 **EXECUTION PLAN**

### **Step 1: Delete Safe Files**
```bash
# Binary backups
rm services/recorder/build/vms-recorder.before-phase1-optimization
rm services/recorder/build/vms-recorder.before-phase3
rm services/recorder/build/vms-recorder.before-phase5
rm services/recorder/build/vms-recorder.old
rm services/recorder/build/vms-recorder.old.v2

# Config backups
rm ecosystem.config.js.backup
rm README.md.backup
rm README.md.old

# Deprecated source
rm services/recorder/src/live_transcoder.hpp
rm services/recorder/src/ffmpeg_process.hpp
```

### **Step 2: Review Archive Directories**
```bash
# Check content first
ls -lh services/recorder-backup-20251019_062314/
ls -lh docs/archive/old_docs/
ls -lh docs/archive/old_reports/
ls -lh docs/archive/old_analysis/

# If not needed, delete
rm -rf services/recorder-backup-20251019_062314/
rm -rf docs/archive/old_docs/
rm -rf docs/archive/old_reports/
rm -rf docs/archive/old_analysis/
```

### **Step 3: Refactor encoder_detector.hpp**
```bash
# Simplify to keep only:
# - EncoderType enum
# - getEncoderName() static method
# Remove:
# - testVAAPI(), testNVENC(), detect() methods
# - Auto-detection logic
```

### **Step 4: Verify Build**
```bash
cd services/recorder/build
rm -f vms-recorder
cmake ..
make
```

### **Step 5: Test Production**
```bash
pm2 restart vms-recorder
sleep 10
pm2 logs vms-recorder --lines 20
```

---

## 💾 **DISK SPACE SAVINGS**

```yaml
Binary backups: ~50-100 MB
Config backups: ~1 KB
Deprecated source: ~10 KB
Backup directories: ~10-20 MB

Total savings: ~60-120 MB
```

---

## ⚠️ **RISKS & MITIGATION**

### **Risk 1: Accidentally delete needed files**
**Mitigation:** 
- Git history has everything
- Can restore from git if needed
- Test build after deletion

### **Risk 2: Break production**
**Mitigation:**
- Only delete files not referenced in code
- Verify build before deployment
- Keep current binary as backup

### **Risk 3: Lose historical documentation**
**Mitigation:**
- Review archive directories before deletion
- Git history has all documentation
- Can restore from git if needed

---

## ✅ **APPROVAL REQUIRED**

**Before executing, confirm:**
- [ ] Safe files list is correct
- [ ] Archive directories can be deleted
- [ ] Refactor plan for encoder_detector.hpp is acceptable
- [ ] Backup strategy is in place

**Approved by:** _________________  
**Date:** _________________

---

**Status:** ⏳ AWAITING APPROVAL  
**Next:** Execute cleanup after approval

