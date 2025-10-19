#ifndef LOGGER_HPP
#define LOGGER_HPP

#include <string>
#include <iostream>
#include <ctime>
#include <iomanip>
#include <sstream>

class Logger {
public:
    static void init(const std::string& name) {
        serviceName = name;
    }
    
    static void info(const std::string& message) {
        log("INFO", message);
    }
    
    static void warn(const std::string& message) {
        log("WARN", message);
    }
    
    static void error(const std::string& message) {
        log("ERROR", message);
    }
    
    static void debug(const std::string& message) {
        log("DEBUG", message);
    }

private:
    static std::string serviceName;
    
    static void log(const std::string& level, const std::string& message) {
        auto now = std::time(nullptr);
        auto tm = *std::localtime(&now);
        
        std::ostringstream oss;
        oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S")
            << " [" << level << "] "
            << "[" << serviceName << "] "
            << message;
        
        if (level == "ERROR") {
            std::cerr << oss.str() << std::endl;
        } else {
            std::cout << oss.str() << std::endl;
        }
    }
};

std::string Logger::serviceName = "VMS";

#endif // LOGGER_HPP
