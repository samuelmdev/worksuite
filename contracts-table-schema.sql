-- Contracts table for tracking client agreements and revenue
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'monthly', 'yearly', 'one_time', 'hourly', 'project'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'expired', 'cancelled', 'pending'
    
    -- Financial details
    value DECIMAL(12,2) NOT NULL, -- Total contract value
    monthly_value DECIMAL(12,2), -- Monthly recurring value (for MRR contracts)
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Contract period
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renewal BOOLEAN DEFAULT false,
    
    -- Billing details
    billing_frequency VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly', 'one_time', 'quarterly'
    next_billing_date DATE,
    
    -- Assignment and tracking
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    
    -- Additional fields
    notes TEXT,
    terms TEXT, -- Contract terms and conditions
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract activities for tracking changes
CREATE TABLE contract_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'renewed', 'cancelled', 'payment_received'
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_type ON contracts(type);
CREATE INDEX idx_contracts_start_date ON contracts(start_date);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_next_billing_date ON contracts(next_billing_date);

-- RLS Policies
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_activities ENABLE ROW LEVEL SECURITY;

-- Contracts policies
CREATE POLICY "Users can view contracts in their organization" ON contracts
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Managers and admins can manage contracts" ON contracts
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Contract activities policies
CREATE POLICY "Users can view contract activities in their organization" ON contract_activities
    FOR SELECT USING (contract_id IN (
        SELECT id FROM contracts WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "System can insert contract activities" ON contract_activities
    FOR INSERT WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_activities_updated_at BEFORE UPDATE ON contract_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity logging trigger for contracts
CREATE OR REPLACE FUNCTION log_contracts_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_title VARCHAR(255);
  activity_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Contract created';
    activity_description := 'New contract "' || NEW.name || '" was created for client';
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, new_values)
      VALUES (NEW.created_by, 'crm', 'contract', NEW.id, 'created', activity_title, activity_description, row_to_json(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
    
  ELSIF TG_OP = 'UPDATE' THEN
    activity_title := 'Contract updated';
    activity_description := 'Contract "' || NEW.name || '" was updated';
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values, new_values)
      VALUES (NEW.updated_by, 'crm', 'contract', NEW.id, 'updated', activity_title, activity_description, row_to_json(OLD), row_to_json(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_title := 'Contract deleted';
    activity_description := 'Contract "' || OLD.name || '" was deleted';
    
    BEGIN
      INSERT INTO activity_logs (user_id, module, entity_type, entity_id, action, title, description, old_values)
      VALUES (OLD.updated_by, 'crm', 'contract', OLD.id, 'deleted', activity_title, activity_description, row_to_json(OLD));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log activity: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER contracts_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW EXECUTE FUNCTION log_contracts_activity();
