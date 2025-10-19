-- VMS Database Initialization Script
-- PostgreSQL 15+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- Cameras Table
-- ============================================
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    rtsp_url TEXT NOT NULL,
    username VARCHAR(100),
    password VARCHAR(100),
    location VARCHAR(255),
    description TEXT,
    
    -- Recording settings
    resolution VARCHAR(20) DEFAULT '1080p',
    fps INT DEFAULT 25,
    bitrate INT DEFAULT 4000,
    
    -- Streaming settings
    enable_low_stream BOOLEAN DEFAULT TRUE,
    enable_high_stream BOOLEAN DEFAULT TRUE,
    low_quality VARCHAR(20) DEFAULT '720p',
    high_quality VARCHAR(20) DEFAULT '1440p',
    
    -- Status
    status VARCHAR(50) DEFAULT 'inactive',
    last_seen TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    -- Indexes
    CONSTRAINT unique_camera_name UNIQUE(name)
);

CREATE INDEX idx_cameras_status ON cameras(status);
CREATE INDEX idx_cameras_location ON cameras(location);

-- ============================================
-- Recordings Table
-- ============================================
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    
    -- File information
    filename VARCHAR(255) NOT NULL,
    filepath TEXT NOT NULL,
    file_size BIGINT,
    
    -- Recording metadata
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INT, -- seconds
    
    -- Video properties
    resolution VARCHAR(20),
    fps INT,
    codec VARCHAR(50),
    
    -- Storage tier
    storage_tier VARCHAR(20) DEFAULT 'hot', -- hot, warm, cold
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_recording UNIQUE(camera_id, start_time)
);

CREATE INDEX idx_recordings_camera ON recordings(camera_id);
CREATE INDEX idx_recordings_time ON recordings(start_time, end_time);
CREATE INDEX idx_recordings_tier ON recordings(storage_tier);

-- ============================================
-- Live Streams Table
-- ============================================
CREATE TABLE live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    
    -- Stream info
    stream_key VARCHAR(100) NOT NULL,
    quality VARCHAR(20) NOT NULL, -- 720p, 1440p
    stream_url TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'starting',
    viewer_count INT DEFAULT 0,
    
    -- Performance
    bitrate INT,
    fps INT,
    latency_ms INT,
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_stream UNIQUE(camera_id, quality)
);

CREATE INDEX idx_streams_camera ON live_streams(camera_id);
CREATE INDEX idx_streams_status ON live_streams(status);

-- ============================================
-- Events Table (for AI/Analytics)
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,
    
    -- Event info
    event_type VARCHAR(50) NOT NULL, -- motion, lpr, vehicle, person, alert
    event_data JSONB,
    
    -- Detection confidence
    confidence FLOAT,
    
    -- Spatial info
    bounding_box JSONB, -- {x, y, width, height}
    
    -- Timestamps
    event_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    processed BOOLEAN DEFAULT FALSE,
    acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_events_camera ON events(camera_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_time ON events(event_time);
CREATE INDEX idx_events_data ON events USING GIN(event_data);

-- ============================================
-- Users Table (for Phase 2)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- Profile
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer', -- admin, operator, viewer
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_username UNIQUE(username),
    CONSTRAINT unique_email UNIQUE(email)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- System Metrics Table
-- ============================================
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metrics
    metric_type VARCHAR(50) NOT NULL, -- cpu, memory, disk, network, recording
    metric_value FLOAT NOT NULL,
    metric_unit VARCHAR(20),
    
    -- Context
    node_id VARCHAR(100),
    camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE,
    
    -- Timestamp
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_metrics_time ON system_metrics(recorded_at);
CREATE INDEX idx_metrics_camera ON system_metrics(camera_id);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cameras_updated_at
    BEFORE UPDATE ON cameras
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Calculate recording duration
CREATE OR REPLACE FUNCTION calculate_recording_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL THEN
        NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_duration
    BEFORE INSERT OR UPDATE ON recordings
    FOR EACH ROW
    EXECUTE FUNCTION calculate_recording_duration();

-- ============================================
-- Initial Data (Development)
-- ============================================

-- Create default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
    ('admin', 'admin@vms.local', '$2b$10$8K1p/a0dL3LzJ8bO9rnPIOF.vJxGJZq3KQ9zKGrP5AqJ5L3XqXYKm', 'System Administrator', 'admin');

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vms_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'VMS Database initialized successfully!';
    RAISE NOTICE 'Default admin user: admin / admin123';
END $$;
