cmake_minimum_required(VERSION 3.15)
project(vms-recorder VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Find required packages
find_package(PkgConfig REQUIRED)

pkg_check_modules(LIBAV REQUIRED
    libavformat
    libavcodec
    libavutil
    libswscale
    libavfilter
)

pkg_check_modules(LIBPQ REQUIRED libpq)

find_library(HIREDIS_LIB hiredis)
if(NOT HIREDIS_LIB)
    message(FATAL_ERROR "hiredis library not found")
endif()

# Find CURL for MediaMTX health checks
find_package(CURL REQUIRED)

# Include directories
include_directories(
    ${LIBAV_INCLUDE_DIRS}
    ${LIBPQ_INCLUDE_DIRS}
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    /usr/include/mfx
)

# Link directories
link_directories(
    ${LIBAV_LIBRARY_DIRS}
    ${LIBPQ_LIBRARY_DIRS}
)

# Source files
set(SOURCES
    src/main.cpp
)

# Executable
add_executable(vms-recorder ${SOURCES})

# Link libraries
target_link_libraries(vms-recorder
    ${LIBAV_LIBRARIES}
    ${LIBPQ_LIBRARIES}
    ${HIREDIS_LIB}
    CURL::libcurl
    pthread
)

# Compiler flags
target_compile_options(vms-recorder PRIVATE
    -Wall
    -Wextra
    -O2
)

message(STATUS "VMS Recorder - Phase 1 MVP")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "FFmpeg libraries: ${LIBAV_LIBRARIES}")
message(STATUS "PostgreSQL libraries: ${LIBPQ_LIBRARIES}")

# Install
install(TARGETS vms-recorder DESTINATION bin)
