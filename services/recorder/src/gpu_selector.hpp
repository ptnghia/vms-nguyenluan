#ifndef GPU_SELECTOR_HPP
#define GPU_SELECTOR_HPP

#include <string>
#include "logger.hpp"

/**
 * GPUSelector - Automatic GPU selection for hybrid system
 * 
 * Strategy:
 * - Cameras 1-6: NVIDIA GPU (NVENC) - Highest quality, lowest CPU
 * - Cameras 7+: Intel GPU (VAAPI) - Good quality, moderate CPU
 * 
 * NVENC Capacity: ~6 cameras with dual outputs (12 streams)
 * VAAPI Capacity: ~6 cameras with dual outputs
 * Total: 12 cameras
 */

enum class GPUType {
    NVIDIA_NVENC,  // NVIDIA RTX 3050 - Priority 1
    INTEL_VAAPI,   // Intel UHD 770 - Priority 2
    AUTO           // Auto-select based on camera index
};

class GPUSelector {
private:
    static int nvencCameraCount;
    static int vaapiCameraCount;
    static const int MAX_NVENC_CAMERAS = 6;  // NVENC limit: 12 streams (6 cameras × 2 outputs)
    
public:
    /**
     * Select GPU for a camera based on current load
     * 
     * Priority:
     * 1. NVIDIA NVENC (cameras 1-6)
     * 2. Intel VAAPI (cameras 7+)
     * 
     * @return GPUType to use for this camera
     */
    static GPUType selectGPU() {
        if (nvencCameraCount < MAX_NVENC_CAMERAS) {
            nvencCameraCount++;
            Logger::info("GPU Selector: Assigned NVIDIA NVENC (camera " + 
                        std::to_string(nvencCameraCount) + "/" + 
                        std::to_string(MAX_NVENC_CAMERAS) + ")");
            return GPUType::NVIDIA_NVENC;
        } else {
            vaapiCameraCount++;
            Logger::info("GPU Selector: Assigned Intel VAAPI (camera " + 
                        std::to_string(vaapiCameraCount) + ")");
            return GPUType::INTEL_VAAPI;
        }
    }
    
    /**
     * Release GPU allocation when camera stops
     */
    static void releaseGPU(GPUType type) {
        if (type == GPUType::NVIDIA_NVENC) {
            if (nvencCameraCount > 0) {
                nvencCameraCount--;
                Logger::info("GPU Selector: Released NVIDIA NVENC (remaining: " + 
                            std::to_string(nvencCameraCount) + ")");
            }
        } else if (type == GPUType::INTEL_VAAPI) {
            if (vaapiCameraCount > 0) {
                vaapiCameraCount--;
                Logger::info("GPU Selector: Released Intel VAAPI (remaining: " + 
                            std::to_string(vaapiCameraCount) + ")");
            }
        }
    }
    
    /**
     * Get current GPU allocation status
     */
    static std::string getStatus() {
        return "NVIDIA NVENC: " + std::to_string(nvencCameraCount) + "/" + 
               std::to_string(MAX_NVENC_CAMERAS) + 
               ", Intel VAAPI: " + std::to_string(vaapiCameraCount);
    }
    
    /**
     * Get GPU type name
     */
    static std::string getGPUTypeName(GPUType type) {
        switch (type) {
            case GPUType::NVIDIA_NVENC:
                return "NVIDIA NVENC";
            case GPUType::INTEL_VAAPI:
                return "Intel VAAPI";
            case GPUType::AUTO:
                return "Auto";
            default:
                return "Unknown";
        }
    }
    
    /**
     * Check if NVENC is available
     */
    static bool isNVENCAvailable() {
        return nvencCameraCount < MAX_NVENC_CAMERAS;
    }
    
    /**
     * Get recommended GPU for new camera
     */
    static GPUType getRecommendedGPU() {
        if (nvencCameraCount < MAX_NVENC_CAMERAS) {
            return GPUType::NVIDIA_NVENC;
        } else {
            return GPUType::INTEL_VAAPI;
        }
    }
    
    /**
     * Reset counters (for testing)
     */
    static void reset() {
        nvencCameraCount = 0;
        vaapiCameraCount = 0;
        Logger::info("GPU Selector: Reset counters");
    }
};

// Initialize static members
int GPUSelector::nvencCameraCount = 0;
int GPUSelector::vaapiCameraCount = 0;

#endif // GPU_SELECTOR_HPP

