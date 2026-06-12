-- Add client interaction activity types to the existing activity_logs system
-- This extends the current activity logging to support detailed client interactions

-- Add new action types for client interactions
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'call_made';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'call_received';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'email_sent';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'email_received';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'meeting_scheduled';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'meeting_completed';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'meeting_cancelled';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'proposal_sent';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'contract_signed';
ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'follow_up_scheduled';

-- Create a more detailed client interaction logging function
CREATE OR REPLACE FUNCTION log_client_interaction()
RETURNS TRIGGER AS $$
DECLARE
  activity_title VARCHAR(255);
  activity_description TEXT;
  client_name VARCHAR(255);
BEGIN
  -- Get client name for better descriptions
  SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;
  
  -- Determine activity details based on task type
  CASE NEW.task_type
    WHEN 'call' THEN
      activity_title := 'Call made to client';
      activity_description := 'Phone call made to "' || COALESCE(client_name, 'Unknown Client') || '"';
      IF NEW.description IS NOT NULL AND NEW.description != '' THEN
        activity_description := activity_description || ' - ' || NEW.description;
      END IF;
      
    WHEN 'email' THEN
      activity_title := 'Email sent to client';
      activity_description := 'Email sent to "' || COALESCE(client_name, 'Unknown Client') || '"';
      IF NEW.description IS NOT NULL AND NEW.description != '' THEN
        activity_description := activity_description || ' - ' || NEW.description;
      END IF;
      
    WHEN 'meeting' THEN
      activity_title := 'Meeting scheduled with client';
      activity_description := 'Meeting scheduled with "' || COALESCE(client_name, 'Unknown Client') || '"';
      IF NEW.description IS NOT NULL AND NEW.description != '' THEN
        activity_description := activity_description || ' - ' || NEW.description;
      END IF;
      
    WHEN 'follow_up' THEN
      activity_title := 'Follow-up scheduled';
      activity_description := 'Follow-up scheduled with "' || COALESCE(client_name, 'Unknown Client') || '"';
      IF NEW.description IS NOT NULL AND NEW.description != '' THEN
        activity_description := activity_description || ' - ' || NEW.description;
      END IF;
      
    ELSE
      activity_title := 'Task created for client';
      activity_description := 'Task "' || NEW.task_type || '" created for "' || COALESCE(client_name, 'Unknown Client') || '"';
      IF NEW.description IS NOT NULL AND NEW.description != '' THEN
        activity_description := activity_description || ' - ' || NEW.description;
      END IF;
  END CASE;
  
  -- Log the activity
  BEGIN
    INSERT INTO activity_logs (
      user_id, 
      module, 
      entity_type, 
      entity_id, 
      action, 
      title, 
      description, 
      new_values
    )
    VALUES (
      NEW.user_id, 
      'crm', 
      'client_interaction', 
      NEW.id, 
      CASE NEW.task_type
        WHEN 'call' THEN 'call_made'
        WHEN 'email' THEN 'email_sent'
        WHEN 'meeting' THEN 'meeting_scheduled'
        WHEN 'follow_up' THEN 'follow_up_scheduled'
        ELSE 'created'
      END,
      activity_title, 
      activity_description, 
      jsonb_build_object(
        'task_type', NEW.task_type,
        'client_id', NEW.client_id,
        'client_name', client_name,
        'description', NEW.description,
        'due_date', NEW.due_date,
        'is_scheduled', NEW.is_scheduled
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log client interaction: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for client interaction logging on task creation
CREATE OR REPLACE TRIGGER log_client_interaction_trigger
  AFTER INSERT ON tasks
  FOR EACH ROW 
  WHEN (NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION log_client_interaction();

-- Create function to log manual client interactions
CREATE OR REPLACE FUNCTION create_manual_client_interaction(
  p_user_id UUID,
  p_client_id UUID,
  p_interaction_type VARCHAR(50),
  p_title VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
  client_name VARCHAR(255);
BEGIN
  -- Get client name
  SELECT c.name INTO client_name FROM clients c WHERE c.id = p_client_id;
  
  -- Insert the activity log
  INSERT INTO activity_logs (
    user_id,
    module,
    entity_type,
    entity_id,
    action,
    title,
    description,
    new_values
  )
  VALUES (
    p_user_id,
    'crm',
    'client_interaction',
    p_client_id,
    p_interaction_type::action_enum,
    p_title,
    p_description,
    jsonb_build_object(
      'client_id', p_client_id,
      'client_name', client_name,
      'interaction_type', p_interaction_type,
      'manual_log', true,
      'metadata', COALESCE(p_metadata, '{}'::jsonb)
    )
  )
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get client activity timeline
CREATE OR REPLACE FUNCTION get_client_activity_timeline(p_client_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  action action_enum,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.action,
    al.title,
    al.description,
    al.created_at,
    CONCAT(u.first_name, ' ', u.last_name) as user_name,
    COALESCE(al.new_values, '{}'::jsonb) as metadata
  FROM activity_logs al
  LEFT JOIN users u ON u.id = al.user_id
  WHERE al.entity_type = 'client_interaction' 
    AND al.entity_id = p_client_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all client-related activities
CREATE OR REPLACE FUNCTION get_client_all_activities(p_client_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  module module_enum,
  entity_type VARCHAR(50),
  action action_enum,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.module,
    al.entity_type,
    al.action,
    al.title,
    al.description,
    al.created_at,
    CONCAT(u.first_name, ' ', u.last_name) as user_name,
    COALESCE(al.new_values, al.old_values, '{}'::jsonb) as metadata
  FROM activity_logs al
  LEFT JOIN users u ON u.id = al.user_id
  WHERE (
    -- Direct client interactions
    (al.entity_type = 'client_interaction' AND al.entity_id = p_client_id)
    OR
    -- Client record changes
    (al.entity_type = 'client' AND al.entity_id = p_client_id)
    OR
    -- Tasks related to this client
    (al.entity_type = 'task' AND COALESCE(al.new_values->>'client_id', al.old_values->>'client_id') = p_client_id::text)
    OR
    -- Contracts related to this client
    (al.entity_type = 'contract' AND COALESCE(al.new_values->>'client_id', al.old_values->>'client_id') = p_client_id::text)
    OR
    -- Pipeline items related to this client
    (al.entity_type = 'pipeline_item' AND COALESCE(al.new_values->>'client_id', al.old_values->>'client_id') = p_client_id::text)
  )
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
