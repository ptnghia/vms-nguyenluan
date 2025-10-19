#ifndef CONFIG_HPP
#define CONFIG_HPP

#include <string>
#include <cstdlib>

class Config {
public:
    bool load() {
        // Load from environment variables
        dbHost = getEnv("DATABASE_HOST", "postgres");
        dbPort = std::stoi(getEnv("DATABASE_PORT", "5432"));
        dbName = getEnv("DATABASE_NAME", "vms");
        dbUser = getEnv("DATABASE_USER", "vms_user");
        dbPassword = getEnv("POSTGRES_PASSWORD", "");
        
        redisHost = getEnv("REDIS_HOST", "redis");
        redisPort = std::stoi(getEnv("REDIS_PORT", "6379"));
        
        recordingPath = getEnv("RECORDING_PATH", "/data/recordings");
        qsvDevice = getEnv("QSV_DEVICE", "/dev/dri/renderD128");
        lowQuality = getEnv("QSV_LOW_QUALITY", "720p");
        highQuality = getEnv("QSV_HIGH_QUALITY", "1440p");
        
        return !dbPassword.empty();
    }
    
    std::string getDbHost() const { return dbHost; }
    int getDbPort() const { return dbPort; }
    std::string getDbName() const { return dbName; }
    std::string getDbUser() const { return dbUser; }
    std::string getDbPassword() const { return dbPassword; }
    std::string getConnectionString() const {
        return "host=" + dbHost + 
               " port=" + std::to_string(dbPort) +
               " dbname=" + dbName +
               " user=" + dbUser +
               " password=" + dbPassword;
    }
    
    std::string getRedisHost() const { return redisHost; }
    int getRedisPort() const { return redisPort; }
    
    std::string getRecordingPath() const { return recordingPath; }
    std::string getQsvDevice() const { return qsvDevice; }
    std::string getLowQuality() const { return lowQuality; }
    std::string getHighQuality() const { return highQuality; }

private:
    std::string dbHost, dbName, dbUser, dbPassword;
    int dbPort;
    std::string redisHost;
    int redisPort;
    std::string recordingPath, qsvDevice, lowQuality, highQuality;
    
    std::string getEnv(const char* name, const std::string& defaultValue) {
        const char* value = std::getenv(name);
        return value ? std::string(value) : defaultValue;
    }
};

#endif // CONFIG_HPP
