#ifndef CAMERA_RECORDER_HPP
#define CAMERA_RECORDER_HPP

#include <string>
#include <thread>
#include <atomic>
#include <filesystem>
#include "ffmpeg_process.hpp"
#include "live_transcoder.hpp"
#include "logger.hpp"

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
    
    FFmpegProcess* ffmpegProcess;
    LiveTranscoder* liveTranscoderLow;   // 720p for grid
    LiveTranscoder* liveTranscoderHigh;  // 1440p for fullscreen

    /**
     * Recording loop with auto-reconnect
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

        // Main loop with auto-reconnect
        while (shouldRun) {
            // Create FFmpeg process for recording
            ffmpegProcess = new FFmpegProcess(cameraName, rtspUrl, cameraRecordingPath);
            
            // Create live transcoders
            liveTranscoderLow = new LiveTranscoder(cameraName, cameraIdStr, rtspUrl, "low");
            liveTranscoderHigh = new LiveTranscoder(cameraName, cameraIdStr, rtspUrl, "high");
            
            // Start recording
            if (!ffmpegProcess->startOriginalRecording()) {
                Logger::error("Failed to start recording for " + cameraName);
                delete ffmpegProcess;
                delete liveTranscoderLow;
                delete liveTranscoderHigh;
                ffmpegProcess = nullptr;
                liveTranscoderLow = nullptr;
                liveTranscoderHigh = nullptr;
                
                // Wait before retry
                Logger::info("Retrying in 10 seconds for " + cameraName);
                std::this_thread::sleep_for(std::chrono::seconds(10));
                continue;
            }

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
                
                std::this_thread::sleep_for(std::chrono::seconds(5));
            }

            // Process stopped
            if (shouldRun) {
                Logger::warn("FFmpeg stopped unexpectedly for " + cameraName + ", restarting in 5 seconds...");
                delete ffmpegProcess;
                delete liveTranscoderLow;
                delete liveTranscoderHigh;
                ffmpegProcess = nullptr;
                liveTranscoderLow = nullptr;
                liveTranscoderHigh = nullptr;
                std::this_thread::sleep_for(std::chrono::seconds(5));
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
                   const std::string& url, const std::string& path)
        : cameraId(id), cameraIdStr(idStr), cameraName(name), rtspUrl(url), 
          baseRecordingPath(path), shouldRun(false), 
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
        if (ffmpegProcess && ffmpegProcess->getIsRunning()) return "Recording";
        return "Connecting...";
    }

    int getId() const { return cameraId; }
    std::string getName() const { return cameraName; }
};

#endif // CAMERA_RECORDER_HPP
