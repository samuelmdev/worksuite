-- Fix Organization Architecture v2
-- This script updates the database to support multiple organizations per user
-- Handles existing RLS policies properly

-- =============================================
-- STEP 1: Drop existing RLS policies that depend on users.organization_id
-- =============================================

-- Drop policies that reference users.organization_id
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
DROP POLICY IF EXISTS "Managers and admins can manage clients" ON clients;
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers and admins can delete time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can view projects in their organization" ON projects;
DROP POLICY IF EXISTS "Managers and admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Users can view project clients in their organization" ON project_clients;
DROP POLICY IF EXISTS "Managers and admins can manage project clients" ON project_clients;
DROP POLICY IF EXISTS "Users can view project employees in their organization" ON project_employees;
DROP POLICY IF EXISTS "Managers and admins can manage project employees" ON project_employees;
DROP POLICY IF EXISTS "System admins can manage subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Users can view activity logs in their organization" ON activity_logs;
DROP POLICY IF EXISTS "Users can view contracts in their organization" ON contracts;
DROP POLICY IF EXISTS "Managers and admins can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view contract activities in their organization" ON contract_activities;
DROP POLICY IF EXISTS "Users can view pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can insert pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can update pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can delete pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can view client activities in their organization" ON client_activities;
DROP POLICY IF EXISTS "Users can insert client activities in their organization" ON client_activities;
DROP POLICY IF EXISTS "Users can update their own client activities" ON client_activities;
DROP POLICY IF EXISTS "Users can delete their own client activities" ON client_activities;

-- =============================================
-- STEP 2: Create user_organizations junction table
-- =============================================

CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'employee', -- admin, manager, employee (role within this org)
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- =============================================
-- STEP 3: Migrate existing data
-- =============================================

-- Copy existing user-organization relationships to the new table
INSERT INTO user_organizations (user_id, organization_id, role, is_active, joined_at)
SELECT 
    u.id as user_id,
    u.organization_id,
    u.role,
    u.is_active,
    u.created_at as joined_at
FROM users u
WHERE u.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- =============================================
-- STEP 4: Update users table
-- =============================================

-- Remove the direct organization_id foreign key and role column
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;
ALTER TABLE users DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS role CASCADE;

-- =============================================
-- STEP 5: Add indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_active ON user_organizations(is_active) WHERE is_active = true;

-- =============================================
-- STEP 6: Create helper views for backward compatibility
-- =============================================

-- View to get user's primary organization (first one they joined)
CREATE OR REPLACE VIEW user_primary_organization AS
SELECT DISTINCT ON (uo.user_id)
    uo.user_id,
    uo.organization_id,
    uo.role,
    o.name as organization_name,
    o.slug as organization_slug
FROM user_organizations uo
JOIN organizations o ON uo.organization_id = o.id
WHERE uo.is_active = true
ORDER BY uo.user_id, uo.joined_at ASC;

-- View to get all user organizations
CREATE OR REPLACE VIEW user_organizations_view AS
SELECT 
    uo.user_id,
    uo.organization_id,
    uo.role,
    uo.is_active,
    uo.joined_at,
    o.name as organization_name,
    o.slug as organization_slug,
    u.first_name,
    u.last_name,
    au.email
FROM user_organizations uo
JOIN organizations o ON uo.organization_id = o.id
JOIN users u ON uo.user_id = u.id
JOIN auth.users au ON uo.user_id = au.id
WHERE uo.is_active = true;

-- =============================================
-- STEP 7: Add organization context to existing data
-- =============================================

-- Update time_entries that have null organization_id
-- (This should be done based on the user who created the entry)
UPDATE time_entries 
SET organization_id = (
    SELECT uo.organization_id 
    FROM user_organizations uo 
    WHERE uo.user_id = time_entries.user_id 
    AND uo.is_active = true 
    LIMIT 1
)
WHERE organization_id IS NULL;

-- Update clients that might have null organization_id
UPDATE clients 
SET organization_id = (
    SELECT uo.organization_id 
    FROM user_organizations uo 
    WHERE uo.user_id = clients.created_by 
    AND uo.is_active = true 
    LIMIT 1
)
WHERE organization_id IS NULL;

-- =============================================
-- STEP 8: Add constraints to ensure data integrity
-- =============================================

-- Ensure all time_entries have organization_id
ALTER TABLE time_entries ALTER COLUMN organization_id SET NOT NULL;

-- Ensure all clients have organization_id
ALTER TABLE clients ALTER COLUMN organization_id SET NOT NULL;

-- Ensure all projects have organization_id
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;

-- =============================================
-- STEP 9: Create new RLS policies for organization isolation
-- =============================================

-- Enable RLS on user_organizations
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own organization memberships
CREATE POLICY "Users can view their own organization memberships" ON user_organizations
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only see time entries from their organizations
CREATE POLICY "Users can view time entries from their organizations" ON time_entries
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can insert time entries in their organizations
CREATE POLICY "Users can insert time entries in their organizations" ON time_entries
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can update time entries in their organizations
CREATE POLICY "Users can update time entries in their organizations" ON time_entries
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can delete time entries in their organizations (if they created them or are admin/manager)
CREATE POLICY "Users can delete time entries in their organizations" ON time_entries
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
        AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_organizations 
                WHERE user_id = auth.uid() 
                AND organization_id = time_entries.organization_id
                AND role IN ('admin', 'manager')
                AND is_active = true
            )
        )
    );

-- Policy: Users can only see clients from their organizations
CREATE POLICY "Users can view clients from their organizations" ON clients
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can insert clients in their organizations
CREATE POLICY "Users can insert clients in their organizations" ON clients
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can update clients in their organizations
CREATE POLICY "Users can update clients in their organizations" ON clients
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can delete clients in their organizations (admin/manager only)
CREATE POLICY "Users can delete clients in their organizations" ON clients
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
        AND EXISTS (
            SELECT 1 FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND organization_id = clients.organization_id
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

-- Policy: Users can only see projects from their organizations
CREATE POLICY "Users can view projects from their organizations" ON projects
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can insert projects in their organizations
CREATE POLICY "Users can insert projects in their organizations" ON projects
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can update projects in their organizations
CREATE POLICY "Users can update projects in their organizations" ON projects
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Policy: Users can delete projects in their organizations (admin/manager only)
CREATE POLICY "Users can delete projects in their organizations" ON projects
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
        AND EXISTS (
            SELECT 1 FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND organization_id = projects.organization_id
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

-- Policy: Users can manage pipeline items in their organizations
CREATE POLICY "Users can view pipeline items in their organization" ON pipeline_items
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM user_organizations
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Users can insert pipeline items in their organization" ON pipeline_items
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM user_organizations
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Users can update pipeline items in their organization" ON pipeline_items
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id
            FROM user_organizations
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Users can delete pipeline items in their organization" ON pipeline_items
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id
            FROM user_organizations
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

-- =============================================
-- STEP 10: Add functions for common queries
-- =============================================

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name VARCHAR,
    organization_slug VARCHAR,
    role VARCHAR,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uo.organization_id,
        o.name as organization_name,
        o.slug as organization_slug,
        uo.role,
        uo.joined_at
    FROM user_organizations uo
    JOIN organizations o ON uo.organization_id = o.id
    WHERE uo.user_id = user_uuid
    AND uo.is_active = true
    ORDER BY uo.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a specific organization
CREATE OR REPLACE FUNCTION get_user_organization_role(user_uuid UUID, org_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role
    FROM user_organizations
    WHERE user_id = user_uuid
    AND organization_id = org_uuid
    AND is_active = true;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to organization
CREATE OR REPLACE FUNCTION user_has_organization_access(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = user_uuid
        AND organization_id = org_uuid
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 11: Create indexes on organization_id columns for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_time_entries_organization_id ON time_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);

-- =============================================
-- STEP 12: Verify migration
-- =============================================

-- Check that all users have been migrated
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM users u 
        LEFT JOIN user_organizations uo ON u.id = uo.user_id 
        WHERE uo.user_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration incomplete: Some users are not in user_organizations table';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;
