-- Fix only the activity logging trigger functions to include organization_id
-- This assumes the tables already have organization_id columns added

-- =====================================================
-- UPDATE ACTIVITY LOGGING FUNCTIONS (SAFE VERSION)
-- =====================================================

-- Update the CRM activity logging function to include organization_id
-- Only if the function exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'log_crm_activity') THEN
        RAISE NOTICE 'Updating log_crm_activity function';
        
        CREATE OR REPLACE FUNCTION log_crm_activity()
        RETURNS TRIGGER AS $func$
        DECLARE
          activity_title VARCHAR(255);
          activity_description TEXT;
        BEGIN
          -- Determine action and create activity details
          IF TG_OP = 'INSERT' THEN
            activity_title := 'Client created';
            activity_description := 'New client "' || NEW.name || '" was added';
            INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values, organization_id)
            VALUES (NEW.created_by, 'crm', 'client', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW), NEW.organization_id);
            RETURN NEW;
          ELSIF TG_OP = 'UPDATE' THEN
            activity_title := 'Client updated';
            activity_description := 'Client "' || NEW.name || '" information was updated';
            INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values, organization_id)
            VALUES (NEW.updated_by, 'crm', 'client', NEW.id, 'updated', activity_title, activity_description, row_to_json(OLD), row_to_json(NEW), NEW.organization_id);
            RETURN NEW;
          ELSIF TG_OP = 'DELETE' THEN
            activity_title := 'Client deleted';
            activity_description := 'Client "' || OLD.name || '" was removed';
            INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, organization_id)
            VALUES (OLD.updated_by, 'crm', 'client', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD), OLD.organization_id);
            RETURN OLD;
          END IF;
          RETURN NULL;
        END;
        $func$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'log_crm_activity function updated';
    ELSE
        RAISE NOTICE 'log_crm_activity function does not exist - skipping';
    END IF;
END $$;

-- Update the time tracking activity logging function
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'log_time_tracking_activity') THEN
        RAISE NOTICE 'Updating log_time_tracking_activity function';
        
        CREATE OR REPLACE FUNCTION log_time_tracking_activity()
        RETURNS TRIGGER AS $func$
        DECLARE
          client_name TEXT;
          activity_title VARCHAR(255);
          activity_description TEXT;
        BEGIN
          -- Get client name for description
          SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;
          
          IF TG_OP = 'INSERT' THEN
            activity_title := 'Time entry created';
            activity_description := 'Time entry created for "' || COALESCE(client_name, 'Unknown Client') || '"' || 
                                  CASE WHEN NEW.project_name IS NOT NULL THEN ' - Project: ' || NEW.project_name ELSE '' END;
            INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values, organization_id)
            VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW), NEW.organization_id);
            RETURN NEW;
          ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status != NEW.status THEN
              activity_title := 'Time entry ' || NEW.status;
              activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was ' || NEW.status;
              INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values, organization_id)
              VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, NEW.status::action_enum, activity_title, activity_description, 
                      row_to_json(OLD), row_to_json(NEW), NEW.organization_id);
            ELSE
              activity_title := 'Time entry updated';
              activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was updated';
              INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values, organization_id)
              VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, 'updated', activity_title, activity_description, 
                      row_to_json(OLD), row_to_json(NEW), NEW.organization_id);
            END IF;
            RETURN NEW;
          ELSIF TG_OP = 'DELETE' THEN
            activity_title := 'Time entry deleted';
            activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was deleted';
            INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, organization_id)
            VALUES (OLD.user_id, 'time_tracking', 'time_entry', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD), OLD.organization_id);
            RETURN OLD;
          END IF;
          RETURN NULL;
        END;
        $func$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'log_time_tracking_activity function updated';
    ELSE
        RAISE NOTICE 'log_time_tracking_activity function does not exist - skipping';
    END IF;
END $$;

-- Update the projects activity logging function
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'log_projects_activity') THEN
        RAISE NOTICE 'Updating log_projects_activity function';
        
        CREATE OR REPLACE FUNCTION log_projects_activity()
        RETURNS TRIGGER AS $func$
        DECLARE
          activity_title VARCHAR(255);
          activity_description TEXT;
        BEGIN
          IF TG_OP = 'INSERT' THEN
            activity_title := 'Project created';
            activity_description := 'New project "' || NEW.name || '" was created';
            INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values, organization_id)
            VALUES (NEW.created_by, 'projects', 'project', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW), NEW.organization_id);
            RETURN NEW;
          ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status != NEW.status THEN
              activity_title := 'Project ' || NEW.status;
              activity_description := 'Project "' || NEW.name || '" status changed to ' || NEW.status;
            ELSE
              activity_title := 'Project updated';
              activity_description := 'Project "' || NEW.name || '" was updated';
            END IF;
            INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values, organization_id)
            VALUES (NEW.updated_by, 'projects', 'project', NEW.id, 'updated', activity_title, activity_description, 
                    row_to_json(OLD), row_to_json(NEW), NEW.organization_id);
            RETURN NEW;
          ELSIF TG_OP = 'DELETE' THEN
            activity_title := 'Project deleted';
            activity_description := 'Project "' || OLD.name || '" was deleted';
            INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, organization_id)
            VALUES (OLD.updated_by, 'projects', 'project', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD), OLD.organization_id);
            RETURN OLD;
          END IF;
          RETURN NULL;
        END;
        $func$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'log_projects_activity function updated';
    ELSE
        RAISE NOTICE 'log_projects_activity function does not exist - skipping';
    END IF;
END $$;

-- =====================================================
-- CHECK WHAT FUNCTIONS EXIST
-- =====================================================

SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname LIKE '%activity%' 
ORDER BY proname;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if activity_logs table has organization_id and some sample data
SELECT 
    'activity_logs' as table_name,
    COUNT(*) as total_records,
    COUNT(organization_id) as records_with_org_id
FROM activity_logs;

-- Show sample activity logs
SELECT 
    id,
    module,
    entity_type,
    action,
    title,
    organization_id,
    created_at
FROM activity_logs 
WHERE organization_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 3;
