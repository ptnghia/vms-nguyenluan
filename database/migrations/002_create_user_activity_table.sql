-- Migration: Create user_activity table for logging user actions
-- Date: 2025-10-20
-- Description: Track all user actions for audit and security purposes

-- ============================================
-- User Activity Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity details
    action VARCHAR(100) NOT NULL, -- login, logout, create_camera, delete_recording, etc.
    resource_type VARCHAR(50), -- camera, recording, user, system
    resource_id UUID, -- ID of the affected resource
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    
    -- Additional data (JSON for flexibility)
    metadata JSONB,
    
    -- Result
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id 
ON user_activity(user_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at 
ON user_activity(created_at DESC);

-- Index for action filtering
CREATE INDEX IF NOT EXISTS idx_user_activity_action 
ON user_activity(action);

-- Composite index for common query pattern (user + time)
CREATE INDEX IF NOT EXISTS idx_user_activity_user_time 
ON user_activity(user_id, created_at DESC);

-- Index for resource lookup
CREATE INDEX IF NOT EXISTS idx_user_activity_resource 
ON user_activity(resource_type, resource_id);

-- GIN index for metadata search
CREATE INDEX IF NOT EXISTS idx_user_activity_metadata 
ON user_activity USING GIN(metadata);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE user_activity IS 'Logs all user actions for audit and security';
COMMENT ON COLUMN user_activity.action IS 'Type of action performed (login, create_camera, etc.)';
COMMENT ON COLUMN user_activity.resource_type IS 'Type of resource affected (camera, recording, user, system)';
COMMENT ON COLUMN user_activity.resource_id IS 'UUID of the affected resource';
COMMENT ON COLUMN user_activity.metadata IS 'Additional data in JSON format';
COMMENT ON COLUMN user_activity.success IS 'Whether the action was successful';

-- ============================================
-- Sample Data (for testing)
-- ============================================
-- Uncomment to insert sample activity logs
-- INSERT INTO user_activity (user_id, action, resource_type, success, metadata)
-- SELECT 
--     id,
--     'login',
--     'auth',
--     TRUE,
--     '{"ip": "127.0.0.1", "browser": "Chrome"}'::jsonb
-- FROM users
-- WHERE username = 'admin'
-- LIMIT 1;

