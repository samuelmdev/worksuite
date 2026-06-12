-- Migration: Rename blacklist columns to blocked
-- Run this query to update existing database

-- Update clients table
ALTER TABLE clients RENAME COLUMN is_blacklisted TO is_blocked;
ALTER TABLE clients RENAME COLUMN blacklist_reason TO block_reason;
ALTER TABLE clients RENAME COLUMN blacklisted_at TO blocked_at;

-- Update pipeline_items table (if it exists)
-- Note: This will only work if the pipeline_items table has been created
-- If you get an error, the table doesn't exist yet and you can skip this part
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_items') THEN
        ALTER TABLE pipeline_items RENAME COLUMN is_blacklisted TO is_blocked;
        ALTER TABLE pipeline_items RENAME COLUMN blacklist_reason TO block_reason;
    END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_pipeline_items_is_blacklisted;
CREATE INDEX IF NOT EXISTS idx_pipeline_items_is_blocked ON pipeline_items(is_blocked);

-- Add comments
COMMENT ON COLUMN clients.is_blocked IS 'Whether the client is blocked (do not contact again)';
COMMENT ON COLUMN clients.block_reason IS 'Reason for blocking the client';
COMMENT ON COLUMN clients.blocked_at IS 'Timestamp when the client was blocked';

-- Update any existing data (optional - only if you have existing blacklisted data)
-- UPDATE clients SET is_blocked = true WHERE is_blocked = false AND block_reason IS NOT NULL;
