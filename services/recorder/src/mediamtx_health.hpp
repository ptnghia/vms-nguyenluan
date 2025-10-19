#ifndef MEDIAMTX_HEALTH_HPP
#define MEDIAMTX_HEALTH_HPP

#include <string>
#include <curl/curl.h>
#include <chrono>
#include "logger.hpp"

/**
 * MediaMTX Health Monitor
 * - HTTP health check to MediaMTX API
 * - Detects if streaming server is down
 * - Configurable check interval
 */
class MediaMTXHealth {
private:
    std::string apiUrl;
    int checkIntervalSeconds;
    std::chrono::steady_clock::time_point lastCheck;
    bool isHealthy;
    int consecutiveFailures;
    
    // Callback for CURL to write response data
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
        ((std::string*)userp)->append((char*)contents, size * nmemb);
        return size * nmemb;
    }
    
    /**
     * Perform HTTP GET request to MediaMTX API
     */
    bool performHealthCheck() {
        CURL* curl = curl_easy_init();
        if (!curl) {
            Logger::error("Failed to initialize CURL for MediaMTX health check");
            return false;
        }
        
        std::string response;
        long httpCode = 0;
        
        // Try /v3/config endpoint - MediaMTX API
        std::string url = apiUrl + "/v3/config";
        
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);  // 5 second timeout
        curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 3L);  // 3 second connection timeout
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        
        CURLcode res = curl_easy_perform(curl);
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
        curl_easy_cleanup(curl);
        
        if (res != CURLE_OK) {
            Logger::warn("MediaMTX health check failed: " + std::string(curl_easy_strerror(res)));
            return false;
        }
        
        if (httpCode != 200) {
            Logger::warn("MediaMTX health check returned HTTP " + std::to_string(httpCode));
            return false;
        }
        
        return true;
    }

public:
    MediaMTXHealth(const std::string& url = "http://localhost:9997", int interval = 30)
        : apiUrl(url), checkIntervalSeconds(interval), isHealthy(false), consecutiveFailures(0) {
        lastCheck = std::chrono::steady_clock::now() - std::chrono::seconds(interval); // Force first check
        
        // Initialize CURL globally
        curl_global_init(CURL_GLOBAL_DEFAULT);
    }
    
    ~MediaMTXHealth() {
        curl_global_cleanup();
    }
    
    /**
     * Check if MediaMTX is healthy
     * Returns cached result if checked recently
     */
    bool isServerHealthy() {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - lastCheck).count();
        
        // Only check if interval has passed
        if (elapsed >= checkIntervalSeconds) {
            bool healthy = performHealthCheck();
            
            if (healthy) {
                if (!isHealthy || consecutiveFailures > 0) {
                    Logger::info("MediaMTX server is healthy and responding");
                    if (consecutiveFailures > 0) {
                        Logger::info("MediaMTX recovered after " + std::to_string(consecutiveFailures) + " failures");
                    }
                }
                isHealthy = true;
                consecutiveFailures = 0;
            } else {
                consecutiveFailures++;
                if (isHealthy) {
                    Logger::error("MediaMTX server is DOWN! Live streaming unavailable.");
                } else {
                    Logger::warn("MediaMTX still down (failure #" + std::to_string(consecutiveFailures) + ")");
                }
                isHealthy = false;
            }
            
            lastCheck = now;
        }
        
        return isHealthy;
    }
    
    /**
     * Force immediate health check (bypass interval)
     */
    bool checkNow() {
        lastCheck = std::chrono::steady_clock::now() - std::chrono::seconds(checkIntervalSeconds);
        return isServerHealthy();
    }
    
    /**
     * Get server status string
     */
    std::string getStatus() const {
        if (isHealthy) {
            return "Online";
        } else if (consecutiveFailures > 0) {
            return "Down (" + std::to_string(consecutiveFailures) + " failures)";
        } else {
            return "Unknown";
        }
    }
    
    int getConsecutiveFailures() const {
        return consecutiveFailures;
    }
};

#endif // MEDIAMTX_HEALTH_HPP
