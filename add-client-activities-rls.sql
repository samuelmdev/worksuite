-- Add RLS policies for client_activities table

-- Users can view client activities for clients in their organization
CREATE POLICY "Users can view client activities in their organization" ON client_activities
    FOR SELECT USING (client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- Users can insert client activities for clients in their organization
CREATE POLICY "Users can insert client activities in their organization" ON client_activities
    FOR INSERT WITH CHECK (client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ) AND user_id = auth.uid());

-- Users can update their own client activities
CREATE POLICY "Users can update their own client activities" ON client_activities
    FOR UPDATE USING (user_id = auth.uid() AND client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- Users can delete their own client activities
CREATE POLICY "Users can delete their own client activities" ON client_activities
    FOR DELETE USING (user_id = auth.uid() AND client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));
