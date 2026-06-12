-- Update tasks table schema
-- Change is_timed to is_scheduled and remove actual_duration

-- First, drop the existing column
ALTER TABLE tasks DROP COLUMN IF EXISTS actual_duration;

-- Rename is_timed to is_scheduled
ALTER TABLE tasks RENAME COLUMN is_timed TO is_scheduled;

-- Update the check constraint for is_scheduled (it's a boolean, so no constraint change needed)
-- But we need to update any existing data if needed
UPDATE tasks SET is_scheduled = is_scheduled WHERE is_scheduled IS NOT NULL;

-- Update the trigger function to use the new column name
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
