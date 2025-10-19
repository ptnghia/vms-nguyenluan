#include <iostream>
#include <memory>
#include <thread>
#include <chrono>
#include <signal.h>
#include "camera_manager.hpp"
#include "config.hpp"
#include "database.hpp"
#include "logger.hpp"
#include "storage_manager.hpp"
#include "mediamtx_health.hpp"

// Global flag for graceful shutdown
volatile sig_atomic_t g_shutdown = 0;

// Helper function to get environment variable
static std::string getEnvVar(const char* name, const std::string& defaultValue) {
    const char* value = std::getenv(name);
    return value ? std::string(value) : defaultValue;
}

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
        auto db = std::make_shared<Database>(config, 3, 5);  // 3 retries, 5s delay
        if (!db->connectWithRetry()) {
            Logger::error("Failed to connect to database after retries");
            return 1;
        }
        
        Logger::info("Connected to PostgreSQL: " + config.getDbHost());
        
        // Initialize Storage Manager
        auto storageManager = std::make_shared<StorageManager>(
            config.getRecordingPath(),
            config.getRetentionDays(),
            config.getMinFreeSpaceGB()
        );
        
        // Log initial storage status
        storageManager->logStorageInfo();
        
        // Check if enough disk space to start recording
        if (!storageManager->hasEnoughSpace()) {
            Logger::error("Insufficient disk space to start recording. Please free up disk space.");
            // Try emergency cleanup first
            Logger::info("Attempting emergency cleanup...");
            uint64_t freed = storageManager->emergencyCleanup(config.getMinFreeSpaceGB() + 20); // Target 20GB extra
            if (freed > 0) {
                Logger::info("Emergency cleanup freed " + std::to_string(freed) + " GB");
                if (!storageManager->hasEnoughSpace()) {
                    Logger::error("Still insufficient space after cleanup. Exiting.");
                    return 1;
                }
            } else {
                Logger::error("Emergency cleanup failed. Exiting.");
                return 1;
            }
        }
        
        Logger::info("Disk space check passed - sufficient space available");
        
        // Initialize MediaMTX Health Monitor
        std::string mediamtxUrl = getEnvVar("MEDIAMTX_API_URL", "http://localhost:9997");
        int healthCheckInterval = std::stoi(getEnvVar("MEDIAMTX_HEALTH_CHECK_INTERVAL", "30"));
        auto mediamtxHealth = std::make_shared<MediaMTXHealth>(mediamtxUrl, healthCheckInterval);
        
        // Initial MediaMTX health check
        if (mediamtxHealth->checkNow()) {
            Logger::info("MediaMTX server is healthy - live streaming available");
        } else {
            Logger::warn("MediaMTX server is not responding - live streaming will be disabled until it comes online");
        }
        
        // Initialize Camera Manager
        auto cameraManager = std::make_shared<CameraManager>(config, db, storageManager);
        
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
        
        // Storage cleanup thread
        auto lastCleanup = std::chrono::steady_clock::now();
        int cleanupIntervalSeconds = config.getCleanupIntervalHours() * 3600;
        
        // Main loop - wait for shutdown signal
        while (!g_shutdown) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
            
            // Log status every 60 seconds
            static int counter = 0;
            if (++counter % 60 == 0) {
                cameraManager->logStatus();
                
                // Check MediaMTX health
                std::string mediamtxStatus = mediamtxHealth->getStatus();
                Logger::info("MediaMTX Status: " + mediamtxStatus);
                
                // Check database connection
                if (!db->isConnected()) {
                    Logger::warn("Database connection check failed - will auto-reconnect on next query");
                }
            }
            
            // Check MediaMTX health every 30 seconds (configurable)
            if (counter % 30 == 0) {
                mediamtxHealth->isServerHealthy();
            }
            
            // Check if it's time for cleanup
            auto now = std::chrono::steady_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - lastCleanup).count();
            
            if (elapsed >= cleanupIntervalSeconds) {
                Logger::info("Running scheduled cleanup...");
                storageManager->logStorageInfo();
                
                // Run normal cleanup
                storageManager->cleanupOldRecordings();
                
                // Check if emergency cleanup needed
                if (!storageManager->hasEnoughSpace()) {
                    Logger::warn("Disk space critical - running emergency cleanup");
                    uint64_t freedGB = storageManager->emergencyCleanup(config.getMinFreeSpaceGB() + 10);
                    if (freedGB > 0) {
                        Logger::info("Emergency cleanup freed " + std::to_string(freedGB) + " GB");
                    }
                }
                
                lastCleanup = now;
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
