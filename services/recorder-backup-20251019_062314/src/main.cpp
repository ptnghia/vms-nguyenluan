#include <iostream>
#include <memory>
#include <thread>
#include <chrono>
#include <signal.h>
#include "camera_manager.hpp"
#include "config.hpp"
#include "database.hpp"
#include "logger.hpp"

// Global flag for graceful shutdown
volatile sig_atomic_t g_shutdown = 0;

void signal_handler(int signum) {
    Logger::info("Received signal " + std::to_string(signum) + ", shutting down...");
    g_shutdown = 1;
}

int main(int argc, char* argv[]) {
    // Setup signal handlers
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    Logger::init("VMS Recorder");
    Logger::info("=== VMS Recording Engine Starting ===");
    
    try {
        // Load configuration
        Config config;
        if (!config.load()) {
            Logger::error("Failed to load configuration");
            return 1;
        }
        
        // Initialize database connection
        auto db = std::make_shared<Database>(config);
        if (!db->connect()) {
            Logger::error("Failed to connect to database");
            return 1;
        }
        
        Logger::info("Connected to PostgreSQL: " + config.getDbHost());
        
        // Initialize Camera Manager
        auto cameraManager = std::make_shared<CameraManager>(config, db);
        
        // Load cameras from database
        Logger::info("Loading cameras from database...");
        if (!cameraManager->loadCameras()) {
            Logger::error("Failed to load cameras");
            return 1;
        }
        
        int cameraCount = cameraManager->getCameraCount();
        Logger::info("Loaded " + std::to_string(cameraCount) + " cameras");
        
        // Start recording all cameras
        Logger::info("Starting recording engine...");
        if (!cameraManager->startAll()) {
            Logger::error("Failed to start recording");
            return 1;
        }
        
        Logger::info("Recording engine started successfully");
        Logger::info("Press Ctrl+C to stop");
        
        // Main loop - wait for shutdown signal
        while (!g_shutdown) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
            
            // Log status every 60 seconds
            static int counter = 0;
            if (++counter % 60 == 0) {
                cameraManager->logStatus();
            }
        }
        
        // Graceful shutdown
        Logger::info("Stopping recording engine...");
        cameraManager->stopAll();
        
        db->disconnect();
        Logger::info("Recording engine stopped");
        
    } catch (const std::exception& e) {
        Logger::error("Fatal error: " + std::string(e.what()));
        return 1;
    }
    
    return 0;
}
