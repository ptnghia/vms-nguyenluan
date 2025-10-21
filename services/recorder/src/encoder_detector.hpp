#ifndef ENCODER_DETECTOR_HPP
#define ENCODER_DETECTOR_HPP

#include <string>

/**
 * Encoder types
 *
 * PHASE 5: Encoder selection is now handled by GPUSelector
 * This enum is kept for type safety and logging only
 */
enum EncoderType {
    ENCODER_VAAPI,    // Intel VAAPI (H.264, ~28-32% CPU per camera)
    ENCODER_NVENC,    // NVIDIA NVENC (H.264/H.265, ~18% CPU per camera with NVDEC)
    ENCODER_SOFTWARE  // Software x264 (fallback, not used)
};

/**
 * EncoderDetector - Encoder name mapping
 *
 * PHASE 5 SIMPLIFIED: Removed auto-detection logic
 * Encoder selection is now handled by GPUSelector based on camera count
 * This class only provides encoder name mapping for logging
 */
class EncoderDetector {
public:
    /**
     * Get encoder name for logging
     */
    static std::string getEncoderName(EncoderType type) {
        switch (type) {
            case ENCODER_VAAPI:
                return "Intel VAAPI (H.264)";
            case ENCODER_NVENC:
                return "NVIDIA NVENC (H.264/H.265)";
            case ENCODER_SOFTWARE:
                return "Software (x264)";
            default:
                return "Unknown";
        }
    }
};

#endif // ENCODER_DETECTOR_HPP

