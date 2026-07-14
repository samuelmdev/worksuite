-- Fix contract activity logging for CRM user activity feed.
-- Run in Supabase SQL Editor if contract creation does not appear in activity_logs.
--
-- Root causes:
-- 1. log_contracts_activity() did not set organization_id (RLS hides rows without it)
-- 2. created_by may be null if the app did not set it on insert

CREATE OR REPLACE FUNCTION log_contracts_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_title VARCHAR(255);
  activity_description TEXT;
  actor_id UUID;
  client_name TEXT;
BEGIN
  actor_id := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.created_by ELSE NEW.created_by END,
    auth.uid()
  );

  IF TG_OP = 'INSERT' THEN
    SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;

    activity_title := 'Contract created';
    activity_description := 'New contract "' || NEW.name || '" was created' ||
      CASE WHEN client_name IS NOT NULL THEN ' for ' || client_name ELSE '' END;

    INSERT INTO activity_logs (
      user_id, module, entity_type, entity_id, action, title, description, new_values, organization_id
    )
    VALUES (
      actor_id, 'crm', 'contract', NEW.id, 'created', activity_title, activity_description,
      row_to_json(NEW), NEW.organization_id
    );

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;

    activity_title := 'Contract updated';
    activity_description := 'Contract "' || NEW.name || '" was updated' ||
      CASE WHEN client_name IS NOT NULL THEN ' for ' || client_name ELSE '' END;

    INSERT INTO activity_logs (
      user_id, module, entity_type, entity_id, action, title, description, old_values, new_values, organization_id
    )
    VALUES (
      actor_id, 'crm', 'contract', NEW.id, 'updated', activity_title, activity_description,
      row_to_json(OLD), row_to_json(NEW), NEW.organization_id
    );

  ELSIF TG_OP = 'DELETE' THEN
    SELECT c.name INTO client_name FROM clients c WHERE c.id = OLD.client_id;

    activity_title := 'Contract deleted';
    activity_description := 'Contract "' || OLD.name || '" was deleted' ||
      CASE WHEN client_name IS NOT NULL THEN ' for ' || client_name ELSE '' END;

    INSERT INTO activity_logs (
      user_id, module, entity_type, entity_id, action, title, description, old_values, organization_id
    )
    VALUES (
      actor_id, 'crm', 'contract', OLD.id, 'deleted', activity_title, activity_description,
      row_to_json(OLD), OLD.organization_id
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS contracts_activity_trigger ON contracts;

CREATE TRIGGER contracts_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW EXECUTE FUNCTION log_contracts_activity();

-- Backfill organization_id on existing contract activity logs (if any were inserted without it)
UPDATE activity_logs al
SET organization_id = c.organization_id
FROM contracts c
WHERE al.entity_type = 'contract'
  AND al.entity_id = c.id
  AND al.organization_id IS NULL;
