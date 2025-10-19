#ifndef CAMERA_RECORDER_HPP
#define CAMERA_RECORDER_HPP

#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <chrono>

#include "database.hpp"
#include "config.hpp"
#include "logger.hpp"
#include "ffmpeg_transcoder.hpp"

class CameraRecorder {
public:
    CameraRecorder(const Config& cfg, std::shared_ptr<Database> db, const Camera& cam)
        : config(cfg), database(db), camera(cam), running(false), connected(false) {}
    
    ~CameraRecorder() {
        stop();
    }
    
    bool start() {
        if (running) return true;
        
        running = true;
        recordThread = std::thread(&CameraRecorder::recordLoop, this);
        
        Logger::info("Started recorder for: " + camera.name);
        return true;
    }
    
    void stop() {
        if (!running) return;
        
        running = false;
        if (recordThread.joinable()) {
            recordThread.join();
        }
        
        Logger::info("Stopped recorder for: " + camera.name);
    }
    
    std::string getCameraName() const { return camera.name; }
    std::string getStatus() const {
        return connected ? "Recording" : "Disconnected";
    }

private:
    const Config& config;
    std::shared_ptr<Database> database;
    Camera camera;
    std::atomic<bool> running;
    std::atomic<bool> connected;
    std::thread recordThread;
    
    void recordLoop() {
        Logger::info("[" + camera.name + "] Recording thread started");
        
        while (running) {
            try {
                // Update camera status to online
                database->updateCameraStatus(camera.id, "online");
                
                // Create camera-specific output directory
                std::string cameraDir = config.getRecordingPath() + "/" + camera.id;
                
                // Initialize FFmpeg transcoder
                auto transcoder = std::make_unique<FFmpegTranscoder>(camera.rtspUrl, cameraDir);
                
                Logger::info("[" + camera.name + "] Initializing transcoder...");
                if (!transcoder->initialize()) {
                    Logger::error("[" + camera.name + "] Failed to initialize transcoder, retrying in 5s...");
                    connected = false;
                    database->updateCameraStatus(camera.id, "error");
                    std::this_thread::sleep_for(std::chrono::seconds(5));
                    continue;
                }
                
                connected = true;
                Logger::info("[" + camera.name + "] Transcoder initialized, starting recording...");
                
                // Start recording and transcoding
                if (!transcoder->processStream()) {
                    Logger::error("[" + camera.name + "] Recording stream ended or error occurred");
                    connected = false;
                }
                
                // Cleanup
                transcoder->cleanup();
                
            } catch (const std::exception& e) {
                Logger::error("[" + camera.name + "] Error: " + std::string(e.what()));
                connected = false;
                database->updateCameraStatus(camera.id, "error");
                std::this_thread::sleep_for(std::chrono::seconds(5));
            }
        }
        
        // Update status to offline when stopped
        database->updateCameraStatus(camera.id, "offline");
        Logger::info("[" + camera.name + "] Recording thread stopped");
    }
};

#endif // CAMERA_RECORDER_HPP
