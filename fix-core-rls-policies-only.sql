-- Fix only the core RLS policies for the main tables
-- This focuses on contracts, clients, time_entries, and projects only

-- =====================================================
-- CONTRACTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view contracts in their organization" ON contracts;
DROP POLICY IF EXISTS "Managers and admins can manage contracts" ON contracts;

CREATE POLICY "Users can view contracts in their organization" ON contracts
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Managers and admins can manage contracts" ON contracts
    FOR ALL USING (organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo
        WHERE uo.user_id = auth.uid() 
        AND uo.role IN ('admin', 'manager')
    ));

-- =====================================================
-- CLIENTS POLICIES  
-- =====================================================
DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
DROP POLICY IF EXISTS "Managers and admins can manage clients" ON clients;

CREATE POLICY "Users can view clients in their organization" ON clients
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Managers and admins can manage clients" ON clients
    FOR ALL USING (organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo
        WHERE uo.user_id = auth.uid() 
        AND uo.role IN ('admin', 'manager')
    ));

-- =====================================================
-- TIME ENTRIES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers and admins can delete time entries" ON time_entries;

CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Managers and admins can delete time entries" ON time_entries
    FOR DELETE USING (organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo
        WHERE uo.user_id = auth.uid() 
        AND uo.role IN ('admin', 'manager')
    ));

-- =====================================================
-- ACTIVITY LOGS POLICIES (if table exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        DROP POLICY IF EXISTS "Users can view activity logs in their organization" ON activity_logs;
        DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;
        
        CREATE POLICY "Users can view activity logs in their organization" ON activity_logs
            FOR SELECT USING (organization_id IN (
                SELECT organization_id 
                FROM user_organizations 
                WHERE user_id = auth.uid()
            ));
        
        CREATE POLICY "System can insert activity logs" ON activity_logs
            FOR INSERT WITH CHECK (true);
            
        RAISE NOTICE 'activity_logs policies updated';
    ELSE
        RAISE NOTICE 'activity_logs table does not exist - skipping policies';
    END IF;
END $$;

-- =====================================================
-- CLIENT ACTIVITIES POLICIES (if table exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_activities') THEN
        DROP POLICY IF EXISTS "Users can view client activities in their organization" ON client_activities;
        DROP POLICY IF EXISTS "Users can insert client activities in their organization" ON client_activities;
        DROP POLICY IF EXISTS "Users can update their own client activities" ON client_activities;
        DROP POLICY IF EXISTS "Users can delete their own client activities" ON client_activities;
        
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
            
        RAISE NOTICE 'client_activities policies updated';
    ELSE
        RAISE NOTICE 'client_activities table does not exist - skipping policies';
    END IF;
END $$;

-- =====================================================
-- TEST THE POLICIES
-- =====================================================

-- Test if the current user can access their organization's data
SELECT 
    'contracts' as table_name,
    COUNT(*) as accessible_records
FROM contracts 
WHERE organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
)

UNION ALL

SELECT 
    'clients' as table_name,
    COUNT(*) as accessible_records
FROM clients 
WHERE organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
)

UNION ALL

SELECT 
    'time_entries' as table_name,
    COUNT(*) as accessible_records
FROM time_entries 
WHERE organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
);
