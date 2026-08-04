-- Safe version: Check if tables exist before trying to modify them
-- Fix missing organization_id fields in activity_logs and client_activities tables

-- =====================================================
-- CHECK IF TABLES EXIST FIRST
-- =====================================================

-- Check if activity_logs table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        RAISE NOTICE 'activity_logs table exists';
        
        -- Check if organization_id column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'activity_logs' AND column_name = 'organization_id') THEN
            RAISE NOTICE 'Adding organization_id column to activity_logs';
            
            -- Add organization_id column
            ALTER TABLE activity_logs 
            ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
            
            -- Create index for performance
            CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON activity_logs(organization_id);
            
            -- Populate organization_id for existing activity_logs
            UPDATE activity_logs 
            SET organization_id = (
                SELECT uo.organization_id 
                FROM user_organizations uo 
                WHERE uo.user_id = activity_logs.user_id 
                ORDER BY uo.joined_at ASC 
                LIMIT 1
            )
            WHERE organization_id IS NULL AND user_id IS NOT NULL;
            
            -- For activity_logs without a user_id, try to get organization from the entity
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
            
            RAISE NOTICE 'activity_logs organization_id column added and populated';
        ELSE
            RAISE NOTICE 'activity_logs already has organization_id column';
        END IF;
    ELSE
        RAISE NOTICE 'activity_logs table does not exist - skipping';
    END IF;
END $$;

-- Check if client_activities table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_activities') THEN
        RAISE NOTICE 'client_activities table exists';
        
        -- Check if organization_id column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'client_activities' AND column_name = 'organization_id') THEN
            RAISE NOTICE 'Adding organization_id column to client_activities';
            
            -- Add organization_id column
            ALTER TABLE client_activities 
            ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
            
            -- Create index for performance
            CREATE INDEX IF NOT EXISTS idx_client_activities_organization_id ON client_activities(organization_id);
            
            -- Populate organization_id for existing client_activities
            UPDATE client_activities 
            SET organization_id = (
                SELECT c.organization_id 
                FROM clients c 
                WHERE c.id = client_activities.client_id
            )
            WHERE organization_id IS NULL;
            
            RAISE NOTICE 'client_activities organization_id column added and populated';
        ELSE
            RAISE NOTICE 'client_activities already has organization_id column';
        END IF;
    ELSE
        RAISE NOTICE 'client_activities table does not exist - skipping';
    END IF;
END $$;

-- =====================================================
-- UPDATE RLS POLICIES (SAFE VERSION)
-- =====================================================

-- Update activity_logs policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
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
            
        RAISE NOTICE 'activity_logs RLS policies updated';
    END IF;
END $$;

-- Update client_activities policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_activities') THEN
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
            
        RAISE NOTICE 'client_activities RLS policies updated';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check what tables exist and their structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('activity_logs', 'client_activities')
ORDER BY table_name, ordinal_position;

-- Check if organization_id was added and populated correctly (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        RAISE NOTICE '=== ACTIVITY_LOGS SUMMARY ===';
        PERFORM 1; -- This will execute the query below
    END IF;
END $$;

SELECT 
    'activity_logs' as table_name,
    COUNT(*) as total_records,
    COUNT(organization_id) as records_with_org_id,
    COUNT(*) - COUNT(organization_id) as records_missing_org_id
FROM activity_logs
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs');

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_activities') THEN
        RAISE NOTICE '=== CLIENT_ACTIVITIES SUMMARY ===';
        PERFORM 1; -- This will execute the query below
    END IF;
END $$;

SELECT 
    'client_activities' as table_name,
    COUNT(*) as total_records,
    COUNT(organization_id) as records_with_org_id,
    COUNT(*) - COUNT(organization_id) as records_missing_org_id
FROM client_activities
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_activities');
