-- Migration: Update recordings table schema
-- Date: 2025-10-20
-- Description: Ensure all columns exist and add full-text search support

-- Enable pg_trgm extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add duration column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recordings' AND column_name='duration') THEN
        ALTER TABLE recordings ADD COLUMN duration INT;
        COMMENT ON COLUMN recordings.duration IS 'Video duration in seconds';
    END IF;

    -- Add resolution column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recordings' AND column_name='resolution') THEN
        ALTER TABLE recordings ADD COLUMN resolution VARCHAR(20);
        COMMENT ON COLUMN recordings.resolution IS 'Video resolution (e.g., 1920x1080)';
    END IF;

    -- Add fps column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recordings' AND column_name='fps') THEN
        ALTER TABLE recordings ADD COLUMN fps INT;
        COMMENT ON COLUMN recordings.fps IS 'Frames per second';
    END IF;

    -- Add codec column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recordings' AND column_name='codec') THEN
        ALTER TABLE recordings ADD COLUMN codec VARCHAR(50);
        COMMENT ON COLUMN recordings.codec IS 'Video codec (e.g., h264, hevc)';
    END IF;

    -- Add bitrate column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recordings' AND column_name='bitrate') THEN
        ALTER TABLE recordings ADD COLUMN bitrate BIGINT;
        COMMENT ON COLUMN recordings.bitrate IS 'Video bitrate in bits per second';
    END IF;

    -- Add storage_tier column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recordings' AND column_name='storage_tier') THEN
        ALTER TABLE recordings ADD COLUMN storage_tier VARCHAR(20) DEFAULT 'hot';
        COMMENT ON COLUMN recordings.storage_tier IS 'Storage tier: hot, warm, cold';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_recordings_camera ON recordings(camera_id);
CREATE INDEX IF NOT EXISTS idx_recordings_time ON recordings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_recordings_tier ON recordings(storage_tier);

-- Add GIN index for full-text search on filename
CREATE INDEX IF NOT EXISTS idx_recordings_filename_trgm 
ON recordings USING GIN(filename gin_trgm_ops);

-- Add composite index for common query pattern (camera + time)
CREATE INDEX IF NOT EXISTS idx_recordings_camera_time 
ON recordings(camera_id, start_time DESC);

-- Add partial index for hot storage (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_recordings_hot 
ON recordings(start_time DESC) 
WHERE storage_tier = 'hot';

-- Update table comment
COMMENT ON TABLE recordings IS 'Video recordings metadata with full-text search support';

-- Print success message
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed successfully: recordings table schema updated';
END $$;

