#ifndef FFMPEG_MULTI_OUTPUT_HPP
#define FFMPEG_MULTI_OUTPUT_HPP

#include <string>
#include <vector>
#include <algorithm>
#include <unistd.h>
#include <sys/wait.h>
#include <signal.h>
#include "logger.hpp"
#include "encoder_detector.hpp"
#include "stream_analyzer.hpp"
#include "gpu_selector.hpp"

/**
 * FFmpegMultiOutput - Single FFmpeg process with multiple outputs
 *
 * PHASE 5 OPTIMIZATION: Hybrid GPU system
 * - Priority 1: NVIDIA NVENC (cameras 1-6) with NVDEC decode
 * - Priority 2: Intel VAAPI (cameras 7+)
 * - Auto-select GPU based on availability
 *
 * PHASE 4 OPTIMIZATION: Adaptive processing per camera
 * - Auto-detect pixel format (yuv420p vs yuvj420p)
 * - Apply optimized encoding strategy per camera type
 * - Support multiple resolutions (1080p, 2K, 4K)
 *
 * PHASE 3 OPTIMIZATION: Single process with 2 outputs
 * - Output 1: Recording (H.265/H.264, MP4 segments)
 * - Output 2: Live High (H.264, RTSP stream)
 *
 * Benefits:
 * - Hybrid GPU usage (NVIDIA + Intel)
 * - Hardware decode (NVDEC) for NVIDIA cameras
 * - 12 cameras capacity (6 NVENC + 6 VAAPI)
 * - Optimal hardware utilization
 */
class FFmpegMultiOutput {
private:
    std::string cameraName;
    std::string cameraId;
    std::string rtspUrl;
    std::string recordingPath;
    std::string rtspPublishLow;
    std::string rtspPublishHigh;

    EncoderType encoderType;
    GPUType gpuType;  // PHASE 5: GPU type (NVENC or VAAPI)
    pid_t processPid;
    bool isRunning;
    bool enableLiveStreaming;  // PHASE 3: Enable live streaming output

    // PHASE 4: Stream properties
    StreamAnalyzer::StreamInfo streamInfo;
    bool useHardwareAcceleration;  // Use CUDA for yuvj420p
    bool useHardwareDecode;  // PHASE 5: Use NVDEC for decode
    
    /**
     * Build FFmpeg command based on GPU type (PHASE 5)
     */
    std::vector<std::string> buildFFmpegCommand() {
        if (gpuType == GPUType::NVIDIA_NVENC) {
            return buildNVENCCommand();
        } else {
            return buildVAAPICommand();
        }
    }

    /**
     * Build NVIDIA NVENC command with NVDEC hardware decode
     */
    std::vector<std::string> buildNVENCCommand() {
        std::vector<std::string> args;
        args.push_back("ffmpeg");
        args.push_back("-hide_banner");
        args.push_back("-loglevel");
        args.push_back("warning");

        // PHASE 5: Hardware decode with NVDEC
        if (useHardwareDecode) {
            args.push_back("-hwaccel");
            args.push_back("cuda");
            args.push_back("-hwaccel_output_format");
            args.push_back("cuda");
            // Note: FFmpeg will auto-select h264_cuvid/hevc_cuvid decoder
        } else if (useHardwareAcceleration && streamInfo.isJpegColorRange) {
            // PHASE 4: CUDA acceleration for yuvj420p (without decode)
            args.push_back("-hwaccel");
            args.push_back("cuda");
            args.push_back("-hwaccel_output_format");
            args.push_back("cuda");
        }

        // Input
        args.push_back("-rtsp_transport");
        args.push_back("tcp");
        args.push_back("-i");
        args.push_back(rtspUrl);

        // === OUTPUT 1: Recording (H.265 NVENC, MP4 segments) ===
        args.push_back("-map");
        args.push_back("0:v");
        args.push_back("-map");
        args.push_back("0:a?");

        // PHASE 5/4: Apply filter if needed
        if (useHardwareAcceleration && streamInfo.isJpegColorRange) {
            args.push_back("-vf");
            args.push_back("scale_cuda=format=yuv420p");
        }

        args.push_back("-c:v");
        args.push_back("hevc_nvenc");
        args.push_back("-preset");
        args.push_back("p4");

        int bitrate = StreamAnalyzer::getRecommendedBitrate(
            streamInfo.width > 0 ? streamInfo.width : 1920,
            streamInfo.height > 0 ? streamInfo.height : 1080
        );
        args.push_back("-b:v");
        args.push_back(std::to_string(bitrate) + "M");

        args.push_back("-c:a");
        args.push_back("aac");
        args.push_back("-b:a");
        args.push_back("128k");

        // Segmentation
        args.push_back("-f");
        args.push_back("segment");
        args.push_back("-segment_time");
        args.push_back("180");
        args.push_back("-segment_format");
        args.push_back("mp4");
        args.push_back("-strftime");
        args.push_back("1");
        args.push_back("-reset_timestamps");
        args.push_back("1");

        std::string safeName = cameraName;
        std::replace(safeName.begin(), safeName.end(), ' ', '_');
        std::string outputPattern = recordingPath + "/" + safeName + "_%Y%m%d_%H%M%S.mp4";
        args.push_back(outputPattern);

        // === OUTPUT 2: Live High (H.264 NVENC, RTSP stream) ===
        if (enableLiveStreaming) {
            args.push_back("-map");
            args.push_back("0:v");
            args.push_back("-map");
            args.push_back("0:a?");

            if (useHardwareAcceleration && streamInfo.isJpegColorRange) {
                args.push_back("-vf");
                args.push_back("scale_cuda=1920:1080:format=yuv420p");
            }

            args.push_back("-c:v");
            args.push_back("h264_nvenc");
            args.push_back("-preset");
            args.push_back("p4");
            args.push_back("-tune");
            args.push_back("ll");

            int liveBitrate = StreamAnalyzer::getRecommendedLiveBitrate(
                streamInfo.width > 0 ? streamInfo.width : 1920,
                streamInfo.height > 0 ? streamInfo.height : 1080
            );
            args.push_back("-b:v");
            args.push_back(std::to_string(liveBitrate) + "M");
            args.push_back("-maxrate");
            args.push_back(std::to_string(liveBitrate) + "M");
            args.push_back("-bufsize");
            args.push_back(std::to_string(liveBitrate * 2) + "M");

            args.push_back("-r");
            args.push_back("25");
            args.push_back("-g");
            args.push_back("50");

            args.push_back("-c:a");
            args.push_back("aac");
            args.push_back("-b:a");
            args.push_back("128k");

            args.push_back("-f");
            args.push_back("rtsp");
            args.push_back("-rtsp_transport");
            args.push_back("tcp");
            args.push_back(rtspPublishHigh);
        }

        return args;
    }

    /**
     * Build Intel VAAPI command (PHASE 5)
     */
    std::vector<std::string> buildVAAPICommand() {
        std::vector<std::string> args;
        args.push_back("ffmpeg");
        args.push_back("-hide_banner");
        args.push_back("-loglevel");
        args.push_back("warning");

        // Input (CPU decode for VAAPI)
        args.push_back("-rtsp_transport");
        args.push_back("tcp");
        args.push_back("-i");
        args.push_back(rtspUrl);

        // === OUTPUT 1: Recording (H.264 VAAPI, MP4 segments) ===
        args.push_back("-map");
        args.push_back("0:v");
        args.push_back("-map");
        args.push_back("0:a?");

        // VAAPI filter chain
        args.push_back("-vf");
        args.push_back("format=nv12,hwupload");

        args.push_back("-c:v");
        args.push_back("h264_vaapi");

        int bitrate = StreamAnalyzer::getRecommendedBitrate(
            streamInfo.width > 0 ? streamInfo.width : 1920,
            streamInfo.height > 0 ? streamInfo.height : 1080
        );
        args.push_back("-b:v");
        args.push_back(std::to_string(bitrate) + "M");

        args.push_back("-c:a");
        args.push_back("aac");
        args.push_back("-b:a");
        args.push_back("128k");

        // Segmentation
        args.push_back("-f");
        args.push_back("segment");
        args.push_back("-segment_time");
        args.push_back("180");
        args.push_back("-segment_format");
        args.push_back("mp4");
        args.push_back("-strftime");
        args.push_back("1");
        args.push_back("-reset_timestamps");
        args.push_back("1");

        std::string safeName = cameraName;
        std::replace(safeName.begin(), safeName.end(), ' ', '_');
        std::string outputPattern = recordingPath + "/" + safeName + "_%Y%m%d_%H%M%S.mp4";
        args.push_back(outputPattern);

        // === OUTPUT 2: Live High (H.264 VAAPI, RTSP stream) ===
        if (enableLiveStreaming) {
            args.push_back("-map");
            args.push_back("0:v");
            args.push_back("-map");
            args.push_back("0:a?");

            // VAAPI filter for live (with scaling if needed)
            args.push_back("-vf");
            args.push_back("format=nv12,hwupload,scale_vaapi=1920:1080");

            args.push_back("-c:v");
            args.push_back("h264_vaapi");

            int liveBitrate = StreamAnalyzer::getRecommendedLiveBitrate(
                streamInfo.width > 0 ? streamInfo.width : 1920,
                streamInfo.height > 0 ? streamInfo.height : 1080
            );
            args.push_back("-b:v");
            args.push_back(std::to_string(liveBitrate) + "M");
            args.push_back("-maxrate");
            args.push_back(std::to_string(liveBitrate) + "M");
            args.push_back("-bufsize");
            args.push_back(std::to_string(liveBitrate * 2) + "M");

            args.push_back("-r");
            args.push_back("25");
            args.push_back("-g");
            args.push_back("50");

            args.push_back("-c:a");
            args.push_back("aac");
            args.push_back("-b:a");
            args.push_back("128k");

            args.push_back("-f");
            args.push_back("rtsp");
            args.push_back("-rtsp_transport");
            args.push_back("tcp");
            args.push_back(rtspPublishHigh);
        }

        return args;
    }

public:
    FFmpegMultiOutput(const std::string& name, const std::string& id,
                      const std::string& url, const std::string& recPath,
                      bool enableLive = true, bool enableHwAccel = true,
                      GPUType preferredGPU = GPUType::AUTO)
        : cameraName(name), cameraId(id), rtspUrl(url), recordingPath(recPath),
          processPid(-1), isRunning(false), enableLiveStreaming(enableLive),
          useHardwareAcceleration(enableHwAccel), useHardwareDecode(true) {

        // PHASE 5: GPU selection
        Logger::info("FFmpegMultiOutput created for " + cameraName);

        if (preferredGPU == GPUType::AUTO) {
            gpuType = GPUSelector::selectGPU();
        } else {
            gpuType = preferredGPU;
        }

        Logger::info("  GPU: " + GPUSelector::getGPUTypeName(gpuType));
        Logger::info("  GPU Status: " + GPUSelector::getStatus());

        // PHASE 4: Analyze stream properties
        Logger::info("  Analyzing stream properties...");
        streamInfo = StreamAnalyzer::analyze(rtspUrl, 10);

        if (!streamInfo.isValid) {
            Logger::warn("  Failed to analyze stream, using defaults");
            streamInfo.width = 1920;
            streamInfo.height = 1080;
            streamInfo.frameRate = 25.0;
            streamInfo.pixelFormat = "unknown";
            streamInfo.isJpegColorRange = false;
        }

        // Set encoder type based on GPU
        if (gpuType == GPUType::NVIDIA_NVENC) {
            encoderType = ENCODER_NVENC;
        } else {
            encoderType = ENCODER_VAAPI;
        }

        // Build MediaMTX publish URLs
        rtspPublishLow = "rtsp://vms_recorder:vms_recorder_secret_2025@localhost:8554/live/"
                        + cameraId + "/low";
        rtspPublishHigh = "rtsp://vms_recorder:vms_recorder_secret_2025@localhost:8554/live/"
                         + cameraId + "/high";

        // Log configuration
        Logger::info("  PHASE 5: Hybrid GPU system");
        Logger::info("  Resolution: " + std::to_string(streamInfo.width) + "x" +
                    std::to_string(streamInfo.height));
        Logger::info("  Pixel format: " + streamInfo.pixelFormat);

        int recBitrate = StreamAnalyzer::getRecommendedBitrate(streamInfo.width, streamInfo.height);
        int liveBitrate = StreamAnalyzer::getRecommendedLiveBitrate(streamInfo.width, streamInfo.height);

        if (gpuType == GPUType::NVIDIA_NVENC) {
            Logger::info("  Recording: H.265 NVENC @ " + std::to_string(recBitrate) + "Mbps");
            if (enableLiveStreaming) {
                Logger::info("  Live High: H.264 NVENC @ " + std::to_string(liveBitrate) + "Mbps");
            }

            if (useHardwareDecode) {
                Logger::info("  ⚡ NVDEC hardware decode enabled");
            }

            if (streamInfo.isJpegColorRange && useHardwareAcceleration) {
                Logger::info("  ⚡ CUDA hardware acceleration enabled (yuvj420p detected)");
                Logger::info("  Expected CPU: ~12-15% per camera");
            } else {
                Logger::info("  Expected CPU: ~12-15% per camera (with NVDEC)");
            }
        } else {
            Logger::info("  Recording: H.264 VAAPI @ " + std::to_string(recBitrate) + "Mbps");
            if (enableLiveStreaming) {
                Logger::info("  Live High: H.264 VAAPI @ " + std::to_string(liveBitrate) + "Mbps");
            }
            Logger::info("  Expected CPU: ~28-32% per camera");
        }
    }

    ~FFmpegMultiOutput() {
        stop();
        // PHASE 5: Release GPU allocation
        GPUSelector::releaseGPU(gpuType);
    }
    
    /**
     * Start multi-output FFmpeg process
     */
    bool start() {
        if (isRunning) {
            Logger::warn("FFmpegMultiOutput already running for " + cameraName);
            return false;
        }
        
        // Build command
        std::vector<std::string> args = buildFFmpegCommand();
        
        // Fork process
        processPid = fork();
        
        if (processPid == -1) {
            Logger::error("Failed to fork FFmpegMultiOutput for " + cameraName);
            return false;
        }
        
        if (processPid == 0) {
            // Child process - execute ffmpeg
            std::vector<char*> execArgs;
            for (auto& arg : args) {
                execArgs.push_back(const_cast<char*>(arg.c_str()));
            }
            execArgs.push_back(nullptr);
            
            // Redirect stdout/stderr to log
            std::string logFile = recordingPath + "/" + cameraName + "_multi.log";
            freopen(logFile.c_str(), "a", stdout);
            freopen(logFile.c_str(), "a", stderr);
            
            execvp("ffmpeg", execArgs.data());
            
            // If execvp returns, it failed
            Logger::error("Failed to execute FFmpegMultiOutput for " + cameraName);
            exit(1);
        }
        
        // Parent process
        isRunning = true;
        Logger::info("Started FFmpegMultiOutput for " + cameraName + " (PID: " + std::to_string(processPid) + ")");
        Logger::info("  PHASE 3: Single process with dual outputs");
        Logger::info("  Output 1 (Recording): " + recordingPath);
        if (enableLiveStreaming) {
            Logger::info("  Output 2 (Live High): " + rtspPublishHigh);
        }
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
                Logger::warn("FFmpegMultiOutput exited for " + cameraName + " - code " + std::to_string(WEXITSTATUS(status)));
            } else if (WIFSIGNALED(status)) {
                Logger::warn("FFmpegMultiOutput killed for " + cameraName + " - signal " + std::to_string(WTERMSIG(status)));
            }
            isRunning = false;
            processPid = -1;
            return false;
        }
        
        return true;
    }
    
    /**
     * Stop process gracefully
     */
    void stop() {
        if (!isRunning || processPid == -1) {
            return;
        }
        
        Logger::info("Stopping FFmpegMultiOutput for " + cameraName + " (PID: " + std::to_string(processPid) + ")");
        
        // Send SIGTERM for graceful shutdown
        kill(processPid, SIGTERM);
        
        // Wait up to 5 seconds
        for (int i = 0; i < 50; i++) {
            if (!checkStatus()) {
                Logger::info("FFmpegMultiOutput stopped gracefully for " + cameraName);
                return;
            }
            usleep(100000);  // 100ms
        }
        
        // Force kill if still running
        Logger::warn("FFmpegMultiOutput not responding, force killing for " + cameraName);
        kill(processPid, SIGKILL);
        waitpid(processPid, nullptr, 0);
        
        isRunning = false;
        processPid = -1;
    }
    
    bool getIsRunning() const { return isRunning; }
    pid_t getPid() const { return processPid; }
    EncoderType getEncoderType() const { return encoderType; }
    std::string getEncoderName() const { return EncoderDetector::getEncoderName(encoderType); }
};

#endif // FFMPEG_MULTI_OUTPUT_HPP

