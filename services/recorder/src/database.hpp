#ifndef DATABASE_HPP
#define DATABASE_HPP

#include <string>
#include <vector>
#include <memory>
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
    Database(const Config& cfg) : config(cfg), conn(nullptr) {}
    
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
        
        return true;
    }
    
    void disconnect() {
        if (conn) {
            PQfinish(conn);
            conn = nullptr;
        }
    }
    
    std::vector<Camera> getCameras() {
        std::vector<Camera> cameras;
        
        if (!conn) {
            Logger::error("No database connection");
            return cameras;
        }
        
        const char* query = "SELECT id, name, rtsp_url, location, status FROM cameras WHERE status = 'online' ORDER BY created_at";
        PGresult* res = PQexec(conn, query);
        
        if (PQresultStatus(res) != PGRES_TUPLES_OK) {
            Logger::error("Query failed: " + std::string(PQerrorMessage(conn)));
            PQclear(res);
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
        return cameras;
    }
    
    bool updateCameraStatus(const std::string& id, const std::string& status) {
        if (!conn) return false;
        
        const char* query = "UPDATE cameras SET status = $1, updated_at = NOW() WHERE id = $2";
        const char* paramValues[2] = {status.c_str(), id.c_str()};
        
        PGresult* res = PQexecParams(conn, query, 2, nullptr, paramValues, nullptr, nullptr, 0);
        bool success = (PQresultStatus(res) == PGRES_COMMAND_OK);
        
        PQclear(res);
        return success;
    }
    
    bool insertRecording(const std::string& cameraId, const std::string& filename, 
                        const std::string& quality, int64_t fileSize) {
        if (!conn) return false;
        
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

private:
    const Config& config;
    PGconn* conn;
};

#endif // DATABASE_HPP
