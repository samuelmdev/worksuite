-- Fix ALL RLS policies to work with new multi-organization architecture
-- The old policies were looking for users.organization_id which no longer exists

-- =====================================================
-- CONTRACTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view contracts in their organization" ON contracts;
DROP POLICY IF EXISTS "Managers and admins can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view contract activities in their organization" ON contract_activities;
DROP POLICY IF EXISTS "System can insert contract activities" ON contract_activities;

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

CREATE POLICY "Users can view contract activities in their organization" ON contract_activities
    FOR SELECT USING (contract_id IN (
        SELECT id 
        FROM contracts 
        WHERE organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "System can insert contract activities" ON contract_activities
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- CLIENTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
DROP POLICY IF EXISTS "Managers and admins can manage clients" ON clients;
DROP POLICY IF EXISTS "Users can view client activities in their organization" ON client_activities;
DROP POLICY IF EXISTS "Users can insert client activities in their organization" ON client_activities;
DROP POLICY IF EXISTS "Users can update their own client activities" ON client_activities;
DROP POLICY IF EXISTS "Users can delete their own client activities" ON client_activities;

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
-- PROJECTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view projects in their organization" ON projects;
DROP POLICY IF EXISTS "Managers and admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Users can view project clients in their organization" ON project_clients;
DROP POLICY IF EXISTS "Managers and admins can manage project clients" ON project_clients;
DROP POLICY IF EXISTS "Users can view project employees in their organization" ON project_employees;
DROP POLICY IF EXISTS "Managers and admins can manage project employees" ON project_employees;

CREATE POLICY "Users can view projects in their organization" ON projects
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Managers and admins can manage projects" ON projects
    FOR ALL USING (organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo
        WHERE uo.user_id = auth.uid() 
        AND uo.role IN ('admin', 'manager')
    ));

CREATE POLICY "Users can view project clients in their organization" ON project_clients
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Managers and admins can manage project clients" ON project_clients
    FOR ALL USING (organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo
        WHERE uo.user_id = auth.uid() 
        AND uo.role IN ('admin', 'manager')
    ));

CREATE POLICY "Users can view project employees in their organization" ON project_employees
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Managers and admins can manage project employees" ON project_employees
    FOR ALL USING (organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo
        WHERE uo.user_id = auth.uid() 
        AND uo.role IN ('admin', 'manager')
    ));

-- =====================================================
-- PIPELINE ITEMS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can insert pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can update pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can delete pipeline items in their organization" ON pipeline_items;

CREATE POLICY "Users can view pipeline items in their organization" ON pipeline_items
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert pipeline items in their organization" ON pipeline_items
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update pipeline items in their organization" ON pipeline_items
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete pipeline items in their organization" ON pipeline_items
    FOR DELETE USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

-- =====================================================
-- ACTIVITY LOGS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view activity logs in their organization" ON activity_logs;

CREATE POLICY "Users can view activity logs in their organization" ON activity_logs
    FOR SELECT USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

-- =====================================================
-- SUBSCRIPTION PLANS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "System admins can manage subscription plans" ON subscription_plans;

CREATE POLICY "System admins can manage subscription plans" ON subscription_plans
    FOR ALL USING (organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo
        WHERE uo.user_id = auth.uid() 
        AND uo.role IN ('admin', 'system_admin')
    ));

-- =====================================================
-- VERIFICATION QUERIES
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
)

UNION ALL

SELECT 
    'projects' as table_name,
    COUNT(*) as accessible_records
FROM projects 
WHERE organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
);
