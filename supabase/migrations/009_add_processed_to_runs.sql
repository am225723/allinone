-- Add processed column to runs table
-- This fixes external edge function queries for runs.processed
ALTER TABLE runs ADD COLUMN IF NOT EXISTS processed INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_runs_processed ON runs(processed);
CREATE INDEX IF NOT EXISTS idx_runs_processed_created_at ON runs(processed, created_at);

-- Add comment
COMMENT ON COLUMN runs.processed IS 'Number of items processed in this run (used by external monitoring/edge functions)';