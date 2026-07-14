-- Create pipeline_items table (supports both leads and deals)
CREATE TABLE IF NOT EXISTS pipeline_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'lead' CHECK (type IN ('lead', 'deal')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- Only for deals (existing clients)
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_company TEXT NOT NULL,
  client_phone TEXT,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost')),
  probability INTEGER NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  assigned_to TEXT,
  notes TEXT,
  source TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  archived_at TIMESTAMP WITH TIME ZONE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pipeline_items_organization_id ON pipeline_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_stage ON pipeline_items(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_type ON pipeline_items(type);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_client_id ON pipeline_items(client_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_created_by ON pipeline_items(created_by);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_expected_close_date ON pipeline_items(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_is_archived ON pipeline_items(is_archived);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_is_blocked ON pipeline_items(is_blocked);

-- Enable Row Level Security
ALTER TABLE pipeline_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pipeline_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pipeline_items_updated_at
  BEFORE UPDATE ON pipeline_items
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_items_updated_at();

-- Add comments for documentation
COMMENT ON TABLE pipeline_items IS 'Sales pipeline items including leads (new clients) and deals (existing clients)';
COMMENT ON COLUMN pipeline_items.type IS 'Type of pipeline item: lead (new client) or deal (existing client)';
COMMENT ON COLUMN pipeline_items.client_id IS 'Reference to existing client (only for deals)';
COMMENT ON COLUMN pipeline_items.stage IS 'Current stage in the sales pipeline: lead, qualified, proposal, negotiation, closed-won, closed-lost';
COMMENT ON COLUMN pipeline_items.probability IS 'Probability of closing the deal (0-100%)';
COMMENT ON COLUMN pipeline_items.source IS 'Lead/deal source (e.g., website, referral, cold outreach, existing client)';
COMMENT ON COLUMN pipeline_items.value IS 'Estimated deal value in USD';
COMMENT ON COLUMN pipeline_items.is_archived IS 'Whether the item is archived (hidden from main pipeline)';
COMMENT ON COLUMN pipeline_items.is_blocked IS 'Whether the lead is blocked (do not contact again)';
COMMENT ON COLUMN pipeline_items.block_reason IS 'Reason for blocking the lead';
COMMENT ON COLUMN pipeline_items.archived_at IS 'Timestamp when the item was archived';
