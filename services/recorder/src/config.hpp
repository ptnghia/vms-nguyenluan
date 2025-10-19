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
        
        // Storage management
        retentionDays = std::stoi(getEnv("RETENTION_DAYS", "2"));  // Default 2 days, max 30
        minFreeSpaceGB = std::stoi(getEnv("MIN_FREE_SPACE_GB", "10"));  // Minimum 10GB free
        cleanupIntervalHours = std::stoi(getEnv("CLEANUP_INTERVAL_HOURS", "1"));  // Run cleanup every hour
        
        // Recording settings
        maxRetries = std::stoi(getEnv("MAX_RETRIES", "10"));  // Max reconnect attempts
        retryDelaySeconds = std::stoi(getEnv("RETRY_DELAY_SECONDS", "5"));  // Delay between retries
        
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
    
    // Storage management getters
    int getRetentionDays() const { return retentionDays; }
    uint64_t getMinFreeSpaceGB() const { return minFreeSpaceGB; }
    int getCleanupIntervalHours() const { return cleanupIntervalHours; }
    
    // Recording settings getters
    int getMaxRetries() const { return maxRetries; }
    int getRetryDelaySeconds() const { return retryDelaySeconds; }

private:
    std::string dbHost, dbName, dbUser, dbPassword;
    int dbPort;
    std::string redisHost;
    int redisPort;
    std::string recordingPath, qsvDevice, lowQuality, highQuality;
    
    // Storage management
    int retentionDays;
    uint64_t minFreeSpaceGB;
    int cleanupIntervalHours;
    
    // Recording settings
    int maxRetries;
    int retryDelaySeconds;
    
    std::string getEnv(const char* name, const std::string& defaultValue) {
        const char* value = std::getenv(name);
        return value ? std::string(value) : defaultValue;
    }
};

#endif // CONFIG_HPP
