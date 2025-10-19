#ifndef FFMPEG_PROCESS_HPP
#define FFMPEG_PROCESS_HPP

#include <string>
#include <vector>
#include <algorithm>
#include <unistd.h>
#include <sys/wait.h>
#include <signal.h>
#include "logger.hpp"

/**
 * Simple FFmpeg process wrapper
 * - Spawns ffmpeg CLI as child process
 * - No complex libav* API - just process management
 * - Easy to debug, stable, proven
 */
class FFmpegProcess {
private:
    std::string cameraName;
    std::string rtspUrl;
    std::string outputDir;
    pid_t processPid;
    bool isRunning;

public:
    FFmpegProcess(const std::string& name, const std::string& url, const std::string& dir)
        : cameraName(name), rtspUrl(url), outputDir(dir), processPid(-1), isRunning(false) {}

    ~FFmpegProcess() {
        stop();
    }

    /**
     * Start recording process (ORIGINAL QUALITY ONLY for MVP)
     * - Copy codec (no transcoding)
     * - 1 hour segments
     * - Auto-reconnect on disconnect
     */
    bool startOriginalRecording() {
        if (isRunning) {
            Logger::warn("FFmpeg already running for " + cameraName);
            return false;
        }

        // Create output path with timestamp pattern (replace spaces with underscores)
        std::string safeName = cameraName;
        std::replace(safeName.begin(), safeName.end(), ' ', '_');
        std::string outputPattern = outputDir + "/" + safeName + "_%Y%m%d_%H%M%S.mp4";

        // Build ffmpeg command
        std::vector<std::string> args = {
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "warning",
            "-rtsp_transport", "tcp",
            "-i", rtspUrl,
            "-c:v", "copy",           // Copy codec - no transcoding
            "-c:a", "copy",           // Copy audio
            "-f", "segment",          // Segment muxer
            "-segment_time", "300",   // 5 minutes = 300 seconds (easy to review)
            "-segment_format", "mp4",
            "-strftime", "1",         // Enable timestamp in filename
            "-reset_timestamps", "1", // Reset timestamps each segment
            outputPattern
        };

        // Fork process
        processPid = fork();
        
        if (processPid == -1) {
            Logger::error("Failed to fork process for " + cameraName);
            return false;
        }

        if (processPid == 0) {
            // Child process - execute ffmpeg
            std::vector<char*> execArgs;
            for (auto& arg : args) {
                execArgs.push_back(const_cast<char*>(arg.c_str()));
            }
            execArgs.push_back(nullptr);

            // Redirect stdout/stderr to logs
            std::string logFile = outputDir + "/" + cameraName + "_ffmpeg.log";
            freopen(logFile.c_str(), "a", stdout);
            freopen(logFile.c_str(), "a", stderr);

            execvp("ffmpeg", execArgs.data());
            
            // If execvp returns, it failed
            Logger::error("Failed to execute ffmpeg for " + cameraName);
            exit(1);
        }

        // Parent process
        isRunning = true;
        Logger::info("Started FFmpeg process for " + cameraName + " (PID: " + std::to_string(processPid) + ")");
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
            // Process still running
            return true;
        } else if (result == processPid) {
            // Process exited
            if (WIFEXITED(status)) {
                Logger::warn("FFmpeg exited for " + cameraName + " with code " + std::to_string(WEXITSTATUS(status)));
            } else if (WIFSIGNALED(status)) {
                Logger::warn("FFmpeg killed for " + cameraName + " by signal " + std::to_string(WTERMSIG(status)));
            }
            isRunning = false;
            processPid = -1;
            return false;
        } else {
            // Error
            Logger::error("waitpid error for " + cameraName);
            isRunning = false;
            return false;
        }
    }

    /**
     * Stop recording process gracefully
     */
    void stop() {
        if (!isRunning || processPid == -1) {
            return;
        }

        Logger::info("Stopping FFmpeg for " + cameraName + " (PID: " + std::to_string(processPid) + ")");
        
        // Send SIGTERM for graceful shutdown
        kill(processPid, SIGTERM);
        
        // Wait up to 5 seconds for process to exit
        for (int i = 0; i < 50; i++) {
            if (!checkStatus()) {
                Logger::info("FFmpeg stopped gracefully for " + cameraName);
                return;
            }
            usleep(100000); // 100ms
        }

        // Force kill if still running
        Logger::warn("FFmpeg not responding, force killing for " + cameraName);
        kill(processPid, SIGKILL);
        waitpid(processPid, nullptr, 0);
        
        isRunning = false;
        processPid = -1;
    }

    /**
     * Restart process (for auto-reconnect)
     */
    bool restart() {
        Logger::info("Restarting FFmpeg for " + cameraName);
        stop();
        sleep(2); // Wait before reconnect
        return startOriginalRecording();
    }

    bool getIsRunning() const { return isRunning; }
    pid_t getPid() const { return processPid; }
    std::string getCameraName() const { return cameraName; }
};

#endif // FFMPEG_PROCESS_HPP
