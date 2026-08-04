-- Fix client activity trigger: clients table has created_by, not updated_by.
-- Run in Supabase SQL Editor if client updates fail with:
--   record "new" has no field "updated_by"

CREATE OR REPLACE FUNCTION log_crm_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_title VARCHAR(255);
  activity_description TEXT;
  actor_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Client created';
    activity_description := 'New client "' || NEW.name || '" was added';
    actor_id := COALESCE(NEW.created_by, auth.uid());

    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values, organization_id)
    VALUES (actor_id, 'crm', 'client', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW), NEW.organization_id);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    activity_title := 'Client updated';
    activity_description := 'Client "' || NEW.name || '" information was updated';
    actor_id := COALESCE(NEW.created_by, auth.uid());

    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values, organization_id)
    VALUES (actor_id, 'crm', 'client', NEW.id, 'updated', activity_title, activity_description, row_to_json(OLD), row_to_json(NEW), NEW.organization_id);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Client deleted';
    activity_description := 'Client "' || OLD.name || '" was removed';
    actor_id := COALESCE(OLD.created_by, auth.uid());

    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, organization_id)
    VALUES (actor_id, 'crm', 'client', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD), OLD.organization_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
