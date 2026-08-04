-- Add blocked columns to existing clients table
-- Run this in your Supabase SQL editor

-- Add the blocked columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS block_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;

-- Add comments for the new columns
COMMENT ON COLUMN clients.is_blocked IS 'Whether the client is blocked (do not contact again)';
COMMENT ON COLUMN clients.block_reason IS 'Reason for blocking the client';
COMMENT ON COLUMN clients.blocked_at IS 'Timestamp when the client was blocked';
