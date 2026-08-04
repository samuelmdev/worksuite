-- Add updated_by field to projects table
-- This field is required by the activity logging triggers

ALTER TABLE projects 
ADD COLUMN updated_by UUID REFERENCES users(id);

-- Update the trigger to handle cases where updated_by might be null
-- We'll modify the existing trigger to use created_by as fallback

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS projects_activity_log_trigger ON projects;

-- Recreate the trigger with better null handling
CREATE OR REPLACE FUNCTION projects_activity_log_function()
RETURNS TRIGGER AS $$
DECLARE
  activity_title TEXT;
  activity_description TEXT;
  user_id_for_log UUID;
BEGIN
  -- Determine which user_id to use for logging
  user_id_for_log := COALESCE(NEW.updated_by, NEW.created_by);
  
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Project created';
    activity_description := 'Project "' || NEW.name || '" was created';
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values, organization_id)
    VALUES (user_id_for_log, 'projects', 'project', NEW.id, 'created', activity_title, activity_description, 
            row_to_json(NEW), NEW.organization_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    activity_title := 'Project updated';
    activity_description := 'Project "' || NEW.name || '" was updated';
    
    -- Always log updates (removing the comparison to avoid JSON comparison issues)
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values, organization_id)
    VALUES (user_id_for_log, 'projects', 'project', NEW.id, 'updated', activity_title, activity_description, 
            row_to_json(OLD), row_to_json(NEW), NEW.organization_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Project deleted';
    activity_description := 'Project "' || OLD.name || '" was deleted';
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, organization_id)
    VALUES (COALESCE(OLD.updated_by, OLD.created_by), 'projects', 'project', OLD.id, 'deleted', activity_title, activity_description, 
            row_to_json(OLD), OLD.organization_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER projects_activity_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION projects_activity_log_function();

-- Update existing projects to set updated_by to created_by for consistency
UPDATE projects 
SET updated_by = created_by 
WHERE updated_by IS NULL;
