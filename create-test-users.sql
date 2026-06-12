-- Create Test Users for WorkSuite
-- This script sets up test users: admin, manager, and employee
-- 
-- IMPORTANT: You must first create these users in Supabase Auth dashboard:
-- 1. Go to Authentication > Users in Supabase dashboard
-- 2. Create users with these emails:
--    - admin@worksuite.com
--    - manager@worksuite.com  
--    - employee@worksuite.com
-- 3. Set password to "password" for all three
-- 4. Then run this script to set up their profiles and organizations

-- Create a test organization
DO $$
DECLARE
    test_org_id UUID;
    admin_user_id UUID;
    manager_user_id UUID;
    employee_user_id UUID;
BEGIN
    -- Create test organization (if it doesn't exist)
    INSERT INTO organizations (name, slug, email)
    VALUES ('Test Organization', 'test-organization', 'test@worksuite.com')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO test_org_id;
    
    -- If organization already exists, get its ID
    IF test_org_id IS NULL THEN
        SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-organization';
    END IF;
    
    -- Get user IDs from auth.users (these must exist first!)
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@worksuite.com';
    SELECT id INTO manager_user_id FROM auth.users WHERE email = 'manager@worksuite.com';
    SELECT id INTO employee_user_id FROM auth.users WHERE email = 'employee@worksuite.com';
    
    -- Create admin user profile
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO users (id, first_name, last_name)
        VALUES (admin_user_id, 'Admin', 'User')
        ON CONFLICT (id) DO UPDATE SET
            first_name = 'Admin',
            last_name = 'User';
            
        -- Link admin to organization
        INSERT INTO user_organizations (user_id, organization_id, role, is_active)
        VALUES (admin_user_id, test_org_id, 'admin', true)
        ON CONFLICT (user_id, organization_id) DO UPDATE SET
            role = 'admin',
            is_active = true;
    ELSE
        RAISE NOTICE 'Admin user not found in auth.users. Please create admin@worksuite.com in Supabase Auth first.';
    END IF;
    
    -- Create manager user profile
    IF manager_user_id IS NOT NULL THEN
        INSERT INTO users (id, first_name, last_name)
        VALUES (manager_user_id, 'Manager', 'User')
        ON CONFLICT (id) DO UPDATE SET
            first_name = 'Manager',
            last_name = 'User';
            
        -- Link manager to organization
        INSERT INTO user_organizations (user_id, organization_id, role, is_active)
        VALUES (manager_user_id, test_org_id, 'manager', true)
        ON CONFLICT (user_id, organization_id) DO UPDATE SET
            role = 'manager',
            is_active = true;
    ELSE
        RAISE NOTICE 'Manager user not found in auth.users. Please create manager@worksuite.com in Supabase Auth first.';
    END IF;
    
    -- Create employee user profile
    IF employee_user_id IS NOT NULL THEN
        INSERT INTO users (id, first_name, last_name)
        VALUES (employee_user_id, 'Employee', 'User')
        ON CONFLICT (id) DO UPDATE SET
            first_name = 'Employee',
            last_name = 'User';
            
        -- Link employee to organization
        INSERT INTO user_organizations (user_id, organization_id, role, is_active)
        VALUES (employee_user_id, test_org_id, 'employee', true)
        ON CONFLICT (user_id, organization_id) DO UPDATE SET
            role = 'employee',
            is_active = true;
    ELSE
        RAISE NOTICE 'Employee user not found in auth.users. Please create employee@worksuite.com in Supabase Auth first.';
    END IF;
    
    RAISE NOTICE 'Test users setup complete!';
END $$;

