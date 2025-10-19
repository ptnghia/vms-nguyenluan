#ifndef CAMERA_RECORDER_HPP
#define CAMERA_RECORDER_HPP

#include <string>
#include <thread>
#include <atomic>
#include <filesystem>
#include <memory>
#include "ffmpeg_process.hpp"
#include "live_transcoder.hpp"
#include "logger.hpp"
#include "storage_manager.hpp"

namespace fs = std::filesystem;

/**
 * Per-camera recording manager
 * - Manages FFmpeg process for single camera
 * - Auto-reconnect on failure
 * - Simple and stable
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
    
    FFmpegProcess* ffmpegProcess;
    LiveTranscoder* liveTranscoderLow;   // 720p for grid
    LiveTranscoder* liveTranscoderHigh;  // 1440p for fullscreen

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
            
            // Create FFmpeg process for recording
            ffmpegProcess = new FFmpegProcess(cameraName, rtspUrl, cameraRecordingPath);
            
            // Create live transcoders
            liveTranscoderLow = new LiveTranscoder(cameraName, cameraIdStr, rtspUrl, "low");
            liveTranscoderHigh = new LiveTranscoder(cameraName, cameraIdStr, rtspUrl, "high");
            
            // Start recording
            if (!ffmpegProcess->startOriginalRecording()) {
                Logger::error("Failed to start recording for " + cameraName + 
                            " (attempt " + std::to_string(consecutiveFailures + 1) + "/" + 
                            std::to_string(maxRetries) + ")");
                delete ffmpegProcess;
                delete liveTranscoderLow;
                delete liveTranscoderHigh;
                ffmpegProcess = nullptr;
                liveTranscoderLow = nullptr;
                liveTranscoderHigh = nullptr;
                
                consecutiveFailures++;
                
                // Wait before retry with exponential backoff
                int delaySeconds = retryDelaySeconds * (consecutiveFailures > 3 ? 2 : 1);
                Logger::info("Retrying in " + std::to_string(delaySeconds) + " seconds for " + cameraName);
                std::this_thread::sleep_for(std::chrono::seconds(delaySeconds));
                continue;
            }

            // Recording started successfully - reset failure counter
            Logger::info("Recording started successfully for " + cameraName);
            if (consecutiveFailures > 0) {
                Logger::info("Camera " + cameraName + " recovered after " + 
                           std::to_string(consecutiveFailures) + " failures");
            }
            consecutiveFailures = 0;

            // Start live streaming (optional - can be enabled/disabled per camera)
            bool liveEnabled = true;  // TODO: Make this configurable
            if (liveEnabled) {
                liveTranscoderLow->start();
                std::this_thread::sleep_for(std::chrono::milliseconds(500));  // Stagger starts
                liveTranscoderHigh->start();
                Logger::info("Live streaming started for " + cameraName + " (low + high)");
            }

            // Monitor process
            while (shouldRun && ffmpegProcess->checkStatus()) {
                // Also check live transcoders and restart if needed
                if (liveEnabled) {
                    if (!liveTranscoderLow->checkStatus()) {
                        Logger::warn("Live transcoder (low) stopped for " + cameraName + ", restarting...");
                        liveTranscoderLow->restart();
                    }
                    if (!liveTranscoderHigh->checkStatus()) {
                        Logger::warn("Live transcoder (high) stopped for " + cameraName + ", restarting...");
                        liveTranscoderHigh->restart();
                    }
                }
                
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
                Logger::warn("FFmpeg stopped unexpectedly for " + cameraName + 
                           ", restarting in " + std::to_string(retryDelaySeconds) + " seconds...");
                delete ffmpegProcess;
                delete liveTranscoderLow;
                delete liveTranscoderHigh;
                ffmpegProcess = nullptr;
                liveTranscoderLow = nullptr;
                liveTranscoderHigh = nullptr;
                
                consecutiveFailures++;
                std::this_thread::sleep_for(std::chrono::seconds(retryDelaySeconds));
            } else {
                // Graceful shutdown requested
                if (liveTranscoderLow) liveTranscoderLow->stop();
                if (liveTranscoderHigh) liveTranscoderHigh->stop();
                delete ffmpegProcess;
                delete liveTranscoderLow;
                delete liveTranscoderHigh;
                ffmpegProcess = nullptr;
                liveTranscoderLow = nullptr;
                liveTranscoderHigh = nullptr;
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
          ffmpegProcess(nullptr), liveTranscoderLow(nullptr), liveTranscoderHigh(nullptr) {}

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

        // Stop FFmpeg process if running
        if (ffmpegProcess) {
            ffmpegProcess->stop();
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
        if (ffmpegProcess && ffmpegProcess->getIsRunning()) return "Recording";
        if (consecutiveFailures > 0) return "Retrying (" + std::to_string(consecutiveFailures) + "/" + std::to_string(maxRetries) + ")";
        return "Connecting...";
    }

    int getId() const { return cameraId; }
    std::string getName() const { return cameraName; }
    int getConsecutiveFailures() const { return consecutiveFailures; }
    bool hasFailed() const { return consecutiveFailures >= maxRetries; }
};

#endif // CAMERA_RECORDER_HPP
