#ifndef STREAM_ANALYZER_HPP
#define STREAM_ANALYZER_HPP

#include <string>
#include <memory>
#include "logger.hpp"

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/pixdesc.h>
}

/**
 * StreamAnalyzer - Analyze RTSP stream properties
 * 
 * Detects:
 * - Pixel format (yuv420p, yuvj420p, etc.)
 * - Resolution (width x height)
 * - Frame rate
 * - Codec
 * 
 * Used to determine optimal encoding strategy per camera
 */
class StreamAnalyzer {
public:
    struct StreamInfo {
        std::string pixelFormat;
        int width;
        int height;
        double frameRate;
        std::string codec;
        bool isJpegColorRange;  // true if yuvj420p
        bool isValid;
        
        StreamInfo() : width(0), height(0), frameRate(0), 
                      isJpegColorRange(false), isValid(false) {}
    };

    /**
     * Analyze RTSP stream and return properties
     * 
     * @param rtspUrl RTSP URL to analyze
     * @param timeoutSeconds Timeout for analysis (default: 10 seconds)
     * @return StreamInfo structure with detected properties
     */
    static StreamInfo analyze(const std::string& rtspUrl, int timeoutSeconds = 10) {
        StreamInfo info;
        AVFormatContext* formatCtx = nullptr;
        
        Logger::info("Analyzing stream: " + rtspUrl);
        
        // Set timeout
        AVDictionary* opts = nullptr;
        av_dict_set(&opts, "rtsp_transport", "tcp", 0);
        av_dict_set(&opts, "timeout", std::to_string(timeoutSeconds * 1000000).c_str(), 0);
        
        // Open input
        int ret = avformat_open_input(&formatCtx, rtspUrl.c_str(), nullptr, &opts);
        av_dict_free(&opts);
        
        if (ret < 0) {
            char errbuf[AV_ERROR_MAX_STRING_SIZE];
            av_strerror(ret, errbuf, sizeof(errbuf));
            Logger::error("Failed to open stream: " + std::string(errbuf));
            return info;
        }
        
        // Find stream info
        ret = avformat_find_stream_info(formatCtx, nullptr);
        if (ret < 0) {
            Logger::error("Failed to find stream info");
            avformat_close_input(&formatCtx);
            return info;
        }
        
        // Find video stream
        int videoStreamIndex = -1;
        for (unsigned int i = 0; i < formatCtx->nb_streams; i++) {
            if (formatCtx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
                videoStreamIndex = i;
                break;
            }
        }
        
        if (videoStreamIndex == -1) {
            Logger::error("No video stream found");
            avformat_close_input(&formatCtx);
            return info;
        }
        
        // Get stream parameters
        AVStream* videoStream = formatCtx->streams[videoStreamIndex];
        AVCodecParameters* codecpar = videoStream->codecpar;
        
        // Extract information
        info.width = codecpar->width;
        info.height = codecpar->height;
        
        // Frame rate
        if (videoStream->avg_frame_rate.den != 0) {
            info.frameRate = (double)videoStream->avg_frame_rate.num / videoStream->avg_frame_rate.den;
        } else {
            info.frameRate = 25.0;  // Default
        }
        
        // Codec
        const AVCodec* codec = avcodec_find_decoder(codecpar->codec_id);
        if (codec) {
            info.codec = codec->name;
        }
        
        // Pixel format
        const char* pixFmtName = av_get_pix_fmt_name((AVPixelFormat)codecpar->format);
        if (pixFmtName) {
            info.pixelFormat = pixFmtName;
            
            // Check if JPEG color range (yuvj420p, yuvj422p, yuvj444p)
            std::string pixFmt = info.pixelFormat;
            info.isJpegColorRange = (pixFmt.find("yuvj") == 0);
        } else {
            info.pixelFormat = "unknown";
        }
        
        info.isValid = true;
        
        // Log results
        Logger::info("Stream analysis complete:");
        Logger::info("  Resolution: " + std::to_string(info.width) + "x" + std::to_string(info.height));
        Logger::info("  Frame rate: " + std::to_string(info.frameRate) + " fps");
        Logger::info("  Codec: " + info.codec);
        Logger::info("  Pixel format: " + info.pixelFormat);
        if (info.isJpegColorRange) {
            Logger::warn("  ⚠️  JPEG color range detected - will use optimized encoding");
        }
        
        // Cleanup
        avformat_close_input(&formatCtx);
        
        return info;
    }
    
    /**
     * Get recommended bitrate based on resolution
     * 
     * @param width Video width
     * @param height Video height
     * @return Recommended bitrate in Mbps
     */
    static int getRecommendedBitrate(int width, int height) {
        int pixels = width * height;
        
        // 1080p (1920x1080 = 2,073,600 pixels)
        if (pixels <= 2100000) {
            return 2;  // 2 Mbps
        }
        // 2K (2560x1440 = 3,686,400 pixels)
        else if (pixels <= 3700000) {
            return 4;  // 4 Mbps
        }
        // 4K (3840x2160 = 8,294,400 pixels)
        else if (pixels <= 8300000) {
            return 8;  // 8 Mbps
        }
        // 8K or higher
        else {
            return 16;  // 16 Mbps
        }
    }
    
    /**
     * Get recommended live streaming bitrate
     * 
     * @param width Video width
     * @param height Video height
     * @return Recommended bitrate in Mbps
     */
    static int getRecommendedLiveBitrate(int width, int height) {
        int pixels = width * height;
        
        // 1080p
        if (pixels <= 2100000) {
            return 3;  // 3 Mbps
        }
        // 2K
        else if (pixels <= 3700000) {
            return 5;  // 5 Mbps
        }
        // 4K
        else if (pixels <= 8300000) {
            return 10;  // 10 Mbps
        }
        // 8K or higher
        else {
            return 20;  // 20 Mbps
        }
    }
};

#endif // STREAM_ANALYZER_HPP

