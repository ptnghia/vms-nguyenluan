#ifndef DATABASE_HPP
#define DATABASE_HPP

#include <string>
#include <vector>
#include <memory>
#include <thread>
#include <chrono>
#include <libpq-fe.h>
#include "config.hpp"
#include "logger.hpp"

struct Camera {
    std::string id;
    std::string name;
    std::string rtspUrl;
    std::string location;
    std::string status;
};

class Database {
public:
    Database(const Config& cfg, int maxRetries = 3, int retryDelaySeconds = 5) 
        : config(cfg), conn(nullptr), maxReconnectRetries(maxRetries), 
          reconnectDelaySeconds(retryDelaySeconds), consecutiveFailures(0) {}
    
    ~Database() {
        disconnect();
    }
    
    bool connect() {
        conn = PQconnectdb(config.getConnectionString().c_str());
        
        if (PQstatus(conn) != CONNECTION_OK) {
            Logger::error("PostgreSQL connection failed: " + std::string(PQerrorMessage(conn)));
            PQfinish(conn);
            conn = nullptr;
            return false;
        }
        
        consecutiveFailures = 0;
        Logger::info("Database connection established successfully");
        return true;
    }
    
    /**
     * Connect with automatic retry logic
     */
    bool connectWithRetry() {
        for (int attempt = 1; attempt <= maxReconnectRetries; attempt++) {
            Logger::info("Database connection attempt " + std::to_string(attempt) + "/" + std::to_string(maxReconnectRetries));
            
            if (connect()) {
                return true;
            }
            
            if (attempt < maxReconnectRetries) {
                int delay = reconnectDelaySeconds * attempt;  // Exponential backoff
                Logger::warn("Retrying database connection in " + std::to_string(delay) + " seconds...");
                std::this_thread::sleep_for(std::chrono::seconds(delay));
            }
        }
        
        Logger::error("Failed to connect to database after " + std::to_string(maxReconnectRetries) + " attempts");
        return false;
    }
    
    /**
     * Check if connection is alive
     */
    bool isConnected() {
        if (!conn) return false;
        
        PGresult* res = PQexec(conn, "SELECT 1");
        bool alive = (PQresultStatus(res) == PGRES_TUPLES_OK);
        PQclear(res);
        
        return alive;
    }
    
    /**
     * Reconnect if connection is lost
     */
    bool ensureConnection() {
        if (isConnected()) {
            consecutiveFailures = 0;
            return true;
        }
        
        consecutiveFailures++;
        Logger::warn("Database connection lost (failure #" + std::to_string(consecutiveFailures) + "), attempting reconnection...");
        
        disconnect();
        return connectWithRetry();
    }
    
    void disconnect() {
        if (conn) {
            PQfinish(conn);
            conn = nullptr;
        }
    }
    
    std::vector<Camera> getCameras() {
        std::vector<Camera> cameras;
        
        // Ensure connection is alive
        if (!ensureConnection()) {
            Logger::error("Cannot get cameras - database connection unavailable");
            return cameras;
        }
        
        const char* query = "SELECT id, name, rtsp_url, location, status FROM cameras WHERE status = 'online' ORDER BY created_at";
        PGresult* res = PQexec(conn, query);
        
        if (PQresultStatus(res) != PGRES_TUPLES_OK) {
            Logger::error("Query failed: " + std::string(PQerrorMessage(conn)));
            PQclear(res);
            
            // Mark connection as bad and retry once
            consecutiveFailures++;
            if (ensureConnection()) {
                return getCameras();  // Retry once after reconnection
            }
            return cameras;
        }
        
        int rows = PQntuples(res);
        for (int i = 0; i < rows; i++) {
            Camera cam;
            cam.id = PQgetvalue(res, i, 0);
            cam.name = PQgetvalue(res, i, 1);
            cam.rtspUrl = PQgetvalue(res, i, 2);
            cam.location = PQgetvalue(res, i, 3);
            cam.status = PQgetvalue(res, i, 4);
            cameras.push_back(cam);
        }
        
        PQclear(res);
        consecutiveFailures = 0;
        return cameras;
    }
    
    bool updateCameraStatus(const std::string& id, const std::string& status) {
        if (!ensureConnection()) return false;
        
        const char* query = "UPDATE cameras SET status = $1, updated_at = NOW() WHERE id = $2";
        const char* paramValues[2] = {status.c_str(), id.c_str()};
        
        PGresult* res = PQexecParams(conn, query, 2, nullptr, paramValues, nullptr, nullptr, 0);
        bool success = (PQresultStatus(res) == PGRES_COMMAND_OK);
        
        PQclear(res);
        return success;
    }
    
    bool insertRecording(const std::string& cameraId, const std::string& filename, 
                        const std::string& quality, int64_t fileSize) {
        if (!ensureConnection()) return false;
        
        const char* query = "INSERT INTO recordings (camera_id, filename, file_path, quality, file_size, start_time) VALUES ($1, $2, $3, $4, $5, NOW())";
        
        std::string filePath = config.getRecordingPath() + "/" + filename;
        std::string fileSizeStr = std::to_string(fileSize);
        
        const char* paramValues[5] = {
            cameraId.c_str(),
            filename.c_str(),
            filePath.c_str(),
            quality.c_str(),
            fileSizeStr.c_str()
        };
        
        PGresult* res = PQexecParams(conn, query, 5, nullptr, paramValues, nullptr, nullptr, 0);
        bool success = (PQresultStatus(res) == PGRES_COMMAND_OK);
        
        PQclear(res);
        return success;
    }
    
    int getConsecutiveFailures() const {
        return consecutiveFailures;
    }

private:
    const Config& config;
    PGconn* conn;
    int maxReconnectRetries;
    int reconnectDelaySeconds;
    int consecutiveFailures;
};

#endif // DATABASE_HPP
