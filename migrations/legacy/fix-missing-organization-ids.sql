-- Fix missing organization_id fields in activity_logs and client_activities tables
-- These tables need organization_id to work with the new multi-organization architecture

-- =====================================================
-- ADD ORGANIZATION_ID TO ACTIVITY_LOGS TABLE
-- =====================================================

-- Add organization_id column to activity_logs
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON activity_logs(organization_id);

-- Populate organization_id for existing activity_logs
-- Get organization_id from the user who created the activity
UPDATE activity_logs 
SET organization_id = (
    SELECT uo.organization_id 
    FROM user_organizations uo 
    WHERE uo.user_id = activity_logs.user_id 
    ORDER BY uo.joined_at ASC 
    LIMIT 1
)
WHERE organization_id IS NULL;

-- For activity_logs without a user_id, try to get organization from the entity
-- This handles cases where system-generated activities don't have a user_id
UPDATE activity_logs 
SET organization_id = (
    CASE 
        WHEN entity_type = 'client' THEN (
            SELECT c.organization_id 
            FROM clients c 
            WHERE c.id = activity_logs.entity_id
        )
        WHEN entity_type = 'contract' THEN (
            SELECT c.organization_id 
            FROM contracts c 
            WHERE c.id = activity_logs.entity_id
        )
        WHEN entity_type = 'time_entry' THEN (
            SELECT te.organization_id 
            FROM time_entries te 
            WHERE te.id = activity_logs.entity_id
        )
        WHEN entity_type = 'project' THEN (
            SELECT p.organization_id 
            FROM projects p 
            WHERE p.id = activity_logs.entity_id
        )
        ELSE NULL
    END
)
WHERE organization_id IS NULL;

-- =====================================================
-- ADD ORGANIZATION_ID TO CLIENT_ACTIVITIES TABLE
-- =====================================================

-- Add organization_id column to client_activities
ALTER TABLE client_activities 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_client_activities_organization_id ON client_activities(organization_id);

-- Populate organization_id for existing client_activities
-- Get organization_id from the associated client
UPDATE client_activities 
SET organization_id = (
    SELECT c.organization_id 
    FROM clients c 
    WHERE c.id = client_activities.client_id
)
WHERE organization_id IS NULL;

-- =====================================================
-- UPDATE RLS POLICIES FOR ACTIVITY_LOGS
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view activity logs in their organization" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Create new policies
CREATE POLICY "Users can view activity logs in their organization" ON activity_logs
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can insert activity logs" ON activity_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- UPDATE RLS POLICIES FOR CLIENT_ACTIVITIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view client activities in their organization" ON client_activities;
DROP POLICY IF EXISTS "Users can insert client activities in their organization" ON client_activities;
DROP POLICY IF EXISTS "Users can update their own client activities" ON client_activities;
DROP POLICY IF EXISTS "Users can delete their own client activities" ON client_activities;

-- Create new policies
CREATE POLICY "Users can view client activities in their organization" ON client_activities
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert client activities in their organization" ON client_activities
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own client activities" ON client_activities
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own client activities" ON client_activities
    FOR DELETE USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

-- =====================================================
-- UPDATE ACTIVITY LOGGING FUNCTIONS
-- =====================================================

-- Update the CRM activity logging function to include organization_id
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
$$ LANGUAGE plpgsql;

-- Update the time tracking activity logging function to include organization_id
CREATE OR REPLACE FUNCTION log_time_tracking_activity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Update the projects activity logging function to include organization_id
CREATE OR REPLACE FUNCTION log_projects_activity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if organization_id was added and populated correctly
SELECT 
    'activity_logs' as table_name,
    COUNT(*) as total_records,
    COUNT(organization_id) as records_with_org_id,
    COUNT(*) - COUNT(organization_id) as records_missing_org_id
FROM activity_logs

UNION ALL

SELECT 
    'client_activities' as table_name,
    COUNT(*) as total_records,
    COUNT(organization_id) as records_with_org_id,
    COUNT(*) - COUNT(organization_id) as records_missing_org_id
FROM client_activities;

-- Show sample of activity_logs with organization_id
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
LIMIT 5;

-- Show sample of client_activities with organization_id
SELECT 
    id,
    type,
    subject,
    organization_id,
    created_at
FROM client_activities 
WHERE organization_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;
