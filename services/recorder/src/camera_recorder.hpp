#ifndef CAMERA_RECORDER_HPP
#define CAMERA_RECORDER_HPP

#include <string>
#include <thread>
#include <atomic>
#include <filesystem>
#include <memory>
#include "ffmpeg_multi_output.hpp"
// #include "live_transcoder.hpp"  // PHASE 3: No longer needed
#include "logger.hpp"
#include "storage_manager.hpp"

namespace fs = std::filesystem;

/**
 * Per-camera recording manager (PHASE 3 OPTIMIZED)
 * - Single FFmpeg process with dual outputs:
 *   - Output 1: Recording (H.265 NVENC, 1080p @ 2Mbps)
 *   - Output 2: Live High (H.264 NVENC, 1080p @ 3Mbps)
 * - Total: 1 process per camera, ~28% CPU
 * - 70% CPU reduction from baseline (188.1% -> 55.6% for 2 cameras)
 * - 50% fewer processes (4 -> 2)
 * - Auto-reconnect on failure
 */
class CameraRecorder {
private:
    int cameraId;
    std::string cameraName;
    std::string cameraIdStr;  // For MediaMTX path (e.g., "cam001")
    std::string rtspUrl;
    std::string baseRecordingPath;
    std::string cameraRecordingPath;

    std::atomic<bool> shouldRun;
    std::thread recordingThread;

    std::shared_ptr<StorageManager> storageManager;
    int maxRetries;
    int retryDelaySeconds;
    int consecutiveFailures;

    // PHASE 3: Single process with dual outputs
    FFmpegMultiOutput* multiOutputProcess;    // Recording + Live High (NVENC)

    /**
     * Recording loop with auto-reconnect and retry limits
     */
    void recordLoop() {
        Logger::info("Recording thread started for " + cameraName);
        
        // Create camera directory
        cameraRecordingPath = baseRecordingPath + "/" + cameraName;
        try {
            fs::create_directories(cameraRecordingPath);
            Logger::info("Created directory: " + cameraRecordingPath);
        } catch (const std::exception& e) {
            Logger::error("Failed to create directory for " + cameraName + ": " + e.what());
            return;
        }

        consecutiveFailures = 0;
        
        // Main loop with auto-reconnect and retry limits
        while (shouldRun) {
            // Check if exceeded max retries
            if (consecutiveFailures >= maxRetries) {
                Logger::error("Camera " + cameraName + " exceeded maximum retries (" + 
                            std::to_string(maxRetries) + "). Marking as failed.");
                Logger::error("Manual intervention required. Please check camera connectivity and restart service.");
                return;  // Exit recording thread - camera marked as failed
            }
            
            // Check disk space before starting
            if (!storageManager->hasEnoughSpace()) {
                Logger::error("Insufficient disk space to continue recording " + cameraName);
                Logger::info("Waiting for cleanup to free space...");
                std::this_thread::sleep_for(std::chrono::seconds(60));
                continue;
            }

            // PHASE 3: Create single process with dual outputs (Recording + Live High)
            multiOutputProcess = new FFmpegMultiOutput(
                cameraName,
                cameraIdStr,
                rtspUrl,
                cameraRecordingPath,
                true  // Enable live streaming
            );

            // Start multi-output process
            if (!multiOutputProcess->start()) {
                Logger::error("Failed to start multi-output process for " + cameraName +
                            " (attempt " + std::to_string(consecutiveFailures + 1) + "/" +
                            std::to_string(maxRetries) + ")");
                delete multiOutputProcess;
                multiOutputProcess = nullptr;

                consecutiveFailures++;

                // Wait before retry with exponential backoff
                int delaySeconds = retryDelaySeconds * (consecutiveFailures > 3 ? 2 : 1);
                Logger::info("Retrying in " + std::to_string(delaySeconds) + " seconds for " + cameraName);
                std::this_thread::sleep_for(std::chrono::seconds(delaySeconds));
                continue;
            }

            // Process started successfully - reset failure counter
            Logger::info("Multi-output process started successfully for " + cameraName);
            Logger::info("  PHASE 3: Single process with dual outputs");
            Logger::info("  Output 1: Recording (H.265 NVENC)");
            Logger::info("  Output 2: Live High (H.264 NVENC)");
            if (consecutiveFailures > 0) {
                Logger::info("Camera " + cameraName + " recovered after " +
                           std::to_string(consecutiveFailures) + " failures");
            }
            consecutiveFailures = 0;

            // Monitor process
            while (shouldRun && multiOutputProcess->checkStatus()) {

                // Periodic disk space check
                static int checkCounter = 0;
                if (++checkCounter % 60 == 0) {  // Check every 5 minutes (60 * 5 seconds)
                    if (!storageManager->hasEnoughSpace()) {
                        Logger::warn("Disk space low during recording for " + cameraName);
                        // Continue recording but alert - cleanup will handle it
                    }
                }

                std::this_thread::sleep_for(std::chrono::seconds(5));
            }

            // Process stopped
            if (shouldRun) {
                Logger::warn("Multi-output process stopped unexpectedly for " + cameraName +
                           ", restarting in " + std::to_string(retryDelaySeconds) + " seconds...");

                // Cleanup process
                delete multiOutputProcess;
                multiOutputProcess = nullptr;

                consecutiveFailures++;
                std::this_thread::sleep_for(std::chrono::seconds(retryDelaySeconds));
            } else {
                // Graceful shutdown requested
                delete multiOutputProcess;
                multiOutputProcess = nullptr;
            }
        }

        Logger::info("Recording thread stopped for " + cameraName);
    }

public:
    CameraRecorder(int id, const std::string& idStr, const std::string& name,
                   const std::string& url, const std::string& path,
                   std::shared_ptr<StorageManager> storage,
                   int maxRetry = 10, int retryDelay = 5)
        : cameraId(id), cameraIdStr(idStr), cameraName(name), rtspUrl(url),
          baseRecordingPath(path), shouldRun(false),
          storageManager(storage), maxRetries(maxRetry), retryDelaySeconds(retryDelay),
          consecutiveFailures(0),
          multiOutputProcess(nullptr) {}  // PHASE 3: Single process

    ~CameraRecorder() {
        stop();
    }

    void start() {
        if (shouldRun) {
            Logger::warn("Recorder already running for " + cameraName);
            return;
        }

        shouldRun = true;
        recordingThread = std::thread(&CameraRecorder::recordLoop, this);
        Logger::info("Started recorder for " + cameraName);
    }

    void stop() {
        if (!shouldRun) {
            return;
        }

        Logger::info("Stopping recorder for " + cameraName);
        shouldRun = false;

        // Stop multi-output process if running
        if (multiOutputProcess) {
            multiOutputProcess->stop();
        }

        // Wait for thread to finish
        if (recordingThread.joinable()) {
            recordingThread.join();
        }

        Logger::info("Recorder stopped for " + cameraName);
    }

    std::string getStatus() const {
        if (!shouldRun) return "Stopped";
        if (consecutiveFailures >= maxRetries) return "Failed (Max Retries)";
        if (multiOutputProcess && multiOutputProcess->getIsRunning()) {
            return "Recording + Live (NVENC)";
        }
        if (consecutiveFailures > 0) return "Retrying (" + std::to_string(consecutiveFailures) + "/" + std::to_string(maxRetries) + ")";
        return "Connecting...";
    }

    int getId() const { return cameraId; }
    std::string getName() const { return cameraName; }
    int getConsecutiveFailures() const { return consecutiveFailures; }
    bool hasFailed() const { return consecutiveFailures >= maxRetries; }

    // Get encoder information
    std::string getEncoderInfo() const {
        if (multiOutputProcess && multiOutputProcess->getIsRunning()) {
            return "NVENC (H.265 + H.264)";
        }
        return "N/A";
    }
};

#endif // CAMERA_RECORDER_HPP
