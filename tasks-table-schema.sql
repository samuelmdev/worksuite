-- Tasks table for CRM task management
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('call', 'meeting', 'email', 'follow_up', 'proposal', 'contract_review', 'other')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMP WITH TIME ZONE,
    is_scheduled BOOLEAN DEFAULT FALSE,
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- RLS policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own tasks and tasks assigned to them
CREATE POLICY "Users can view their own tasks and assigned tasks" ON tasks
    FOR SELECT USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = tasks.client_id 
            AND clients.created_by = auth.uid()
        )
    );

-- Policy for users to insert tasks
CREATE POLICY "Users can create tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy for users to update their own tasks and assigned tasks
CREATE POLICY "Users can update their own tasks and assigned tasks" ON tasks
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = tasks.client_id 
            AND clients.created_by = auth.uid()
        )
    );

-- Policy for users to delete their own tasks
CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = created_by);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- Function to log task activities
CREATE OR REPLACE FUNCTION log_tasks_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_description TEXT;
    client_name TEXT;
BEGIN
    -- Get client name if task is linked to a client
    IF NEW.client_id IS NOT NULL THEN
        SELECT name INTO client_name FROM clients WHERE id = NEW.client_id;
    END IF;

    -- Determine activity description based on operation
    IF TG_OP = 'INSERT' THEN
        activity_description := 'Created task: ' || NEW.title;
        IF client_name IS NOT NULL THEN
            activity_description := activity_description || ' for client ' || client_name;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            activity_description := 'Updated task status: ' || NEW.title || ' (' || OLD.status || ' → ' || NEW.status || ')';
            IF client_name IS NOT NULL THEN
                activity_description := activity_description || ' for client ' || client_name;
            END IF;
        ELSIF OLD.title != NEW.title THEN
            activity_description := 'Updated task: ' || OLD.title || ' → ' || NEW.title;
            IF client_name IS NOT NULL THEN
                activity_description := activity_description || ' for client ' || client_name;
            END IF;
        ELSE
            activity_description := 'Updated task: ' || NEW.title;
            IF client_name IS NOT NULL THEN
                activity_description := activity_description || ' for client ' || client_name;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        activity_description := 'Deleted task: ' || OLD.title;
        IF client_name IS NOT NULL THEN
            activity_description := activity_description || ' for client ' || client_name;
        END IF;
    END IF;

    -- Insert activity log
    INSERT INTO activity_logs (
        user_id,
        activity_type,
        module,
        description,
        metadata,
        created_at
    ) VALUES (
        COALESCE(NEW.created_by, OLD.created_by, auth.uid()),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'create'
            WHEN TG_OP = 'UPDATE' THEN 'update'
            WHEN TG_OP = 'DELETE' THEN 'delete'
        END,
        'crm',
        activity_description,
        jsonb_build_object(
            'task_id', COALESCE(NEW.id, OLD.id),
            'client_id', COALESCE(NEW.client_id, OLD.client_id),
            'task_type', COALESCE(NEW.task_type, OLD.task_type),
            'status', COALESCE(NEW.status, OLD.status)
        ),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Log warning but don't fail the main transaction
    RAISE WARNING 'Failed to log task activity: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for task activities
CREATE TRIGGER log_tasks_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_tasks_activity();
