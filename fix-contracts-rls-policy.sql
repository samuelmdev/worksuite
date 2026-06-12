-- Fix contracts RLS policies to work with new multi-organization architecture
-- The old policies were looking for users.organization_id which no longer exists

-- Drop the old policies
DROP POLICY IF EXISTS "Users can view contracts in their organization" ON contracts;
DROP POLICY IF EXISTS "Managers and admins can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view contract activities in their organization" ON contract_activities;
DROP POLICY IF EXISTS "System can insert contract activities" ON contract_activities;

-- Create new policies that work with the user_organizations junction table
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

-- Contract activities policies
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

-- Test the policies by checking if the current user can access contracts
-- This should return the contracts for the user's organization
SELECT 
    c.id,
    c.name,
    c.organization_id,
    c.status
FROM contracts c
WHERE c.organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
)
ORDER BY c.created_at DESC;
