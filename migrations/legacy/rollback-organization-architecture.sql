-- Rollback Organization Architecture Changes
-- WARNING: This will revert the multi-org architecture back to single-org
-- Make sure to backup your data before running this!

-- =============================================
-- STEP 1: Drop new RLS policies
-- =============================================

DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can view time entries from their organizations" ON time_entries;
DROP POLICY IF EXISTS "Users can insert time entries in their organizations" ON time_entries;
DROP POLICY IF EXISTS "Users can update time entries in their organizations" ON time_entries;
DROP POLICY IF EXISTS "Users can delete time entries in their organizations" ON time_entries;
DROP POLICY IF EXISTS "Users can view clients from their organizations" ON clients;
DROP POLICY IF EXISTS "Users can insert clients in their organizations" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their organizations" ON clients;
DROP POLICY IF EXISTS "Users can delete clients in their organizations" ON clients;
DROP POLICY IF EXISTS "Users can view projects from their organizations" ON projects;
DROP POLICY IF EXISTS "Users can insert projects in their organizations" ON projects;
DROP POLICY IF EXISTS "Users can update projects in their organizations" ON projects;
DROP POLICY IF EXISTS "Users can delete projects in their organizations" ON projects;

-- =============================================
-- STEP 2: Drop new functions
-- =============================================

DROP FUNCTION IF EXISTS get_user_organizations(UUID);
DROP FUNCTION IF EXISTS get_user_organization_role(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_organization_access(UUID, UUID);

-- =============================================
-- STEP 3: Drop new views
-- =============================================

DROP VIEW IF EXISTS user_primary_organization;
DROP VIEW IF EXISTS user_organizations_view;

-- =============================================
-- STEP 4: Add back organization_id and role columns to users table
-- =============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee';

-- =============================================
-- STEP 5: Migrate data back from user_organizations
-- =============================================

-- Get primary organization for each user and set it as their organization_id
UPDATE users 
SET organization_id = (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = users.id 
    AND is_active = true 
    ORDER BY joined_at ASC 
    LIMIT 1
),
role = (
    SELECT role 
    FROM user_organizations 
    WHERE user_id = users.id 
    AND is_active = true 
    ORDER BY joined_at ASC 
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE user_id = users.id 
    AND is_active = true
);

-- =============================================
-- STEP 6: Add back foreign key constraint
-- =============================================

ALTER TABLE users ADD CONSTRAINT users_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- =============================================
-- STEP 7: Drop new indexes
-- =============================================

DROP INDEX IF EXISTS idx_user_organizations_user_id;
DROP INDEX IF EXISTS idx_user_organizations_org_id;
DROP INDEX IF EXISTS idx_user_organizations_active;
DROP INDEX IF EXISTS idx_time_entries_organization_id;
DROP INDEX IF EXISTS idx_clients_organization_id;
DROP INDEX IF EXISTS idx_projects_organization_id;

-- =============================================
-- STEP 8: Drop user_organizations table
-- =============================================

DROP TABLE IF EXISTS user_organizations;

-- =============================================
-- STEP 9: Recreate original RLS policies (you'll need to add these back manually)
-- =============================================

-- Note: You'll need to recreate the original RLS policies that were dropped
-- These would typically be similar to the ones that were dropped in the migration

-- Example (you'll need to adjust based on your original policies):
-- CREATE POLICY "Users can view users in their organization" ON users
--     FOR SELECT USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- =============================================
-- STEP 10: Verify rollback
-- =============================================

-- Check that users table has organization_id and role columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'organization_id'
    ) THEN
        RAISE EXCEPTION 'Rollback incomplete: organization_id column missing from users table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        RAISE EXCEPTION 'Rollback incomplete: role column missing from users table';
    END IF;
    
    RAISE NOTICE 'Rollback completed successfully!';
END $$;
