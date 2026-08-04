-- Restore pipeline_items RLS policies for multi-org architecture.
-- Run this in Supabase SQL Editor if pipeline create/update fails with RLS errors.

ALTER TABLE pipeline_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can insert pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can update pipeline items in their organization" ON pipeline_items;
DROP POLICY IF EXISTS "Users can delete pipeline items in their organization" ON pipeline_items;

CREATE POLICY "Users can view pipeline items in their organization" ON pipeline_items
    FOR SELECT USING (organization_id IN (
        SELECT organization_id
        FROM user_organizations
        WHERE user_id = auth.uid()
          AND is_active = true
    ));

CREATE POLICY "Users can insert pipeline items in their organization" ON pipeline_items
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id
        FROM user_organizations
        WHERE user_id = auth.uid()
          AND is_active = true
    ));

CREATE POLICY "Users can update pipeline items in their organization" ON pipeline_items
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id
        FROM user_organizations
        WHERE user_id = auth.uid()
          AND is_active = true
    ));

CREATE POLICY "Users can delete pipeline items in their organization" ON pipeline_items
    FOR DELETE USING (organization_id IN (
        SELECT organization_id
        FROM user_organizations
        WHERE user_id = auth.uid()
          AND is_active = true
    ));
