-- Fix Organization Architecture
-- This script updates the database to support multiple organizations per user

-- =============================================
-- STEP 1: Create user_organizations junction table
-- =============================================

CREATE TABLE user_organizations (
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
-- STEP 2: Migrate existing data
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
WHERE u.organization_id IS NOT NULL;

-- =============================================
-- STEP 3: Update users table
-- =============================================

-- Remove the direct organization_id foreign key
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;
ALTER TABLE users DROP COLUMN IF EXISTS organization_id;
ALTER TABLE users DROP COLUMN IF EXISTS role; -- Role is now in user_organizations

-- =============================================
-- STEP 4: Add indexes for performance
-- =============================================

CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX idx_user_organizations_active ON user_organizations(is_active) WHERE is_active = true;

-- =============================================
-- STEP 5: Update RLS policies (if any exist)
-- =============================================

-- Drop existing policies that reference users.organization_id
-- (These will need to be recreated to use the new junction table)

-- =============================================
-- STEP 6: Create helper views for backward compatibility
-- =============================================

-- View to get user's primary organization (first one they joined)
CREATE VIEW user_primary_organization AS
SELECT 
    uo.user_id,
    uo.organization_id,
    uo.role,
    o.name as organization_name,
    o.slug as organization_slug
FROM user_organizations uo
JOIN organizations o ON uo.organization_id = o.id
WHERE uo.is_active = true
AND uo.id = (
    SELECT MIN(id) 
    FROM user_organizations uo2 
    WHERE uo2.user_id = uo.user_id 
    AND uo2.is_active = true
);

-- View to get all user organizations
CREATE VIEW user_organizations_view AS
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
    u.email
FROM user_organizations uo
JOIN organizations o ON uo.organization_id = o.id
JOIN users u ON uo.user_id = u.id
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
-- STEP 9: Create RLS policies for organization isolation
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
