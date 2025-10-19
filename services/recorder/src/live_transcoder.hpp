#pragma once

#include <string>
#include <vector>
#include <unistd.h>
#include <sys/wait.h>
#include <signal.h>
#include "logger.hpp"

/**
 * LiveTranscoder - Transcode RTSP stream and publish to MediaMTX
 * 
 * Creates 2 quality streams for adaptive playback:
 * - Low (720p @ 2Mbps): For grid view with many cameras
 * - High (1440p @ 5Mbps): For fullscreen or small grid
 * 
 * Uses NVIDIA NVENC for hardware encoding
 */
class LiveTranscoder {
private:
    std::string cameraName;
    std::string cameraId;
    std::string rtspUrl;
    std::string quality;  // "low" or "high"
    pid_t processPid;
    bool isRunning;

public:
    LiveTranscoder(const std::string& name, const std::string& id, 
                   const std::string& url, const std::string& qual)
        : cameraName(name), cameraId(id), rtspUrl(url), 
          quality(qual), processPid(-1), isRunning(false) {}

    ~LiveTranscoder() {
        stop();
    }

    /**
     * Start transcoding and publishing to MediaMTX
     */
    bool start() {
        if (isRunning) {
            Logger::warn("Live transcoder already running for " + cameraName + " (" + quality + ")");
            return true;
        }

        // MediaMTX publish URL
        std::string publishUrl = "rtsp://vms_recorder:vms_recorder_secret_2025@localhost:8554/live/" 
                                + cameraId + "/" + quality;

        // Build FFmpeg command based on quality
        std::vector<const char*> execArgs;
        execArgs.push_back("ffmpeg");
        execArgs.push_back("-hide_banner");
        execArgs.push_back("-loglevel");
        execArgs.push_back("warning");
        
        // Input
        execArgs.push_back("-rtsp_transport");
        execArgs.push_back("tcp");
        execArgs.push_back("-i");
        execArgs.push_back(rtspUrl.c_str());

        // Video encoding - NVENC
        execArgs.push_back("-c:v");
        execArgs.push_back("h264_nvenc");
        execArgs.push_back("-preset");
        execArgs.push_back("p4");  // P4 = Medium quality/speed
        execArgs.push_back("-tune");
        execArgs.push_back("ll");  // Low latency
        
        // Quality-specific settings
        if (quality == "low") {
            // 720p @ 2Mbps for grid view
            execArgs.push_back("-s");
            execArgs.push_back("1280x720");
            execArgs.push_back("-b:v");
            execArgs.push_back("2M");
            execArgs.push_back("-maxrate");
            execArgs.push_back("2M");
            execArgs.push_back("-bufsize");
            execArgs.push_back("4M");
        } else {
            // 1440p @ 5Mbps for fullscreen
            execArgs.push_back("-s");
            execArgs.push_back("2560x1440");
            execArgs.push_back("-b:v");
            execArgs.push_back("5M");
            execArgs.push_back("-maxrate");
            execArgs.push_back("5M");
            execArgs.push_back("-bufsize");
            execArgs.push_back("10M");
        }

        // Frame rate
        execArgs.push_back("-r");
        execArgs.push_back("25");
        execArgs.push_back("-g");
        execArgs.push_back("50");  // GOP size = 2 seconds
        
        // Audio
        execArgs.push_back("-c:a");
        execArgs.push_back("aac");
        execArgs.push_back("-b:a");
        execArgs.push_back("128k");
        
        // Output format
        execArgs.push_back("-f");
        execArgs.push_back("rtsp");
        execArgs.push_back("-rtsp_transport");
        execArgs.push_back("tcp");
        
        execArgs.push_back(publishUrl.c_str());
        execArgs.push_back(nullptr);

        // Fork process
        processPid = fork();
        
        if (processPid == -1) {
            Logger::error("Failed to fork live transcoder for " + cameraName + " (" + quality + ")");
            return false;
        }

        if (processPid == 0) {
            // Child process - redirect output to log
            std::string logFile = "/tmp/live_" + cameraId + "_" + quality + ".log";
            freopen(logFile.c_str(), "a", stdout);
            freopen(logFile.c_str(), "a", stderr);

            execvp("ffmpeg", const_cast<char**>(execArgs.data()));
            
            // If execvp returns, it failed
            Logger::error("Failed to execute live transcoder for " + cameraName);
            exit(1);
        }

        // Parent process
        isRunning = true;
        Logger::info("Started live transcoder for " + cameraName + " (" + quality + ") - PID: " + std::to_string(processPid));
        return true;
    }

    /**
     * Check if process is still running
     */
    bool checkStatus() {
        if (!isRunning || processPid == -1) {
            return false;
        }

        int status;
        pid_t result = waitpid(processPid, &status, WNOHANG);
        
        if (result == 0) {
            return true;  // Still running
        } else if (result == processPid) {
            // Process exited
            if (WIFEXITED(status)) {
                Logger::warn("Live transcoder exited for " + cameraName + " (" + quality + ") - code " + std::to_string(WEXITSTATUS(status)));
            } else if (WIFSIGNALED(status)) {
                Logger::warn("Live transcoder killed for " + cameraName + " (" + quality + ") - signal " + std::to_string(WTERMSIG(status)));
            }
            isRunning = false;
            processPid = -1;
            return false;
        }
        
        return true;
    }

    /**
     * Stop transcoding
     */
    void stop() {
        if (!isRunning || processPid == -1) {
            return;
        }

        Logger::info("Stopping live transcoder for " + cameraName + " (" + quality + ")");
        
        // Send SIGTERM
        kill(processPid, SIGTERM);
        
        // Wait up to 5 seconds
        for (int i = 0; i < 50; i++) {
            int status;
            pid_t result = waitpid(processPid, &status, WNOHANG);
            if (result == processPid) {
                Logger::info("Live transcoder stopped gracefully for " + cameraName + " (" + quality + ")");
                isRunning = false;
                processPid = -1;
                return;
            }
            usleep(100000);  // 100ms
        }
        
        // Force kill if still running
        Logger::warn("Force killing live transcoder for " + cameraName + " (" + quality + ")");
        kill(processPid, SIGKILL);
        waitpid(processPid, nullptr, 0);
        isRunning = false;
        processPid = -1;
    }

    /**
     * Restart transcoding
     */
    bool restart() {
        Logger::info("Restarting live transcoder for " + cameraName + " (" + quality + ")");
        stop();
        sleep(2);  // Wait before restart
        return start();
    }

    bool getIsRunning() const { return isRunning; }
    std::string getQuality() const { return quality; }
};
