#ifndef CAMERA_MANAGER_HPP
#define CAMERA_MANAGER_HPP

#include <vector>
#include <memory>
#include <thread>
#include <atomic>
#include "database.hpp"
#include "camera_recorder.hpp"
#include "storage_manager.hpp"
#include "config.hpp"
#include "logger.hpp"

class CameraManager {
public:
    CameraManager(const Config& cfg, std::shared_ptr<Database> db, 
                  std::shared_ptr<StorageManager> storage) 
        : config(cfg), database(db), storageManager(storage) {}
    
    ~CameraManager() {
        stopAll();
    }
    
    bool loadCameras() {
        cameras = database->getCameras();
        
        for (const auto& cam : cameras) {
            Logger::info("Camera loaded: " + cam.name + " (" + cam.location + ")");
            
            // Create recorder with camera ID for MediaMTX path
            int camId = 0;
            std::string camIdStr = cam.id;  // Use UUID as string ID for MediaMTX
            
            try {
                camId = std::stoi(cam.id);
            } catch (...) {
                // If ID is not numeric (UUID), use hash for numeric ID
                camId = std::hash<std::string>{}(cam.id) % 10000;
            }
            
            auto recorder = std::make_shared<CameraRecorder>(
                camId,
                camIdStr,  // Pass string ID for MediaMTX
                cam.name, 
                cam.rtspUrl,
                config.getRecordingPath(),
                storageManager,  // Pass storage manager
                config.getMaxRetries(),
                config.getRetryDelaySeconds()
            );
            recorders.push_back(recorder);
        }
        
        return !cameras.empty();
    }
    
    bool startAll() {
        Logger::info("Starting " + std::to_string(recorders.size()) + " camera recorders...");
        
        for (auto& recorder : recorders) {
            recorder->start();
        }
        
        Logger::info("All recorders started successfully");
        return true;
    }
    
    void stopAll() {
        Logger::info("Stopping all recorders...");
        
        for (auto& recorder : recorders) {
            recorder->stop();
        }
        
        recorders.clear();
    }
    
    int getCameraCount() const {
        return cameras.size();
    }
    
    void logStatus() {
        Logger::info("=== Recorder Status ===");
        for (const auto& recorder : recorders) {
            std::string status = recorder->getName() + ": " + recorder->getStatus();
            if (recorder->hasFailed()) {
                Logger::error(status + " - MANUAL INTERVENTION REQUIRED");
            } else if (recorder->getConsecutiveFailures() > 0) {
                Logger::warn(status);
            } else {
                Logger::info(status);
            }
        }
    }

private:
    const Config& config;
    std::shared_ptr<Database> database;
    std::shared_ptr<StorageManager> storageManager;
    std::vector<Camera> cameras;
    std::vector<std::shared_ptr<CameraRecorder>> recorders;
};

#endif // CAMERA_MANAGER_HPP
