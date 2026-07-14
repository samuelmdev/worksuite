-- WorkSuite Database Schema
-- Supabase/PostgreSQL compatible

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS
-- =============================================

-- Activity log enums
CREATE TYPE module_enum AS ENUM ('crm', 'time_tracking', 'projects', 'settings');
CREATE TYPE action_enum AS ENUM ('created', 'updated', 'deleted', 'approved', 'rejected', 'submitted');

-- =============================================
-- CORE TABLES
-- =============================================

-- JSONB Usage Strategy:
-- - Use JSONB for: custom_fields, preferences, settings, audit data
-- - Use separate columns for: frequently queried features, filters, business logic
-- - This allows efficient indexing and querying of common fields while maintaining flexibility

-- Organizations/Companies table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'employee', -- admin, manager, employee
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CRM MODULE TABLES
-- =============================================

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, prospect, lead
    source VARCHAR(100), -- referral, website, cold_call, etc.
    notes TEXT,
    tags TEXT[], -- Array of tags
    custom_fields JSONB DEFAULT '{}',
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client contacts (for multiple contacts per client)
CREATE TABLE client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    position VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client activities/interactions
CREATE TABLE client_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- call, email, meeting, note, task
    subject VARCHAR(255),
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PROJECTS MODULE TABLES (Full Suite Feature)
-- =============================================

-- Main projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'general', -- general, route, internal, external
    status VARCHAR(50) DEFAULT 'active', -- active, completed, on_hold, cancelled
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    hourly_rate DECIMAL(10,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects ↔ Clients (many-to-many)
CREATE TABLE project_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (project_id, client_id)
);

-- Projects ↔ Employees (many-to-many)
CREATE TABLE project_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'worker', -- manager, worker, observer, etc.
    hourly_rate DECIMAL(10,2), -- Project-specific rate override
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (project_id, user_id)
);

-- =============================================
-- TIME TRACKING MODULE TABLES
-- =============================================

-- Time entries table
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    project_name VARCHAR(255), -- Legacy field, use project_id instead
    description TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER, -- Calculated field
    billable_hours DECIMAL(4,2), -- Rounded to 0.25 increments
    hourly_rate DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, rejected
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time entry approvals (for manager approval workflow)
CREATE TABLE time_entry_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL, -- approved, rejected
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTION & BILLING TABLES
-- =============================================

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    -- Feature flags as separate columns for better querying
    has_crm_access BOOLEAN DEFAULT false,
    has_time_tracking_access BOOLEAN DEFAULT false,
    has_advanced_reports BOOLEAN DEFAULT false,
    has_api_access BOOLEAN DEFAULT false,
    has_priority_support BOOLEAN DEFAULT false,
    -- Additional features as JSONB for less common/extensible features
    additional_features JSONB DEFAULT '{}',
    max_users INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization subscriptions
CREATE TABLE organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL, -- active, cancelled, past_due, trialing
    stripe_subscription_id VARCHAR(255) UNIQUE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing history
CREATE TABLE billing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES organization_subscriptions(id),
    stripe_invoice_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- paid, pending, failed
    invoice_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SYSTEM TABLES
-- =============================================

-- Activity logs for user activity tracking across all modules
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  module module_enum NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action action_enum NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for tracking changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);

-- Clients indexes
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_created_at ON clients(created_at);

-- Time entries indexes
CREATE INDEX idx_time_entries_organization_id ON time_entries(organization_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_client_id ON time_entries(client_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX idx_time_entries_status ON time_entries(status);

-- Projects indexes
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_start_date ON projects(start_date);

-- Project relationships indexes
CREATE INDEX idx_project_clients_project_id ON project_clients(project_id);
CREATE INDEX idx_project_clients_client_id ON project_clients(client_id);
CREATE INDEX idx_project_employees_project_id ON project_employees(project_id);
CREATE INDEX idx_project_employees_user_id ON project_employees(user_id);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_module_created ON activity_logs(module, created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Subscription plan feature indexes
CREATE INDEX idx_subscription_plans_crm_access ON subscription_plans(has_crm_access);
CREATE INDEX idx_subscription_plans_time_tracking_access ON subscription_plans(has_time_tracking_access);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entry_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Organizations policies (simplified to avoid recursion)
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT USING (true); -- Allow all authenticated users to view organizations

CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE USING (true); -- Allow all authenticated users to update organizations (will be restricted by app logic)

-- Allow authenticated users to create organizations (for signup)
CREATE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow service role to manage all organizations
CREATE POLICY "Service role can manage all organizations" ON organizations
    FOR ALL USING (auth.role() = 'service_role');

-- Users policies (simplified to avoid recursion)
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Allow service role to manage all users (for admin operations)
CREATE POLICY "Service role can manage all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Clients policies
CREATE POLICY "Users can view clients in their organization" ON clients
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Managers and admins can manage clients" ON clients
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Time entries policies
CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT USING (user_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Users can insert their own time entries" ON time_entries
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries" ON time_entries
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Managers and admins can delete time entries" ON time_entries
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Projects policies
CREATE POLICY "Users can view projects in their organization" ON projects
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Managers and admins can manage projects" ON projects
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Project clients policies
CREATE POLICY "Users can view project clients in their organization" ON project_clients
    FOR SELECT USING (project_id IN (
        SELECT id FROM projects WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Managers and admins can manage project clients" ON project_clients
    FOR ALL USING (project_id IN (
        SELECT id FROM projects WHERE organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    ));

-- Project employees policies
CREATE POLICY "Users can view project employees in their organization" ON project_employees
    FOR SELECT USING (project_id IN (
        SELECT id FROM projects WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can view their own project assignments" ON project_employees
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers and admins can manage project employees" ON project_employees
    FOR ALL USING (project_id IN (
        SELECT id FROM projects WHERE organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    ));

-- Subscription plans policies
CREATE POLICY "Authenticated users can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "System admins can manage subscription plans" ON subscription_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND organization_id IN (
                SELECT id FROM organizations WHERE slug = 'system' -- System organization for global admins
            )
        )
    );

-- Activity logs policies
CREATE POLICY "Users can view activity logs in their organization" ON activity_logs
    FOR SELECT USING (user_id IN (
        SELECT id FROM users WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "System can insert activity logs" ON activity_logs
    FOR INSERT WITH CHECK (true); -- Allow system triggers to insert

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_activities_updated_at BEFORE UPDATE ON client_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_employees_updated_at BEFORE UPDATE ON project_employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_subscriptions_updated_at BEFORE UPDATE ON organization_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate time entry duration
CREATE OR REPLACE FUNCTION calculate_time_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if both start_time and end_time are provided
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        -- Always calculate duration_minutes from the actual time difference
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
        
        -- Only auto-calculate billable_hours if:
        -- 1. This is a new record (INSERT), OR
        -- 2. The billable_hours is NULL/empty (not manually set), OR  
        -- 3. The start_time or end_time actually changed (time was adjusted)
        IF TG_OP = 'INSERT' OR 
           NEW.billable_hours IS NULL OR 
           (OLD.start_time IS DISTINCT FROM NEW.start_time) OR 
           (OLD.end_time IS DISTINCT FROM NEW.end_time) THEN
            NEW.billable_hours = ROUND((NEW.duration_minutes / 60) * 4) / 4; -- Round to 0.25
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add duration calculation trigger
CREATE TRIGGER calculate_time_entry_duration BEFORE INSERT OR UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION calculate_time_duration();

-- Note: handle_new_user() function and trigger removed
-- User profiles are now created directly in the application during signup
-- This allows for better control over organization assignment and user creation flow
-- 
-- The signup process now:
-- 1. Creates organization first
-- 2. Creates auth user
-- 3. Creates user profile with organization_id
-- All handled in the application code, not database triggers

-- =============================================
-- ACTIVITY LOGGING FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to log CRM activities
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
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values)
    VALUES (NEW.created_by, 'crm', 'client', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    activity_title := 'Client updated';
    activity_description := 'Client "' || NEW.name || '" information was updated';
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
    VALUES (COALESCE(NEW.created_by, auth.uid()), 'crm', 'client', NEW.id, 'updated', activity_title, activity_description, row_to_json(OLD), row_to_json(NEW));
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Client deleted';
    activity_description := 'Client "' || OLD.name || '" was removed';
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values)
    VALUES (COALESCE(OLD.created_by, auth.uid()), 'crm', 'client', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to log time tracking activities
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
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values)
    VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if status changed
    IF OLD.status != NEW.status THEN
      activity_title := 'Time entry ' || NEW.status;
      activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was ' || NEW.status;
      
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
      VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, NEW.status::action_enum, activity_title, activity_description, 
              row_to_json(OLD), row_to_json(NEW));
    ELSE
      activity_title := 'Time entry updated';
      activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was updated';
      
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
      VALUES (NEW.user_id, 'time_tracking', 'time_entry', NEW.id, 'updated', activity_title, activity_description, 
              row_to_json(OLD), row_to_json(NEW));
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Time entry deleted';
    activity_description := 'Time entry for "' || COALESCE(client_name, 'Unknown Client') || '" was deleted';
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values)
    VALUES (OLD.user_id, 'time_tracking', 'time_entry', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to log project activities
CREATE OR REPLACE FUNCTION log_projects_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_title VARCHAR(255);
  activity_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Project created';
    activity_description := 'New project "' || NEW.name || '" was created';
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values)
    VALUES (NEW.created_by, 'projects', 'project', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for specific status changes
    IF OLD.status != NEW.status THEN
      activity_title := 'Project ' || NEW.status;
      activity_description := 'Project "' || NEW.name || '" status changed to ' || NEW.status;
    ELSE
      activity_title := 'Project updated';
      activity_description := 'Project "' || NEW.name || '" was updated';
    END IF;
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
    VALUES (NEW.updated_by, 'projects', 'project', NEW.id, 'updated', activity_title, activity_description, 
            row_to_json(OLD), row_to_json(NEW));
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Project deleted';
    activity_description := 'Project "' || OLD.name || '" was deleted';
    
    INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values)
    VALUES (OLD.updated_by, 'projects', 'project', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create activity logging triggers
CREATE TRIGGER clients_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_crm_activity();

CREATE TRIGGER time_entries_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION log_time_tracking_activity();

CREATE TRIGGER projects_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_projects_activity();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, has_crm_access, has_time_tracking_access, has_advanced_reports, has_api_access, has_priority_support, max_users, additional_features) VALUES
('Trial', 'trial', '14-day free trial with limited features', 0.00, 0.00, false, false, false, false, false, 1, '{"projects": false}'),
('CRM Only', 'crm_only', 'Full CRM functionality', 29.00, 290.00, true, false, true, false, false, 5, '{"projects": false}'),
('Time Tracking Only', 'time_tracking_only', 'Full time tracking functionality', 19.00, 190.00, false, true, false, false, false, 5, '{"projects": false}'),
('Full Suite', 'full_suite', 'Complete CRM, Time Tracking, and Project Management suite', 39.00, 390.00, true, true, true, true, true, 10, '{"projects": true, "project_templates": true, "advanced_project_analytics": true}');

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for user dashboard data
CREATE VIEW user_dashboard AS
SELECT 
    u.id,
    au.email,
    u.first_name,
    u.last_name,
    u.role,
    o.name as organization_name,
    sp.slug as subscription_plan,
    os.status as subscription_status,
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT te.id) as total_time_entries,
    COALESCE(SUM(te.billable_hours), 0) as total_billable_hours
FROM users u
JOIN auth.users au ON u.id = au.id
JOIN organizations o ON u.organization_id = o.id
LEFT JOIN organization_subscriptions os ON os.organization_id = o.id AND os.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = os.plan_id
LEFT JOIN clients c ON c.organization_id = o.id
LEFT JOIN time_entries te ON te.user_id = u.id AND te.status = 'approved'
GROUP BY u.id, au.email, u.first_name, u.last_name, u.role, o.name, sp.slug, os.status;

-- View for organization analytics
CREATE VIEW organization_analytics AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    sp.slug as subscription_plan,
    os.status as subscription_status,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT te.id) as total_time_entries,
    COALESCE(SUM(te.billable_hours), 0) as total_billable_hours,
    COALESCE(AVG(te.billable_hours), 0) as avg_hours_per_entry
FROM organizations o
LEFT JOIN organization_subscriptions os ON os.organization_id = o.id AND os.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = os.plan_id
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN clients c ON c.organization_id = o.id
LEFT JOIN projects p ON p.organization_id = o.id
LEFT JOIN time_entries te ON te.organization_id = o.id AND te.status = 'approved'
GROUP BY o.id, o.name, sp.slug, os.status;

-- View for project analytics (Full Suite feature)
CREATE VIEW project_analytics AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.type as project_type,
    p.status as project_status,
    p.budget,
    p.hourly_rate as project_hourly_rate,
    o.name as organization_name,
    COUNT(DISTINCT pc.client_id) as total_clients,
    COUNT(DISTINCT pe.user_id) as total_employees,
    COUNT(DISTINCT te.id) as total_time_entries,
    COALESCE(SUM(te.billable_hours), 0) as total_billable_hours,
    COALESCE(SUM(te.billable_hours * te.hourly_rate), 0) as total_revenue,
    COALESCE(AVG(te.billable_hours), 0) as avg_hours_per_entry
FROM projects p
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN project_clients pc ON pc.project_id = p.id
LEFT JOIN project_employees pe ON pe.project_id = p.id
LEFT JOIN time_entries te ON te.project_id = p.id AND te.status = 'approved'
GROUP BY p.id, p.name, p.type, p.status, p.budget, p.hourly_rate, o.name;
