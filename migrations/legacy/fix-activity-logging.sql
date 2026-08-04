-- Fix for activity logging RLS issue
-- The problem is that triggers run in the user's context, not system context
-- This creates a more robust activity logging function that handles RLS properly

-- Drop existing triggers first
DROP TRIGGER IF EXISTS clients_activity_trigger ON clients;
DROP TRIGGER IF EXISTS time_entries_activity_trigger ON time_entries;
DROP TRIGGER IF EXISTS projects_activity_trigger ON projects;

-- Create a more robust activity logging function that handles RLS
CREATE OR REPLACE FUNCTION log_crm_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_title VARCHAR(255);
  activity_description TEXT;
BEGIN
  -- Determine action and create activity details
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Client created';
    activity_description := 'New client "' || NEW.name || '" was added';
    
    -- Use a more permissive approach for activity logging
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values)
      VALUES (NEW.created_by, 'crm', 'client', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW));
    EXCEPTION WHEN OTHERS THEN
      -- If activity logging fails, don't fail the main operation
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
    
  ELSIF TG_OP = 'UPDATE' THEN
    activity_title := 'Client updated';
    activity_description := 'Client "' || NEW.name || '" information was updated';
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
      VALUES (NEW.updated_by, 'crm', 'client', NEW.id, 'updated', activity_title, activity_description, row_to_json(OLD), row_to_json(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Client deleted';
    activity_description := 'Client "' || OLD.name || '" was removed';
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values)
      VALUES (OLD.updated_by, 'crm', 'client', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a more robust time tracking activity function
CREATE OR REPLACE FUNCTION log_time_tracking_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_title VARCHAR(255);
  activity_description TEXT;
  client_name VARCHAR(255);
  project_name VARCHAR(255);
BEGIN
  -- Get client and project names for better descriptions
  SELECT c.name INTO client_name FROM clients c WHERE c.id = COALESCE(NEW.client_id, OLD.client_id);
  SELECT p.name INTO project_name FROM projects p WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);
  
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Time entry created';
    activity_description := 'Time entry created for "' || COALESCE(client_name, 'Unknown Client') || '"' || 
                          CASE WHEN project_name IS NOT NULL THEN ' - ' || project_name ELSE '' END;
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values)
      VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if status changed
    IF OLD.status != NEW.status THEN
      activity_title := 'Time entry ' || NEW.status;
      activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was ' || NEW.status;
      
      BEGIN
        INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
        VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, NEW.status::action_enum, activity_title, activity_description, 
                row_to_json(OLD), row_to_json(NEW));
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to log activity: %', SQLERRM;
      END;
    ELSE
      activity_title := 'Time entry updated';
      activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was updated';
      
      BEGIN
        INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
        VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, 'updated', activity_title, activity_description, 
                row_to_json(OLD), row_to_json(NEW));
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to log activity: %', SQLERRM;
      END;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Time entry deleted';
    activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was deleted';
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values)
      VALUES (OLD.user_id, 'time_tracking', 'time_entry', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a more robust projects activity function
CREATE OR REPLACE FUNCTION log_projects_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_title VARCHAR(255);
  activity_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Project created';
    activity_description := 'New project "' || NEW.name || '" was created';
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values)
      VALUES (NEW.created_by, 'projects', 'project', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for specific status changes
    IF OLD.status != NEW.status THEN
      activity_title := 'Project ' || NEW.status;
      activity_description := 'Project "' || NEW.name || '" status changed to ' || NEW.status;
    ELSE
      activity_title := 'Project updated';
      activity_description := 'Project "' || NEW.name || '" was updated';
    END IF;
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
      VALUES (NEW.updated_by, 'projects', 'project', NEW.id, 'updated', activity_title, activity_description, 
              row_to_json(OLD), row_to_json(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Project deleted';
    activity_description := 'Project "' || OLD.name || '" was deleted';
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values)
      VALUES (OLD.updated_by, 'projects', 'project', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers
CREATE TRIGGER clients_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_crm_activity();

CREATE TRIGGER time_entries_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION log_time_tracking_activity();

CREATE TRIGGER projects_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_projects_activity();
