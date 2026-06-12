-- Fix pipeline_items table by adding missing blocked columns
-- Run this in your Supabase SQL editor

-- Add the missing blocked columns to pipeline_items table
ALTER TABLE pipeline_items 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS block_reason TEXT,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_pipeline_items_is_blocked ON pipeline_items(is_blocked);

-- Add comments for the new columns
COMMENT ON COLUMN pipeline_items.is_blocked IS 'Whether the lead is blocked (do not contact again)';
COMMENT ON COLUMN pipeline_items.block_reason IS 'Reason for blocking the lead';
COMMENT ON COLUMN pipeline_items.archived_at IS 'Timestamp when the item was archived';
