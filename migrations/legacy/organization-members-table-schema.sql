-- Organization members table (Team module roster)
-- Run in Supabase SQL Editor

-- =============================================
-- TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'employee'
        CHECK (role IN ('admin', 'manager', 'employee')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id
    ON organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
    ON organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_active
    ON organization_members(organization_id, is_active)
    WHERE is_active = true;

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- If table already exists with auth.users FK, run this once:
-- ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;
-- ALTER TABLE organization_members ADD CONSTRAINT organization_members_user_id_fkey
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =============================================
-- MIGRATE EXISTING MEMBERS FROM user_organizations
-- =============================================

INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
SELECT
    uo.organization_id,
    uo.user_id,
    uo.role,
    uo.is_active,
    uo.joined_at
FROM user_organizations uo
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view org roster" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;
DROP POLICY IF EXISTS "Service role full access organization_members" ON organization_members;

-- Any active member of the org can view the team roster
CREATE POLICY "Members can view org roster" ON organization_members
    FOR SELECT
    USING (
        organization_id IN (
            SELECT uo.organization_id
            FROM user_organizations uo
            WHERE uo.user_id = auth.uid()
              AND uo.is_active = true
        )
    );

-- Org admins can insert/update/delete members (via user_organizations admin role)
CREATE POLICY "Admins can manage org members" ON organization_members
    FOR ALL
    USING (
        organization_id IN (
            SELECT uo.organization_id
            FROM user_organizations uo
            WHERE uo.user_id = auth.uid()
              AND uo.role = 'admin'
              AND uo.is_active = true
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT uo.organization_id
            FROM user_organizations uo
            WHERE uo.user_id = auth.uid()
              AND uo.role = 'admin'
              AND uo.is_active = true
        )
    );

-- =============================================
-- ADD YOURSELF AS ADMIN (replace email)
-- =============================================

-- Step 1: Inspect your user + org
-- SELECT au.id, au.email, o.id AS org_id, o.name
-- FROM auth.users au
-- JOIN user_organizations uo ON uo.user_id = au.id
-- JOIN organizations o ON o.id = uo.organization_id
-- WHERE au.email = 'your-email@example.com';

-- Step 2: Insert / promote in organization_members
INSERT INTO organization_members (organization_id, user_id, role, is_active)
SELECT
    uo.organization_id,
    au.id,
    'admin',
    true
FROM auth.users au
JOIN user_organizations uo ON uo.user_id = au.id AND uo.is_active = true
WHERE au.email = 'your-email@example.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    updated_at = NOW();

-- Step 3: Keep auth membership in sync (app nav / permissions)
UPDATE user_organizations uo
SET role = 'admin', is_active = true, updated_at = NOW()
FROM auth.users au
WHERE uo.user_id = au.id
  AND au.email = 'your-email@example.com';

-- =============================================
-- ALLOW TEAM ROSTER TO READ USER NAMES
-- =============================================

DROP POLICY IF EXISTS "Org members can view teammate profiles" ON users;

CREATE POLICY "Org members can view teammate profiles" ON users
    FOR SELECT
    USING (
        id = auth.uid()
        OR id IN (
            SELECT om.user_id
            FROM organization_members om
            WHERE om.organization_id IN (
                SELECT uo.organization_id
                FROM user_organizations uo
                WHERE uo.user_id = auth.uid()
                  AND uo.is_active = true
            )
            AND om.is_active = true
        )
    );
