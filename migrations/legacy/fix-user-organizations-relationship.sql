-- Fix user_organizations table and foreign key relationships
-- This script ensures the user_organizations table exists and has proper foreign keys

-- First, check if user_organizations table exists, if not create it
DO $$
BEGIN
    -- Check if user_organizations table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_organizations') THEN
        -- Create user_organizations junction table
        CREATE TABLE user_organizations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            role VARCHAR(50) DEFAULT 'employee', -- admin, manager, employee
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, organization_id)
        );
        
        -- Add indexes for performance
        CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
        CREATE INDEX idx_user_organizations_organization_id ON user_organizations(organization_id);
        CREATE INDEX idx_user_organizations_role ON user_organizations(role);
        
        -- Enable RLS
        ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for user_organizations
        CREATE POLICY "Users can view their own organization memberships" ON user_organizations
            FOR SELECT USING (user_id = auth.uid());
            
        CREATE POLICY "Users can view organization memberships in their organizations" ON user_organizations
            FOR SELECT USING (organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            ));
            
        CREATE POLICY "Admins can manage organization memberships" ON user_organizations
            FOR ALL USING (user_id IN (
                SELECT uo.user_id FROM user_organizations uo 
                WHERE uo.organization_id = user_organizations.organization_id 
                AND uo.role IN ('admin')
            ));
            
        -- Allow service role to manage all
        CREATE POLICY "Service role can manage all user_organizations" ON user_organizations
            FOR ALL USING (auth.role() = 'service_role');
            
        RAISE NOTICE 'Created user_organizations table';
    ELSE
        RAISE NOTICE 'user_organizations table already exists';
    END IF;
END $$;

-- Check if we need to migrate data from users.organization_id to user_organizations
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Check if the users table still has organization_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organization_id') THEN
        -- Check if there are users with organization_id that don't have corresponding user_organizations entries
        SELECT COUNT(*) INTO user_count
        FROM users u
        LEFT JOIN user_organizations uo ON u.id = uo.user_id AND u.organization_id = uo.organization_id
        WHERE u.organization_id IS NOT NULL AND uo.id IS NULL;
        
        IF user_count > 0 THEN
            RAISE NOTICE 'Found % users with organization_id but no user_organizations entry. Migrating...', user_count;
            
            -- Migrate users with organization_id to user_organizations
            INSERT INTO user_organizations (user_id, organization_id, role, joined_at)
            SELECT 
                u.id,
                u.organization_id,
                COALESCE(u.role, 'employee'),
                COALESCE(u.created_at, NOW())
            FROM users u
            LEFT JOIN user_organizations uo ON u.id = uo.user_id AND u.organization_id = uo.organization_id
            WHERE u.organization_id IS NOT NULL AND uo.id IS NULL;
            
            RAISE NOTICE 'Migrated % users to user_organizations', user_count;
        ELSE
            RAISE NOTICE 'No users need migration to user_organizations';
        END IF;
    ELSE
        RAISE NOTICE 'users.organization_id column does not exist - migration not needed';
    END IF;
END $$;

-- Create views that use the new user_organizations table
DO $$
BEGIN
    -- Drop existing views if they exist
    DROP VIEW IF EXISTS user_primary_organization CASCADE;
    DROP VIEW IF EXISTS user_organizations_view CASCADE;
    
    -- Create user_primary_organization view
    CREATE VIEW user_primary_organization AS
    SELECT DISTINCT ON (uo.user_id)
        uo.user_id,
        uo.organization_id,
        uo.role,
        uo.joined_at,
        u.first_name,
        u.last_name,
        au.email
    FROM user_organizations uo
    JOIN auth.users au ON uo.user_id = au.id
    LEFT JOIN users u ON uo.user_id = u.id
    WHERE uo.is_active = true
    ORDER BY uo.user_id, uo.joined_at ASC;
    
    -- Create user_organizations_view
    CREATE VIEW user_organizations_view AS
    SELECT 
        uo.id,
        uo.user_id,
        uo.organization_id,
        uo.role,
        uo.joined_at,
        uo.is_active,
        u.first_name,
        u.last_name,
        au.email,
        o.name as organization_name
    FROM user_organizations uo
    JOIN auth.users au ON uo.user_id = au.id
    LEFT JOIN users u ON uo.user_id = u.id
    JOIN organizations o ON uo.organization_id = o.id;
    
    RAISE NOTICE 'Created user_organizations views';
END $$;

-- Add updated_at trigger to user_organizations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_organizations_updated_at') THEN
        CREATE TRIGGER update_user_organizations_updated_at 
            BEFORE UPDATE ON user_organizations 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added updated_at trigger to user_organizations';
    END IF;
END $$;
