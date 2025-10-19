#ifndef CAMERA_MANAGER_HPP
#define CAMERA_MANAGER_HPP

#include <vector>
#include <memory>
#include <thread>
#include <atomic>
#include "database.hpp"
#include "camera_recorder.hpp"
#include "config.hpp"
#include "logger.hpp"

class CameraManager {
public:
    CameraManager(const Config& cfg, std::shared_ptr<Database> db) 
        : config(cfg), database(db) {}
    
    ~CameraManager() {
        stopAll();
    }
    
    bool loadCameras() {
        cameras = database->getCameras();
        
        for (const auto& cam : cameras) {
            Logger::info("Camera loaded: " + cam.name + " (" + cam.location + ")");
            auto recorder = std::make_shared<CameraRecorder>(config, database, cam);
            recorders.push_back(recorder);
        }
        
        return !cameras.empty();
    }
    
    bool startAll() {
        Logger::info("Starting " + std::to_string(recorders.size()) + " camera recorders...");
        
        for (auto& recorder : recorders) {
            if (!recorder->start()) {
                Logger::error("Failed to start recorder for camera: " + recorder->getCameraName());
                return false;
            }
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
            Logger::info(recorder->getCameraName() + ": " + recorder->getStatus());
        }
    }

private:
    const Config& config;
    std::shared_ptr<Database> database;
    std::vector<Camera> cameras;
    std::vector<std::shared_ptr<CameraRecorder>> recorders;
};

#endif // CAMERA_MANAGER_HPP
