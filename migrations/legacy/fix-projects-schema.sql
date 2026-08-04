-- Fix projects table schema for flexible projects and route support
-- This script adds missing fields and ensures multi-org compatibility

-- Add missing fields to projects table
DO $$
BEGIN
    -- Add priority field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'priority') THEN
        ALTER TABLE projects ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
        RAISE NOTICE 'Added priority column to projects table';
    END IF;
    
    -- Add progress field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'progress') THEN
        ALTER TABLE projects ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
        RAISE NOTICE 'Added progress column to projects table';
    END IF;
    
    -- Add route-specific fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'route_notes') THEN
        ALTER TABLE projects ADD COLUMN route_notes TEXT;
        RAISE NOTICE 'Added route_notes column to projects table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'estimated_duration_hours') THEN
        ALTER TABLE projects ADD COLUMN estimated_duration_hours DECIMAL(8,2);
        RAISE NOTICE 'Added estimated_duration_hours column to projects table';
    END IF;
    
    -- Add indexes for better performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_priority') THEN
        CREATE INDEX idx_projects_priority ON projects(priority);
        RAISE NOTICE 'Added priority index to projects table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_progress') THEN
        CREATE INDEX idx_projects_progress ON projects(progress);
        RAISE NOTICE 'Added progress index to projects table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_type_status') THEN
        CREATE INDEX idx_projects_type_status ON projects(type, status);
        RAISE NOTICE 'Added type_status index to projects table';
    END IF;
END $$;

-- Add organization_id to junction tables
DO $$
BEGIN
    -- Add organization_id to project_clients table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_clients' AND column_name = 'organization_id') THEN
        ALTER TABLE project_clients ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added organization_id column to project_clients table';
        
        -- Populate organization_id for existing records
        UPDATE project_clients 
        SET organization_id = p.organization_id
        FROM projects p
        WHERE project_clients.project_id = p.id
        AND project_clients.organization_id IS NULL;
        
        -- Make organization_id NOT NULL after populating
        ALTER TABLE project_clients ALTER COLUMN organization_id SET NOT NULL;
        
        -- Add index for performance
        CREATE INDEX idx_project_clients_organization_id ON project_clients(organization_id);
        RAISE NOTICE 'Populated organization_id in project_clients table';
    END IF;
    
    -- Add organization_id to project_employees table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_employees' AND column_name = 'organization_id') THEN
        ALTER TABLE project_employees ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added organization_id column to project_employees table';
        
        -- Populate organization_id for existing records
        UPDATE project_employees 
        SET organization_id = p.organization_id
        FROM projects p
        WHERE project_employees.project_id = p.id
        AND project_employees.organization_id IS NULL;
        
        -- Make organization_id NOT NULL after populating
        ALTER TABLE project_employees ALTER COLUMN organization_id SET NOT NULL;
        
        -- Add index for performance
        CREATE INDEX idx_project_employees_organization_id ON project_employees(organization_id);
        RAISE NOTICE 'Populated organization_id in project_employees table';
    END IF;
END $$;

-- Update project_employees table to support route-specific roles
DO $$
BEGIN
    -- Add route-specific role options
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_employees' AND column_name = 'role') THEN
        -- Update existing roles to include route-specific ones
        UPDATE project_employees 
        SET role = CASE 
            WHEN role = 'worker' THEN 'worker'
            WHEN role = 'manager' THEN 'manager'
            WHEN role = 'observer' THEN 'observer'
            ELSE 'worker'
        END
        WHERE role NOT IN ('worker', 'manager', 'observer', 'route_leader', 'route_driver');
        
        RAISE NOTICE 'Updated project_employees roles';
    END IF;
END $$;

-- Create view for project analytics with route support
DROP VIEW IF EXISTS project_analytics CASCADE;

CREATE VIEW project_analytics AS
SELECT 
    p.id as project_id,
    p.organization_id,
    p.name as project_name,
    p.type as project_type,
    p.status as project_status,
    p.priority as project_priority,
    p.progress as project_progress,
    p.budget,
    p.hourly_rate as project_hourly_rate,
    p.route_notes,
    p.estimated_duration_hours,
    o.name as organization_name,
    COUNT(DISTINCT pc.client_id) as total_clients,
    COUNT(DISTINCT pe.user_id) as total_employees,
    COUNT(DISTINCT te.id) as total_time_entries,
    COALESCE(SUM(te.billable_hours), 0) as total_billable_hours,
    COALESCE(SUM(te.billable_hours * te.hourly_rate), 0) as total_revenue,
    COALESCE(AVG(te.billable_hours), 0) as avg_hours_per_entry,
    -- Route-specific analytics
    CASE 
        WHEN p.type = 'route' THEN 'Route Project'
        WHEN p.type = 'general' THEN 'General Project'
        WHEN p.type = 'internal' THEN 'Internal Project'
        WHEN p.type = 'external' THEN 'External Project'
        ELSE 'Unknown Type'
    END as project_type_label
FROM projects p
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN project_clients pc ON pc.project_id = p.id
LEFT JOIN project_employees pe ON pe.project_id = p.id
LEFT JOIN time_entries te ON te.project_id = p.id AND te.status = 'approved'
GROUP BY p.id, p.organization_id, p.name, p.type, p.status, p.priority, p.progress, p.budget, p.hourly_rate, p.route_notes, p.estimated_duration_hours, o.name;

-- Create view for route-specific project data
DROP VIEW IF EXISTS route_projects CASCADE;
CREATE VIEW route_projects AS
SELECT 
    p.*,
    o.name as organization_name,
    COUNT(DISTINCT pc.client_id) as assigned_clients_count,
    COUNT(DISTINCT pe.user_id) as assigned_employees_count,
    STRING_AGG(DISTINCT c.name, ', ') as client_names,
    STRING_AGG(DISTINCT CONCAT(u.first_name, ' ', u.last_name), ', ') as employee_names
FROM projects p
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN project_clients pc ON pc.project_id = p.id
LEFT JOIN project_employees pe ON pe.project_id = p.id
LEFT JOIN clients c ON pc.client_id = c.id
LEFT JOIN users u ON pe.user_id = u.id
WHERE p.type = 'route'
GROUP BY p.id, p.organization_id, o.name;

-- Add RLS policies for projects (if not already exist)
DO $$
BEGIN
    -- Check if RLS is enabled
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'projects' AND relrowsecurity = true) THEN
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on projects table';
    END IF;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view projects in their organization" ON projects;
    DROP POLICY IF EXISTS "Managers and admins can manage projects" ON projects;
    DROP POLICY IF EXISTS "Service role can manage all projects" ON projects;
    
    -- Create new RLS policies for multi-org support
    CREATE POLICY "Users can view projects in their organization" ON projects
        FOR SELECT USING (
            organization_id IN (
                SELECT uo.organization_id 
                FROM user_organizations uo 
                WHERE uo.user_id = auth.uid() AND uo.is_active = true
            )
        );
    
    CREATE POLICY "Managers and admins can manage projects" ON projects
        FOR ALL USING (
            organization_id IN (
                SELECT uo.organization_id 
                FROM user_organizations uo 
                WHERE uo.user_id = auth.uid() 
                AND uo.is_active = true 
                AND uo.role IN ('admin', 'manager')
            )
        );
    
    -- Allow service role to manage all projects
    CREATE POLICY "Service role can manage all projects" ON projects
        FOR ALL USING (auth.role() = 'service_role');
    
    RAISE NOTICE 'Created RLS policies for projects table';
END $$;

-- Add RLS policies for project_clients and project_employees
DO $$
BEGIN
    -- Enable RLS on junction tables
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'project_clients' AND relrowsecurity = true) THEN
        ALTER TABLE project_clients ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on project_clients table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'project_employees' AND relrowsecurity = true) THEN
        ALTER TABLE project_employees ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on project_employees table';
    END IF;
    
    -- Create policies for project_clients
    DROP POLICY IF EXISTS "Users can view project clients in their organization" ON project_clients;
    DROP POLICY IF EXISTS "Managers and admins can manage project clients" ON project_clients;
    
    CREATE POLICY "Users can view project clients in their organization" ON project_clients
        FOR SELECT USING (
            organization_id IN (
                SELECT uo.organization_id 
                FROM user_organizations uo 
                WHERE uo.user_id = auth.uid() AND uo.is_active = true
            )
        );
    
    CREATE POLICY "Managers and admins can manage project clients" ON project_clients
        FOR ALL USING (
            organization_id IN (
                SELECT uo.organization_id 
                FROM user_organizations uo 
                WHERE uo.user_id = auth.uid() 
                AND uo.is_active = true 
                AND uo.role IN ('admin', 'manager')
            )
        );
    
    -- Create policies for project_employees
    DROP POLICY IF EXISTS "Users can view project employees in their organization" ON project_employees;
    DROP POLICY IF EXISTS "Users can view their own project assignments" ON project_employees;
    DROP POLICY IF EXISTS "Managers and admins can manage project employees" ON project_employees;
    
    CREATE POLICY "Users can view project employees in their organization" ON project_employees
        FOR SELECT USING (
            organization_id IN (
                SELECT uo.organization_id 
                FROM user_organizations uo 
                WHERE uo.user_id = auth.uid() AND uo.is_active = true
            )
        );
    
    CREATE POLICY "Users can view their own project assignments" ON project_employees
        FOR SELECT USING (user_id = auth.uid());
    
    CREATE POLICY "Managers and admins can manage project employees" ON project_employees
        FOR ALL USING (
            organization_id IN (
                SELECT uo.organization_id 
                FROM user_organizations uo 
                WHERE uo.user_id = auth.uid() 
                AND uo.is_active = true 
                AND uo.role IN ('admin', 'manager')
            )
        );
    
    RAISE NOTICE 'Created RLS policies for project junction tables';
END $$;

-- Add updated_at trigger to projects table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
        CREATE TRIGGER update_projects_updated_at 
            BEFORE UPDATE ON projects 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added updated_at trigger to projects table';
    END IF;
END $$;

-- Insert some sample route projects for testing
DO $$
DECLARE
    sample_org_id UUID;
    sample_user_id UUID;
BEGIN
    -- Get the first organization and user for sample data
    SELECT id INTO sample_org_id FROM organizations LIMIT 1;
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    -- Only insert if we have both org and user, and projects don't already exist
    IF sample_org_id IS NOT NULL AND sample_user_id IS NOT NULL THEN
        -- Insert Monday Morning Route (only if it doesn't exist)
        IF NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Monday Morning Route' AND organization_id = sample_org_id) THEN
            INSERT INTO projects (organization_id, name, description, type, status, priority, start_date, end_date, budget, hourly_rate, progress, route_notes, estimated_duration_hours, created_by)
            VALUES (
                sample_org_id,
                'Monday Morning Route',
                'Regular Monday morning delivery route covering downtown area',
                'route',
                'active',
                'high',
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '1 month',
                5000.00,
                25.00,
                0,
                'Start at warehouse, cover 15 stops in downtown area. Estimated 4 hours.',
                4.0,
                sample_user_id
            );
        END IF;
        
        -- Insert Website Redesign Project (only if it doesn't exist)
        IF NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Website Redesign Project' AND organization_id = sample_org_id) THEN
            INSERT INTO projects (organization_id, name, description, type, status, priority, start_date, end_date, budget, hourly_rate, progress, route_notes, estimated_duration_hours, created_by)
            VALUES (
                sample_org_id,
                'Website Redesign Project',
                'Complete redesign of the company website with modern UI/UX',
                'general',
                'active',
                'medium',
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '2 months',
                25000.00,
                75.00,
                65,
                NULL,
                200.0,
                sample_user_id
            );
        END IF;
        
        RAISE NOTICE 'Sample projects inserted successfully';
    ELSE
        RAISE NOTICE 'No organizations or users found, skipping sample data insertion';
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Projects schema updated successfully with route support!';
END $$;
