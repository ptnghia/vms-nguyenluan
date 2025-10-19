#pragma once

#include <string>
#include <filesystem>
#include <chrono>
#include <sys/statvfs.h>
#include <vector>
#include <algorithm>
#include "logger.hpp"

namespace fs = std::filesystem;

/**
 * StorageManager - Quản lý storage với retention policy
 * 
 * Features:
 * - Disk space monitoring
 * - Auto cleanup old recordings based on retention days
 * - Prevent recording when disk full
 * - Alert when disk usage high
 */
class StorageManager {
private:
    std::string recordingPath;
    int retentionDays;          // Số ngày lưu trữ (mặc định 2, có thể lên 30)
    uint64_t minFreeSpaceGB;    // Minimum free space required (GB)
    
public:
    StorageManager(const std::string& path, int retention = 2, uint64_t minFree = 10)
        : recordingPath(path), retentionDays(retention), minFreeSpaceGB(minFree) {}
    
    /**
     * Kiểm tra dung lượng disk còn trống
     * Returns: GB còn trống
     */
    uint64_t getFreeSpaceGB() {
        struct statvfs stat;
        
        if (statvfs(recordingPath.c_str(), &stat) != 0) {
            Logger::error("Failed to get disk stats for " + recordingPath);
            return 0;
        }
        
        // Calculate free space in GB
        uint64_t freeBytes = stat.f_bavail * stat.f_frsize;
        uint64_t freeGB = freeBytes / (1024ULL * 1024ULL * 1024ULL);
        
        return freeGB;
    }
    
    /**
     * Kiểm tra % disk usage
     * Returns: Percentage used (0-100)
     */
    int getDiskUsagePercent() {
        struct statvfs stat;
        
        if (statvfs(recordingPath.c_str(), &stat) != 0) {
            return 100; // Assume full on error
        }
        
        uint64_t totalBlocks = stat.f_blocks;
        uint64_t freeBlocks = stat.f_bfree;
        uint64_t usedBlocks = totalBlocks - freeBlocks;
        
        if (totalBlocks == 0) return 100;
        
        return (usedBlocks * 100) / totalBlocks;
    }
    
    /**
     * Kiểm tra có đủ không gian để ghi không
     * Returns: true nếu đủ space, false nếu gần đầy
     */
    bool hasEnoughSpace() {
        uint64_t freeGB = getFreeSpaceGB();
        
        if (freeGB < minFreeSpaceGB) {
            Logger::error("Disk space critical! Only " + std::to_string(freeGB) + 
                         "GB free (minimum: " + std::to_string(minFreeSpaceGB) + "GB)");
            return false;
        }
        
        int usage = getDiskUsagePercent();
        if (usage > 90) {
            Logger::warn("Disk usage high: " + std::to_string(usage) + "%");
        }
        
        return true;
    }
    
    /**
     * Xóa recordings cũ hơn retention days
     */
    void cleanupOldRecordings() {
        if (retentionDays <= 0) {
            Logger::info("Retention cleanup disabled (retentionDays = 0)");
            return;
        }
        
        auto now = std::chrono::system_clock::now();
        auto cutoffTime = now - std::chrono::hours(retentionDays * 24);
        
        std::vector<fs::path> filesToDelete;
        uint64_t totalSize = 0;
        int fileCount = 0;
        
        try {
            // Scan all camera directories
            for (const auto& cameraDir : fs::directory_iterator(recordingPath)) {
                if (!fs::is_directory(cameraDir)) continue;
                
                // Check all MP4 files in camera directory
                for (const auto& entry : fs::directory_iterator(cameraDir)) {
                    if (!entry.is_regular_file()) continue;
                    if (entry.path().extension() != ".mp4") continue;
                    
                    // Check file modification time
                    auto fileTime = fs::last_write_time(entry);
                    auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
                        fileTime - fs::file_time_type::clock::now() + std::chrono::system_clock::now()
                    );
                    
                    if (sctp < cutoffTime) {
                        filesToDelete.push_back(entry.path());
                        totalSize += fs::file_size(entry);
                        fileCount++;
                    }
                }
            }
            
            // Delete old files
            if (!filesToDelete.empty()) {
                Logger::info("Cleaning up " + std::to_string(fileCount) + 
                           " old recordings (" + std::to_string(totalSize / (1024*1024)) + " MB)");
                
                for (const auto& file : filesToDelete) {
                    try {
                        fs::remove(file);
                        Logger::debug("Deleted: " + file.filename().string());
                    } catch (const std::exception& e) {
                        Logger::error("Failed to delete " + file.string() + ": " + e.what());
                    }
                }
                
                Logger::info("Cleanup completed. Freed " + 
                           std::to_string(totalSize / (1024*1024*1024)) + " GB");
            } else {
                Logger::debug("No old recordings to cleanup");
            }
            
        } catch (const std::exception& e) {
            Logger::error("Cleanup failed: " + std::string(e.what()));
        }
    }
    
    /**
     * Emergency cleanup - xóa recordings cũ nhất khi disk đầy
     * Returns: số GB đã giải phóng
     */
    uint64_t emergencyCleanup(uint64_t targetFreeGB) {
        Logger::warn("Emergency cleanup triggered! Target: " + std::to_string(targetFreeGB) + "GB free");
        
        struct FileInfo {
            fs::path path;
            fs::file_time_type mtime;
            uint64_t size;
        };
        
        std::vector<FileInfo> allFiles;
        
        try {
            // Collect all MP4 files with timestamps
            for (const auto& cameraDir : fs::directory_iterator(recordingPath)) {
                if (!fs::is_directory(cameraDir)) continue;
                
                for (const auto& entry : fs::directory_iterator(cameraDir)) {
                    if (!entry.is_regular_file()) continue;
                    if (entry.path().extension() != ".mp4") continue;
                    
                    allFiles.push_back({
                        entry.path(),
                        fs::last_write_time(entry),
                        fs::file_size(entry)
                    });
                }
            }
            
            // Sort by oldest first
            std::sort(allFiles.begin(), allFiles.end(), 
                     [](const FileInfo& a, const FileInfo& b) {
                         return a.mtime < b.mtime;
                     });
            
            // Delete oldest files until we have enough space
            uint64_t freedBytes = 0;
            uint64_t targetBytes = targetFreeGB * 1024ULL * 1024ULL * 1024ULL;
            
            for (const auto& file : allFiles) {
                if (getFreeSpaceGB() >= targetFreeGB) {
                    break;
                }
                
                try {
                    fs::remove(file.path);
                    freedBytes += file.size;
                    Logger::info("Emergency deleted: " + file.path.filename().string() + 
                               " (" + std::to_string(file.size / (1024*1024)) + " MB)");
                } catch (const std::exception& e) {
                    Logger::error("Failed to delete " + file.path.string() + ": " + e.what());
                }
                
                if (freedBytes >= targetBytes) {
                    break;
                }
            }
            
            uint64_t freedGB = freedBytes / (1024ULL * 1024ULL * 1024ULL);
            Logger::warn("Emergency cleanup freed " + std::to_string(freedGB) + " GB");
            return freedGB;
            
        } catch (const std::exception& e) {
            Logger::error("Emergency cleanup failed: " + std::string(e.what()));
            return 0;
        }
    }
    
    /**
     * Lấy thông tin tổng quan storage
     */
    void logStorageInfo() {
        struct statvfs stat;
        if (statvfs(recordingPath.c_str(), &stat) != 0) {
            Logger::error("Cannot get storage info");
            return;
        }
        
        uint64_t totalGB = (stat.f_blocks * stat.f_frsize) / (1024ULL * 1024ULL * 1024ULL);
        uint64_t freeGB = getFreeSpaceGB();
        uint64_t usedGB = totalGB - freeGB;
        int usagePercent = getDiskUsagePercent();
        
        Logger::info("=== Storage Info ===");
        Logger::info("Path: " + recordingPath);
        Logger::info("Total: " + std::to_string(totalGB) + " GB");
        Logger::info("Used: " + std::to_string(usedGB) + " GB (" + 
                   std::to_string(usagePercent) + "%)");
        Logger::info("Free: " + std::to_string(freeGB) + " GB");
        Logger::info("Retention: " + std::to_string(retentionDays) + " days");
        Logger::info("Min Free Required: " + std::to_string(minFreeSpaceGB) + " GB");
    }
    
    /**
     * Set retention days (có thể thay đổi từ 2 → 30 ngày)
     */
    void setRetentionDays(int days) {
        if (days < 0) {
            Logger::warn("Invalid retention days: " + std::to_string(days) + ", using 0 (no cleanup)");
            retentionDays = 0;
        } else {
            Logger::info("Retention policy updated: " + std::to_string(days) + " days");
            retentionDays = days;
        }
    }
    
    int getRetentionDays() const { return retentionDays; }
};
