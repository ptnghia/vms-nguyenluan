# ============================================================
# Stage 1: Build FFmpeg with Intel QuickSync support
# ============================================================
FROM ubuntu:22.04 AS ffmpeg-builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    pkg-config \
    yasm \
    nasm \
    libva-dev \
    libdrm-dev \
    intel-media-va-driver-non-free \
    && rm -rf /var/lib/apt/lists/*

# Build FFmpeg with QSV support
WORKDIR /tmp
RUN git clone --depth 1 --branch n6.1 https://github.com/FFmpeg/FFmpeg.git && \
    cd FFmpeg && \
    ./configure \
        --prefix=/usr/local \
        --enable-gpl \
        --enable-nonfree \
        --enable-libx264 \
        --enable-libx265 \
        --enable-vaapi \
        --enable-libdrm \
    && make -j$(nproc) && make install

# ============================================================
# Stage 2: Build C++ Recording Engine
# ============================================================
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libpq-dev \
    libhiredis-dev \
    nlohmann-json3-dev \
    libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy FFmpeg from previous stage
COPY --from=ffmpeg-builder /usr/local /usr/local

# Set working directory
WORKDIR /app

# Copy source code
COPY src/ ./src/
COPY CMakeLists.txt ./

# Build the application
RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

# ============================================================
# Stage 3: Runtime Environment
# ============================================================
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libhiredis0.14 \
    libva2 \
    libva-drm2 \
    libdrm2 \
    intel-media-va-driver-non-free \
    vainfo \
    && rm -rf /var/lib/apt/lists/*

# Copy FFmpeg and recorder binary
COPY --from=ffmpeg-builder /usr/local /usr/local
COPY --from=builder /app/build/vms-recorder /usr/local/bin/

# Create runtime user
RUN useradd -m -u 1000 vms && \
    mkdir -p /data/recordings /var/log/vms && \
    chown -R vms:vms /data /var/log/vms

USER vms
WORKDIR /app

# Verify QSV support
RUN /usr/bin/vainfo || echo "Warning: QSV not available (normal in build without /dev/dri)"

CMD ["/usr/local/bin/vms-recorder"]
