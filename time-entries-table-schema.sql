-- Time entries table schema
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    description TEXT NOT NULL,
    hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
    date DATE NOT NULL,
    billable BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client_id ON time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date);

-- Add RLS (Row Level Security) policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view time entries in their organization
CREATE POLICY "Users can view time entries in their organization" ON time_entries
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Policy: Users can insert their own time entries
CREATE POLICY "Users can insert their own time entries" ON time_entries
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        client_id IN (
            SELECT id FROM clients WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Policy: Users can update their own time entries
CREATE POLICY "Users can update their own time entries" ON time_entries
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- Policy: Users can delete their own time entries
CREATE POLICY "Users can delete their own time entries" ON time_entries
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Policy: Admin/Manager can manage all time entries in their organization
CREATE POLICY "Admin/Manager can manage all time entries" ON time_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND organization_id IN (
                SELECT organization_id FROM users WHERE id = time_entries.user_id
            )
            AND role IN ('admin', 'manager')
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_time_entries_updated_at();

-- Add comments for documentation
COMMENT ON TABLE time_entries IS 'Stores time tracking entries for users';
COMMENT ON COLUMN time_entries.user_id IS 'The user who logged the time entry';
COMMENT ON COLUMN time_entries.client_id IS 'The client the work was performed for';
COMMENT ON COLUMN time_entries.project_name IS 'Name of the project or task';
COMMENT ON COLUMN time_entries.description IS 'Description of the work performed';
COMMENT ON COLUMN time_entries.hours IS 'Number of hours worked (decimal up to 2 places)';
COMMENT ON COLUMN time_entries.date IS 'Date when the work was performed';
COMMENT ON COLUMN time_entries.billable IS 'Whether this time is billable to the client';
COMMENT ON COLUMN time_entries.status IS 'Approval status: pending, approved, or rejected';
COMMENT ON COLUMN time_entries.notes IS 'Additional notes or rejection reason';
