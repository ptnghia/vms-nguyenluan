#ifndef FFMPEG_TRANSCODER_HPP
#define FFMPEG_TRANSCODER_HPP

#include <string>
#include <memory>
#include <ctime>
#include <sys/stat.h>
#include <sys/types.h>
#include <errno.h>

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/opt.h>
#include <libavutil/imgutils.h>
#include <libavutil/hwcontext.h>
#include <libavutil/hwcontext_qsv.h>
#include <libavutil/time.h>
#include <libswscale/swscale.h>
}

#include "logger.hpp"

class FFmpegTranscoder {
public:
    FFmpegTranscoder(const std::string& inputUrl, const std::string& outputDir)
        : inputUrl(inputUrl), outputDir(outputDir),
          inputFormatCtx(nullptr), videoStreamIndex(-1),
          originalFormatCtx(nullptr), lowQualityFormatCtx(nullptr), highQualityFormatCtx(nullptr),
          originalVideoStream(nullptr), lowQualityVideoStream(nullptr), highQualityVideoStream(nullptr),
          videoDecoder(nullptr), videoDecoderCtx(nullptr),
          h264Encoder(nullptr), h264EncoderCtx(nullptr),
          qsvLowEncoder(nullptr), qsvLowEncoderCtx(nullptr),
          qsvHighEncoder(nullptr), qsvHighEncoderCtx(nullptr),
          swsCtxLow(nullptr), swsCtxHigh(nullptr),
          currentSegment(0), segmentDuration(3600) {} // 1 hour segments
    
    ~FFmpegTranscoder() {
        cleanup();
    }
    
    bool initialize() {
        // Open input RTSP stream
        AVDictionary* opts = nullptr;
        av_dict_set(&opts, "rtsp_transport", "tcp", 0);
        av_dict_set(&opts, "stimeout", "5000000", 0); // 5 second timeout
        av_dict_set(&opts, "buffer_size", "1024000", 0);
        
        int ret = avformat_open_input(&inputFormatCtx, inputUrl.c_str(), nullptr, &opts);
        av_dict_free(&opts);
        
        if (ret < 0) {
            logError("Cannot open input", ret);
            return false;
        }
        
        ret = avformat_find_stream_info(inputFormatCtx, nullptr);
        if (ret < 0) {
            logError("Cannot find stream info", ret);
            return false;
        }
        
        // Find video stream
        for (unsigned i = 0; i < inputFormatCtx->nb_streams; i++) {
            if (inputFormatCtx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
                videoStreamIndex = i;
                break;
            }
        }
        
        if (videoStreamIndex == -1) {
            Logger::error("No video stream found");
            return false;
        }
        
        // Initialize decoder
        if (!initializeDecoder()) {
            return false;
        }
        
        // Initialize encoders and outputs
        if (!initializeOutputs()) {
            return false;
        }
        
        Logger::info("FFmpeg transcoder initialized successfully");
        return true;
    }
    
    bool processStream() {
        AVPacket* packet = av_packet_alloc();
        if (!packet) {
            Logger::error("Cannot allocate packet");
            return false;
        }
        
        int64_t lastSegmentTime = av_gettime();
        int64_t segmentStartTime = lastSegmentTime;
        
        while (av_read_frame(inputFormatCtx, packet) >= 0) {
            if (packet->stream_index == videoStreamIndex) {
                // Check if we need to start a new segment (every 1 hour)
                int64_t currentTime = av_gettime();
                int64_t elapsedSeconds = (currentTime - segmentStartTime) / 1000000;
                
                if ((currentTime - segmentStartTime) >= (segmentDuration * 1000000)) {
                    Logger::info("Starting new recording segment after " + std::to_string(elapsedSeconds) + " seconds");
                    closeOutputs();
                    currentSegment++;
                    if (!initializeOutputs()) {
                        Logger::error("Failed to initialize new segment outputs");
                        av_packet_unref(packet);
                        av_packet_free(&packet);
                        return false;
                    }
                    // CRITICAL: Update segment start time AFTER successful initialization
                    segmentStartTime = av_gettime();
                }
                
                // Process packet: decode -> write original -> transcode -> write transcoded
                if (!processPacket(packet)) {
                    Logger::warn("Error processing packet, continuing...");
                }
            }
            
            av_packet_unref(packet);
        }
        
        av_packet_free(&packet);
        return true;
    }
    
    void cleanup() {
        closeOutputs();
        
        if (swsCtxLow) {
            sws_freeContext(swsCtxLow);
            swsCtxLow = nullptr;
        }
        
        if (swsCtxHigh) {
            sws_freeContext(swsCtxHigh);
            swsCtxHigh = nullptr;
        }
        
        if (qsvLowEncoderCtx) {
            avcodec_free_context(&qsvLowEncoderCtx);
        }
        
        if (qsvHighEncoderCtx) {
            avcodec_free_context(&qsvHighEncoderCtx);
        }
        
        if (h264EncoderCtx) {
            avcodec_free_context(&h264EncoderCtx);
        }
        
        if (videoDecoderCtx) {
            avcodec_free_context(&videoDecoderCtx);
        }
        
        if (inputFormatCtx) {
            avformat_close_input(&inputFormatCtx);
        }
    }

private:
    std::string inputUrl;
    std::string outputDir;
    
    AVFormatContext* inputFormatCtx;
    int videoStreamIndex;
    
    AVFormatContext* originalFormatCtx;
    AVFormatContext* lowQualityFormatCtx;
    AVFormatContext* highQualityFormatCtx;
    
    AVStream* originalVideoStream;
    AVStream* lowQualityVideoStream;
    AVStream* highQualityVideoStream;
    
    const AVCodec* videoDecoder;
    AVCodecContext* videoDecoderCtx;
    
    const AVCodec* h264Encoder;
    AVCodecContext* h264EncoderCtx;
    
    const AVCodec* qsvLowEncoder;
    AVCodecContext* qsvLowEncoderCtx;
    
    const AVCodec* qsvHighEncoder;
    AVCodecContext* qsvHighEncoderCtx;
    
    SwsContext* swsCtxLow;
    SwsContext* swsCtxHigh;
    
    int currentSegment;
    int segmentDuration;
    
    bool initializeDecoder() {
        AVCodecParameters* codecpar = inputFormatCtx->streams[videoStreamIndex]->codecpar;
        
        videoDecoder = avcodec_find_decoder(codecpar->codec_id);
        if (!videoDecoder) {
            Logger::error("Decoder not found");
            return false;
        }
        
        videoDecoderCtx = avcodec_alloc_context3(videoDecoder);
        if (!videoDecoderCtx) {
            Logger::error("Cannot allocate decoder context");
            return false;
        }
        
        if (avcodec_parameters_to_context(videoDecoderCtx, codecpar) < 0) {
            Logger::error("Cannot copy codec parameters");
            return false;
        }
        
        if (avcodec_open2(videoDecoderCtx, videoDecoder, nullptr) < 0) {
            Logger::error("Cannot open decoder");
            return false;
        }
        
        Logger::info("Decoder initialized: " + std::to_string(codecpar->width) + "x" + 
                    std::to_string(codecpar->height));
        return true;
    }
    
    bool initializeOutputs() {
        std::string timestamp = getTimestamp();
        
        // Create output directory recursively
        if (!createDirectory(outputDir)) {
            Logger::error("Cannot create output directory: " + outputDir);
            return false;
        }
        
        // Initialize original quality output (copy codec)
        std::string originalFile = outputDir + "/original_" + timestamp + ".mp4";
        if (!initializeOriginalOutput(originalFile)) {
            return false;
        }
        
        // Initialize 720p transcoded output (Intel QSV)
        std::string lowQualityFile = outputDir + "/720p_" + timestamp + ".mp4";
        if (!initializeLowQualityOutput(lowQualityFile)) {
            return false;
        }
        
        // Initialize 1440p transcoded output (Intel QSV)
        std::string highQualityFile = outputDir + "/1440p_" + timestamp + ".mp4";
        if (!initializeHighQualityOutput(highQualityFile)) {
            return false;
        }
        
        Logger::info("Outputs initialized for segment " + std::to_string(currentSegment));
        return true;
    }
    
    bool initializeOriginalOutput(const std::string& filename) {
        int ret = avformat_alloc_output_context2(&originalFormatCtx, nullptr, "mp4", filename.c_str());
        if (ret < 0) {
            logError("Cannot create original output context", ret);
            return false;
        }
        
        originalVideoStream = avformat_new_stream(originalFormatCtx, nullptr);
        if (!originalVideoStream) {
            Logger::error("Cannot create original video stream");
            return false;
        }
        
        // Copy codec parameters from input
        avcodec_parameters_copy(originalVideoStream->codecpar, 
                               inputFormatCtx->streams[videoStreamIndex]->codecpar);
        
        if (!(originalFormatCtx->oformat->flags & AVFMT_NOFILE)) {
            ret = avio_open(&originalFormatCtx->pb, filename.c_str(), AVIO_FLAG_WRITE);
            if (ret < 0) {
                logError("Cannot open original output file", ret);
                return false;
            }
        }
        
        ret = avformat_write_header(originalFormatCtx, nullptr);
        if (ret < 0) {
            logError("Cannot write original header", ret);
            return false;
        }
        
        Logger::info("Original output: " + filename);
        return true;
    }
    
    bool initializeLowQualityOutput(const std::string& filename) {
        // Try NVIDIA NVENC encoder first, fallback to software
        qsvLowEncoder = avcodec_find_encoder_by_name("h264_nvenc");
        bool useNVENC = (qsvLowEncoder != nullptr);
        
        if (!qsvLowEncoder) {
            Logger::warn("NVENC encoder not available, trying libx264...");
            qsvLowEncoder = avcodec_find_encoder_by_name("libx264");
            if (!qsvLowEncoder) {
                Logger::warn("libx264 not found, using default H264 encoder");
                qsvLowEncoder = avcodec_find_encoder(AV_CODEC_ID_H264);
            }
        }
        
        if (!qsvLowEncoder) {
            Logger::error("H264 encoder not found");
            return false;
        }
        
        qsvLowEncoderCtx = avcodec_alloc_context3(qsvLowEncoder);
        if (!qsvLowEncoderCtx) {
            Logger::error("Cannot allocate 720p encoder context");
            return false;
        }
        
        // 720p encoding parameters
        qsvLowEncoderCtx->width = 1280;
        qsvLowEncoderCtx->height = 720;
        qsvLowEncoderCtx->time_base = {1, 25};
        qsvLowEncoderCtx->framerate = {25, 1};
        qsvLowEncoderCtx->bit_rate = 2000000; // 2 Mbps
        qsvLowEncoderCtx->gop_size = 50;
        qsvLowEncoderCtx->max_b_frames = 0;
        // Use YUV420P for libx264, NV12 for NVENC
        qsvLowEncoderCtx->pix_fmt = useNVENC ? AV_PIX_FMT_NV12 : AV_PIX_FMT_YUV420P;
        
        if (useNVENC) {
            // NVENC specific settings
            av_opt_set(qsvLowEncoderCtx->priv_data, "preset", "p4", 0);
            av_opt_set(qsvLowEncoderCtx->priv_data, "tune", "hq", 0);
            av_opt_set(qsvLowEncoderCtx->priv_data, "gpu", "0", 0);  // Use GPU 0
            av_opt_set(qsvLowEncoderCtx->priv_data, "delay", "0", 0);  // Low latency
        } else {
            // Software encoder settings
            av_opt_set(qsvLowEncoderCtx->priv_data, "preset", "fast", 0);
            av_opt_set(qsvLowEncoderCtx->priv_data, "tune", "zerolatency", 0);
        }
        
        // Try to open encoder, fallback to software if NVENC fails
        if (avcodec_open2(qsvLowEncoderCtx, qsvLowEncoder, nullptr) < 0) {
            if (useNVENC) {
                Logger::warn("NVENC failed to open, falling back to software encoder");
                avcodec_free_context(&qsvLowEncoderCtx);
                
                // Retry with libx264
                qsvLowEncoder = avcodec_find_encoder_by_name("libx264");
                if (!qsvLowEncoder) {
                    qsvLowEncoder = avcodec_find_encoder(AV_CODEC_ID_H264);
                }
                
                qsvLowEncoderCtx = avcodec_alloc_context3(qsvLowEncoder);
                qsvLowEncoderCtx->width = 1280;
                qsvLowEncoderCtx->height = 720;
                qsvLowEncoderCtx->time_base = {1, 25};
                qsvLowEncoderCtx->framerate = {25, 1};
                qsvLowEncoderCtx->bit_rate = 2000000;
                qsvLowEncoderCtx->gop_size = 50;
                qsvLowEncoderCtx->max_b_frames = 0;
                qsvLowEncoderCtx->pix_fmt = AV_PIX_FMT_YUV420P;
                
                av_opt_set(qsvLowEncoderCtx->priv_data, "preset", "fast", 0);
                av_opt_set(qsvLowEncoderCtx->priv_data, "tune", "zerolatency", 0);
                
                if (avcodec_open2(qsvLowEncoderCtx, qsvLowEncoder, nullptr) < 0) {
                    Logger::error("Cannot open 720p encoder (software fallback also failed)");
                    return false;
                }
            } else {
                Logger::error("Cannot open 720p encoder");
                return false;
            }
        }
        
        // Create output format context
        int ret = avformat_alloc_output_context2(&lowQualityFormatCtx, nullptr, "mp4", filename.c_str());
        if (ret < 0) {
            logError("Cannot create 720p output context", ret);
            return false;
        }
        
        lowQualityVideoStream = avformat_new_stream(lowQualityFormatCtx, nullptr);
        if (!lowQualityVideoStream) {
            Logger::error("Cannot create 720p video stream");
            return false;
        }
        
        avcodec_parameters_from_context(lowQualityVideoStream->codecpar, qsvLowEncoderCtx);
        
        if (!(lowQualityFormatCtx->oformat->flags & AVFMT_NOFILE)) {
            ret = avio_open(&lowQualityFormatCtx->pb, filename.c_str(), AVIO_FLAG_WRITE);
            if (ret < 0) {
                logError("Cannot open 720p output file", ret);
                return false;
            }
        }
        
        ret = avformat_write_header(lowQualityFormatCtx, nullptr);
        if (ret < 0) {
            logError("Cannot write 720p header", ret);
            return false;
        }
        
        // Initialize scaler for 720p - use same format as encoder
        AVPixelFormat targetFormat = useNVENC ? AV_PIX_FMT_NV12 : AV_PIX_FMT_YUV420P;
        swsCtxLow = sws_getContext(
            videoDecoderCtx->width, videoDecoderCtx->height, videoDecoderCtx->pix_fmt,
            1280, 720, targetFormat,
            SWS_BICUBIC, nullptr, nullptr, nullptr
        );
        
        if (!swsCtxLow) {
            Logger::error("Failed to create scaler for 720p");
            return false;
        }
        
        Logger::info("720p output: " + filename + " (Encoder: " + 
                    std::string(qsvLowEncoder->name) + ")");
        return true;
    }
    
    bool initializeHighQualityOutput(const std::string& filename) {
        // Try NVIDIA NVENC encoder first, fallback to software
        qsvHighEncoder = avcodec_find_encoder_by_name("h264_nvenc");
        bool useNVENC = (qsvHighEncoder != nullptr);
        
        if (!qsvHighEncoder) {
            Logger::warn("NVENC encoder not available for 1440p, trying libx264...");
            qsvHighEncoder = avcodec_find_encoder_by_name("libx264");
            if (!qsvHighEncoder) {
                Logger::warn("libx264 not found, using default H264 encoder");
                qsvHighEncoder = avcodec_find_encoder(AV_CODEC_ID_H264);
            }
        }
        
        if (!qsvHighEncoder) {
            Logger::error("H264 encoder not found");
            return false;
        }
        
        qsvHighEncoderCtx = avcodec_alloc_context3(qsvHighEncoder);
        if (!qsvHighEncoderCtx) {
            Logger::error("Cannot allocate 1440p encoder context");
            return false;
        }
        
        // 1440p encoding parameters
        qsvHighEncoderCtx->width = 2560;
        qsvHighEncoderCtx->height = 1440;
        qsvHighEncoderCtx->time_base = {1, 25};
        qsvHighEncoderCtx->framerate = {25, 1};
        qsvHighEncoderCtx->bit_rate = 5000000; // 5 Mbps
        qsvHighEncoderCtx->gop_size = 50;
        qsvHighEncoderCtx->max_b_frames = 0;
        // Use YUV420P for libx264, NV12 for NVENC
        qsvHighEncoderCtx->pix_fmt = useNVENC ? AV_PIX_FMT_NV12 : AV_PIX_FMT_YUV420P;
        
        if (useNVENC) {
            // NVENC specific settings
            av_opt_set(qsvHighEncoderCtx->priv_data, "preset", "p4", 0);
            av_opt_set(qsvHighEncoderCtx->priv_data, "tune", "hq", 0);
            av_opt_set(qsvHighEncoderCtx->priv_data, "gpu", "0", 0);  // Use GPU 0
            av_opt_set(qsvHighEncoderCtx->priv_data, "delay", "0", 0);  // Low latency
        } else {
            // Software encoder settings
            av_opt_set(qsvHighEncoderCtx->priv_data, "preset", "medium", 0);
            av_opt_set(qsvHighEncoderCtx->priv_data, "tune", "film", 0);
        }
        
        // Try to open encoder, fallback to software if NVENC fails
        if (avcodec_open2(qsvHighEncoderCtx, qsvHighEncoder, nullptr) < 0) {
            if (useNVENC) {
                Logger::warn("NVENC failed to open for 1440p, falling back to software encoder");
                avcodec_free_context(&qsvHighEncoderCtx);
                
                // Retry with libx264
                qsvHighEncoder = avcodec_find_encoder_by_name("libx264");
                if (!qsvHighEncoder) {
                    qsvHighEncoder = avcodec_find_encoder(AV_CODEC_ID_H264);
                }
                
                qsvHighEncoderCtx = avcodec_alloc_context3(qsvHighEncoder);
                qsvHighEncoderCtx->width = 2560;
                qsvHighEncoderCtx->height = 1440;
                qsvHighEncoderCtx->time_base = {1, 25};
                qsvHighEncoderCtx->framerate = {25, 1};
                qsvHighEncoderCtx->bit_rate = 5000000;
                qsvHighEncoderCtx->gop_size = 50;
                qsvHighEncoderCtx->max_b_frames = 0;
                qsvHighEncoderCtx->pix_fmt = AV_PIX_FMT_YUV420P;
                
                av_opt_set(qsvHighEncoderCtx->priv_data, "preset", "medium", 0);
                av_opt_set(qsvHighEncoderCtx->priv_data, "tune", "film", 0);
                
                if (avcodec_open2(qsvHighEncoderCtx, qsvHighEncoder, nullptr) < 0) {
                    Logger::error("Cannot open 1440p encoder (software fallback also failed)");
                    return false;
                }
            } else {
                Logger::error("Cannot open 1440p encoder");
                return false;
            }
        }
        
        // Create output format context
        int ret = avformat_alloc_output_context2(&highQualityFormatCtx, nullptr, "mp4", filename.c_str());
        if (ret < 0) {
            logError("Cannot create 1440p output context", ret);
            return false;
        }
        
        highQualityVideoStream = avformat_new_stream(highQualityFormatCtx, nullptr);
        if (!highQualityVideoStream) {
            Logger::error("Cannot create 1440p video stream");
            return false;
        }
        
        avcodec_parameters_from_context(highQualityVideoStream->codecpar, qsvHighEncoderCtx);
        
        if (!(highQualityFormatCtx->oformat->flags & AVFMT_NOFILE)) {
            ret = avio_open(&highQualityFormatCtx->pb, filename.c_str(), AVIO_FLAG_WRITE);
            if (ret < 0) {
                logError("Cannot open 1440p output file", ret);
                return false;
            }
        }
        
        ret = avformat_write_header(highQualityFormatCtx, nullptr);
        if (ret < 0) {
            logError("Cannot write 1440p header", ret);
            return false;
        }
        
        // Initialize scaler for 1440p - use same format as encoder
        AVPixelFormat targetFormat = useNVENC ? AV_PIX_FMT_NV12 : AV_PIX_FMT_YUV420P;
        swsCtxHigh = sws_getContext(
            videoDecoderCtx->width, videoDecoderCtx->height, videoDecoderCtx->pix_fmt,
            2560, 1440, targetFormat,
            SWS_BICUBIC, nullptr, nullptr, nullptr
        );
        
        if (!swsCtxHigh) {
            Logger::error("Failed to create scaler for 1440p");
            return false;
        }
        
        Logger::info("1440p output: " + filename + " (Encoder: " + 
                    std::string(qsvHighEncoder->name) + ")");
        return true;
    }
    
    bool processPacket(AVPacket* packet) {
        // Write original packet directly to original output
        AVPacket* originalPkt = av_packet_clone(packet);
        originalPkt->stream_index = 0;
        av_packet_rescale_ts(originalPkt, 
                            inputFormatCtx->streams[videoStreamIndex]->time_base,
                            originalVideoStream->time_base);
        av_interleaved_write_frame(originalFormatCtx, originalPkt);
        av_packet_free(&originalPkt);
        
        // Decode frame for transcoding
        int ret = avcodec_send_packet(videoDecoderCtx, packet);
        if (ret < 0) {
            return false;
        }
        
        AVFrame* frame = av_frame_alloc();
        if (!frame) {
            Logger::error("Failed to allocate frame for decoding");
            return false;
        }
        
        while (ret >= 0) {
            ret = avcodec_receive_frame(videoDecoderCtx, frame);
            if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) {
                break;
            }
            if (ret < 0) {
                av_frame_free(&frame);
                return false;
            }
            
            // Transcode to 720p - only if swsCtxLow is valid
            if (swsCtxLow && qsvLowEncoderCtx) {
                transcodeFrame(frame, qsvLowEncoderCtx, lowQualityFormatCtx, 
                              lowQualityVideoStream, swsCtxLow, 1280, 720);
            }
            
            // Transcode to 1440p - only if swsCtxHigh is valid
            if (swsCtxHigh && qsvHighEncoderCtx) {
                transcodeFrame(frame, qsvHighEncoderCtx, highQualityFormatCtx,
                              highQualityVideoStream, swsCtxHigh, 2560, 1440);
            }
        }
        
        av_frame_free(&frame);
        return true;
    }
    
    void transcodeFrame(AVFrame* frame, AVCodecContext* encoderCtx, 
                       AVFormatContext* formatCtx, AVStream* stream,
                       SwsContext* swsCtx, int width, int height) {
        // NULL safety checks - CRITICAL to prevent segfault
        if (!frame || !encoderCtx || !formatCtx || !stream || !swsCtx) {
            Logger::error("transcodeFrame called with NULL parameter");
            return;
        }
        
        // Scale frame - use encoder's pixel format
        AVFrame* scaledFrame = av_frame_alloc();
        if (!scaledFrame) {
            Logger::error("Failed to allocate scaled frame");
            return;
        }
        
        scaledFrame->format = encoderCtx->pix_fmt;  // Use encoder's format, not hardcoded
        scaledFrame->width = width;
        scaledFrame->height = height;
        
        int ret = av_frame_get_buffer(scaledFrame, 0);
        if (ret < 0) {
            Logger::error("Failed to allocate scaled frame buffer");
            av_frame_free(&scaledFrame);
            return;
        }
        
        ret = sws_scale(swsCtx, frame->data, frame->linesize, 0, frame->height,
                        scaledFrame->data, scaledFrame->linesize);
        if (ret < 0) {
            Logger::error("Failed to scale frame");
            av_frame_free(&scaledFrame);
            return;
        }
        
        scaledFrame->pts = frame->pts;
        
        // Encode scaled frame
        ret = avcodec_send_frame(encoderCtx, scaledFrame);
        av_frame_free(&scaledFrame);
        
        if (ret < 0) {
            char errbuf[AV_ERROR_MAX_STRING_SIZE];
            av_strerror(ret, errbuf, sizeof(errbuf));
            Logger::error("Failed to send frame to encoder: " + std::string(errbuf));
            return;
        }
        
        AVPacket* pkt = av_packet_alloc();
        while (ret >= 0) {
            ret = avcodec_receive_packet(encoderCtx, pkt);
            if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) {
                break;
            }
            if (ret < 0) {
                av_packet_free(&pkt);
                return;
            }
            
            pkt->stream_index = 0;
            av_packet_rescale_ts(pkt, encoderCtx->time_base, stream->time_base);
            av_interleaved_write_frame(formatCtx, pkt);
            av_packet_unref(pkt);
        }
        
        av_packet_free(&pkt);
    }
    
    void closeOutputs() {
        // Free encoder contexts first - CRITICAL to prevent memory leak!
        if (qsvLowEncoderCtx) {
            avcodec_free_context(&qsvLowEncoderCtx);
            qsvLowEncoderCtx = nullptr;
        }
        
        if (qsvHighEncoderCtx) {
            avcodec_free_context(&qsvHighEncoderCtx);
            qsvHighEncoderCtx = nullptr;
        }
        
        if (originalFormatCtx) {
            av_write_trailer(originalFormatCtx);
            if (!(originalFormatCtx->oformat->flags & AVFMT_NOFILE)) {
                avio_closep(&originalFormatCtx->pb);
            }
            avformat_free_context(originalFormatCtx);
            originalFormatCtx = nullptr;
        }
        
        if (lowQualityFormatCtx) {
            av_write_trailer(lowQualityFormatCtx);
            if (!(lowQualityFormatCtx->oformat->flags & AVFMT_NOFILE)) {
                avio_closep(&lowQualityFormatCtx->pb);
            }
            avformat_free_context(lowQualityFormatCtx);
            lowQualityFormatCtx = nullptr;
        }
        
        if (highQualityFormatCtx) {
            av_write_trailer(highQualityFormatCtx);
            if (!(highQualityFormatCtx->oformat->flags & AVFMT_NOFILE)) {
                avio_closep(&highQualityFormatCtx->pb);
            }
            avformat_free_context(highQualityFormatCtx);
            highQualityFormatCtx = nullptr;
        }
    }
    
    bool createDirectory(const std::string& path) {
        // Try to create directory
        if (mkdir(path.c_str(), 0755) == 0) {
            return true;  // Created successfully
        }
        
        if (errno == EEXIST) {
            return true;  // Already exists
        }
        
        if (errno == ENOENT) {
            // Parent doesn't exist, create recursively
            size_t pos = path.find_last_of('/');
            if (pos == std::string::npos) {
                return false;
            }
            
            std::string parent = path.substr(0, pos);
            if (!createDirectory(parent)) {
                return false;
            }
            
            // Try again after creating parent
            return mkdir(path.c_str(), 0755) == 0;
        }
        
        return false;
    }
    
    std::string getTimestamp() {
        time_t now = time(nullptr);
        char buf[32];
        strftime(buf, sizeof(buf), "%Y%m%d_%H%M%S", localtime(&now));
        return std::string(buf) + "_seg" + std::to_string(currentSegment);
    }
    
    void logError(const std::string& msg, int errnum) {
        char errbuf[AV_ERROR_MAX_STRING_SIZE];
        av_strerror(errnum, errbuf, sizeof(errbuf));
        Logger::error(msg + ": " + std::string(errbuf));
    }
};

#endif // FFMPEG_TRANSCODER_HPP
