-- =============================================================================
-- WorkSuite — consolidated schema migration
-- =============================================================================
--
-- Replaces the ~25 loose fix-*.sql / add-*.sql files at the repository root
-- with a single ordered, idempotent script. Safe to run more than once and
-- safe to run against a database that already holds production data.
--
-- What this migration does:
--   1. Adds users.email, kept in sync with auth.users (needed to invite people)
--   2. Makes organization_members the single source of truth for membership,
--      migrating anything still living in user_organizations
--   3. Links time entries to projects via time_entries.project_id
--   4. Adds organization_id to the tables that were only scoped indirectly,
--      backfilling and maintaining it with triggers
--   5. Replaces the accumulated RLS policies with one coherent set keyed on
--      organization_members, using SECURITY DEFINER helpers to avoid the
--      recursive-policy problem
--
-- NOTHING IS DROPPED. user_organizations is left in place, untouched, so this
-- migration is reversible; see 002_drop_user_organizations.sql (not applied)
-- once you have confirmed the application is healthy.
--
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

-- =============================================================================
-- 0. PREREQUISITES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- =============================================================================
-- 1. USERS.EMAIL
-- =============================================================================
-- Invites and member lookup need to resolve a person by email. auth.users is
-- not readable from the browser, so the address is mirrored onto public.users.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);

UPDATE public.users u
SET email = au.email
FROM auth.users au
WHERE au.id = u.id
  AND u.email IS DISTINCT FROM au.email;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON public.users(email)
    WHERE email IS NOT NULL;

-- Keep the mirror current on signup and on email change.
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$;

-- auth.users is owned by supabase_auth_admin, so creating a trigger on it can
-- be refused depending on how the project is configured. The backfill above
-- has already run by this point, so a refusal costs only the ongoing sync for
-- future signups — not worth aborting the whole migration over. The notice
-- tells you if that happened.
DO $$
BEGIN
    DROP TRIGGER IF EXISTS sync_user_email_on_auth_change ON auth.users;
    CREATE TRIGGER sync_user_email_on_auth_change
        AFTER INSERT OR UPDATE OF email ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_user_email();
EXCEPTION
    WHEN insufficient_privilege OR undefined_table THEN
        RAISE NOTICE
            'Could not attach sync_user_email to auth.users (%). Existing emails were still backfilled; new signups will need users.email set by the application.',
            SQLERRM;
END;
$$;


-- =============================================================================
-- 2. ORGANIZATION_MEMBERS AS THE SINGLE MEMBERSHIP TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'employee'
        CHECK (role IN ('admin', 'manager', 'employee')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id
    ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
    ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_active
    ON public.organization_members(organization_id, is_active)
    WHERE is_active = true;

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Fold anything still recorded only in user_organizations into the new table.
-- Runs only if that table still exists, so this is safe on fresh databases.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_organizations'
    ) THEN
        INSERT INTO public.organization_members
            (organization_id, user_id, role, is_active, joined_at)
        SELECT uo.organization_id, uo.user_id, uo.role, uo.is_active, uo.joined_at
        FROM public.user_organizations uo
        WHERE uo.organization_id IS NOT NULL
          AND uo.user_id IS NOT NULL
        ON CONFLICT (organization_id, user_id) DO UPDATE SET
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
    END IF;
END;
$$;

-- Every organization needs at least one admin, or nobody can manage members.
-- Any organization whose members are all non-admin gets its earliest joiner
-- promoted.
--
-- This reads organization_members (populated just above) rather than
-- users.organization_id: that column only exists on databases still on the
-- original single-org schema, and is absent once the multi-org migration has
-- been applied.
UPDATE public.organization_members
SET role = 'admin', updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT ON (candidate.organization_id) candidate.id
    FROM public.organization_members candidate
    WHERE candidate.is_active
      AND NOT EXISTS (
          SELECT 1
          FROM public.organization_members existing_admin
          WHERE existing_admin.organization_id = candidate.organization_id
            AND existing_admin.role = 'admin'
            AND existing_admin.is_active
      )
    ORDER BY candidate.organization_id, candidate.joined_at
);


-- =============================================================================
-- 2b. COLUMNS THE APPLICATION EXPECTS
-- =============================================================================
-- Folds in the column additions previously scattered across add-blocked-columns
-- .sql, fix-projects-schema.sql, fix-pipeline-items-table.sql and
-- add-updated-by-to-projects.sql. All are IF NOT EXISTS, so this is a no-op on
-- databases where those scripts already ran.

-- Clients: block / do-not-contact
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS block_reason TEXT,
    ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Projects: fields the Projects module reads
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0
        CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100)),
    ADD COLUMN IF NOT EXISTS route_notes TEXT,
    ADD COLUMN IF NOT EXISTS estimated_duration_hours DECIMAL(8,2),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Pipeline: archive / block state
ALTER TABLE public.pipeline_items
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS block_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_is_blocked ON public.clients(is_blocked);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_is_blocked ON public.pipeline_items(is_blocked);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_stage ON public.pipeline_items(stage);

-- Earlier builds called this concept "blacklisted"; carry that state over.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'clients'
          AND column_name = 'is_blacklisted'
    ) THEN
        UPDATE public.clients
        SET is_blocked = TRUE
        WHERE is_blacklisted = TRUE AND is_blocked IS NOT TRUE;
    END IF;
END;
$$;


-- =============================================================================
-- 3. TIME ENTRIES → PROJECTS
-- =============================================================================
-- Hours previously stored a free-text project_name with no way to roll up to a
-- project. project_id makes that link real; project_name is kept as a
-- historical label so old entries stay readable.

ALTER TABLE public.time_entries
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.time_entries
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_time_entries_project_id
    ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_id
    ON public.time_entries(organization_id);

-- Backfill organization_id from the entry's client, then its user.
UPDATE public.time_entries te
SET organization_id = c.organization_id
FROM public.clients c
WHERE te.client_id = c.id
  AND te.organization_id IS NULL;

UPDATE public.time_entries te
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE om.user_id = te.user_id
  AND om.is_active
  AND te.organization_id IS NULL;

-- Best-effort match of legacy free-text project names to real projects,
-- scoped to the same organization so names cannot collide across tenants.
UPDATE public.time_entries te
SET project_id = p.id
FROM public.projects p
WHERE te.project_id IS NULL
  AND te.project_name IS NOT NULL
  AND te.organization_id = p.organization_id
  AND lower(trim(te.project_name)) = lower(trim(p.name));


-- =============================================================================
-- 4. DIRECT ORGANIZATION SCOPING
-- =============================================================================
-- These tables were reachable only through a join, which made their RLS
-- policies slow and easy to get wrong. Each gets its own organization_id,
-- backfilled from its parent and maintained by a trigger so existing
-- application inserts keep working unchanged.

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.client_activities
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.activity_logs
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.project_clients
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.project_employees
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_org_id ON public.client_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON public.activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_clients_org_id ON public.project_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_employees_org_id ON public.project_employees(organization_id);

UPDATE public.tasks t
SET organization_id = c.organization_id
FROM public.clients c
WHERE t.client_id = c.id AND t.organization_id IS NULL;

UPDATE public.client_activities ca
SET organization_id = c.organization_id
FROM public.clients c
WHERE ca.client_id = c.id AND ca.organization_id IS NULL;

UPDATE public.project_clients pc
SET organization_id = p.organization_id
FROM public.projects p
WHERE pc.project_id = p.id AND pc.organization_id IS NULL;

UPDATE public.project_employees pe
SET organization_id = p.organization_id
FROM public.projects p
WHERE pe.project_id = p.id AND pe.organization_id IS NULL;

UPDATE public.activity_logs al
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE om.user_id = al.user_id AND om.is_active AND al.organization_id IS NULL;

-- Derive organization_id on insert when the application does not supply it.
CREATE OR REPLACE FUNCTION public.set_org_from_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.organization_id IS NULL AND NEW.client_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.clients WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_org_from_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.organization_id IS NULL AND NEW.project_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.projects WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tasks_org ON public.tasks;
CREATE TRIGGER set_tasks_org
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_org_from_client();

DROP TRIGGER IF EXISTS set_client_activities_org ON public.client_activities;
CREATE TRIGGER set_client_activities_org
    BEFORE INSERT OR UPDATE ON public.client_activities
    FOR EACH ROW EXECUTE FUNCTION public.set_org_from_client();

DROP TRIGGER IF EXISTS set_project_clients_org ON public.project_clients;
CREATE TRIGGER set_project_clients_org
    BEFORE INSERT OR UPDATE ON public.project_clients
    FOR EACH ROW EXECUTE FUNCTION public.set_org_from_project();

DROP TRIGGER IF EXISTS set_project_employees_org ON public.project_employees;
CREATE TRIGGER set_project_employees_org
    BEFORE INSERT OR UPDATE ON public.project_employees
    FOR EACH ROW EXECUTE FUNCTION public.set_org_from_project();


-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================
-- All access control now derives from organization_members. The helpers are
-- SECURITY DEFINER so they bypass RLS internally — without that, a policy on
-- organization_members that reads organization_members recurses infinitely.

CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.user_admin_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true AND role = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.user_manages_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager');
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_admin_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_manages_organization_ids() TO authenticated;

-- --- organizations ----------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Admins can update their organization" ON public.organizations
    FOR UPDATE USING (id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (id IN (SELECT public.user_admin_organization_ids()));

-- Signup creates the organization before the membership row exists.
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- --- organization_members ---------------------------------------------------
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view org roster" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can join as first admin" ON public.organization_members;

CREATE POLICY "Members can view org roster" ON public.organization_members
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Admins can manage org members" ON public.organization_members
    FOR ALL USING (organization_id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));

-- Lets the subscriber attach themselves to the organization they just made.
--
-- The emptiness test MUST go through a SECURITY DEFINER function. An inline
-- "SELECT ... FROM organization_members" here makes the policy re-enter
-- itself: 42P17 infinite recursion, which blocks every write to the table
-- including signup. See 004, which supersedes this whole RLS section.
CREATE OR REPLACE FUNCTION public.organization_has_no_members(p_organization_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM public.organization_members WHERE organization_id = p_organization_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.organization_has_no_members(UUID) TO authenticated;

CREATE POLICY "Users can join as first admin" ON public.organization_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND public.organization_has_no_members(organization_id)
    );

-- --- users ------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can view teammate profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Org members can view teammate profiles" ON public.users
    FOR SELECT USING (
        id = auth.uid()
        OR id IN (
            SELECT om.user_id FROM public.organization_members om
            WHERE om.organization_id IN (SELECT public.user_organization_ids())
              AND om.is_active
        )
    );

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (id = auth.uid());

-- --- org-scoped business tables ---------------------------------------------
-- Same shape for every table: read across your organizations, write where you
-- hold admin or manager. Applied in a loop so the rules cannot drift apart.
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'clients', 'contracts', 'projects', 'project_clients',
        'project_employees', 'pipeline_items', 'tasks', 'client_activities'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "org_read_%s" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "org_write_%s" ON public.%I', tbl, tbl);

        EXECUTE format(
            'CREATE POLICY "org_read_%s" ON public.%I FOR SELECT
             USING (organization_id IN (SELECT public.user_organization_ids()))',
            tbl, tbl
        );

        EXECUTE format(
            'CREATE POLICY "org_write_%s" ON public.%I FOR ALL
             USING (organization_id IN (SELECT public.user_manages_organization_ids()))
             WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()))',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- --- time_entries -----------------------------------------------------------
-- Employees own their own hours; managers and admins see and approve the
-- whole organization's.
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view time entries in their organization" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_read" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_own_write" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_manager_write" ON public.time_entries;

CREATE POLICY "time_entries_read" ON public.time_entries
    FOR SELECT USING (
        user_id = auth.uid()
        OR organization_id IN (SELECT public.user_manages_organization_ids())
    );

CREATE POLICY "time_entries_own_write" ON public.time_entries
    FOR ALL USING (
        user_id = auth.uid()
        AND organization_id IN (SELECT public.user_organization_ids())
    )
    WITH CHECK (
        user_id = auth.uid()
        AND organization_id IN (SELECT public.user_organization_ids())
    );

CREATE POLICY "time_entries_manager_write" ON public.time_entries
    FOR ALL USING (organization_id IN (SELECT public.user_manages_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()));

-- --- activity_logs ----------------------------------------------------------
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_logs_read" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;

CREATE POLICY "activity_logs_read" ON public.activity_logs
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "activity_logs_insert" ON public.activity_logs
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND organization_id IN (SELECT public.user_organization_ids())
    );

-- --- subscriptions ----------------------------------------------------------
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_read" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "subscription_admin_write" ON public.organization_subscriptions;

CREATE POLICY "subscription_read" ON public.organization_subscriptions
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "subscription_admin_write" ON public.organization_subscriptions
    FOR ALL USING (organization_id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));

-- Plans are a public catalogue.
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_public_read" ON public.subscription_plans;
CREATE POLICY "plans_public_read" ON public.subscription_plans
    FOR SELECT USING (true);


-- =============================================================================
-- 6. ROUTE PROJECTS VIEW
-- =============================================================================
-- Recreated after the column additions above so it picks up organization_id.
-- security_invoker makes the view honour the caller's RLS rather than the
-- view owner's.

DROP VIEW IF EXISTS public.route_projects CASCADE;

CREATE VIEW public.route_projects
WITH (security_invoker = true) AS
SELECT
    p.*,
    o.name AS organization_name,
    COUNT(DISTINCT pc.client_id) AS assigned_clients_count,
    COUNT(DISTINCT pe.user_id) AS assigned_employees_count,
    STRING_AGG(DISTINCT c.name, ', ') AS client_names,
    STRING_AGG(DISTINCT CONCAT(u.first_name, ' ', u.last_name), ', ') AS employee_names
FROM public.projects p
JOIN public.organizations o ON p.organization_id = o.id
LEFT JOIN public.project_clients pc ON pc.project_id = p.id
LEFT JOIN public.project_employees pe ON pe.project_id = p.id
LEFT JOIN public.clients c ON pc.client_id = c.id
LEFT JOIN public.users u ON pe.user_id = u.id
GROUP BY p.id, o.name;

COMMIT;


-- =============================================================================
-- VERIFICATION — run separately after the migration
-- =============================================================================
--
-- -- Every organization has exactly one membership source and an admin:
-- SELECT o.name,
--        COUNT(*) FILTER (WHERE om.is_active)                   AS members,
--        COUNT(*) FILTER (WHERE om.role = 'admin' AND om.is_active) AS admins
-- FROM organizations o
-- LEFT JOIN organization_members om ON om.organization_id = o.id
-- GROUP BY o.name
-- ORDER BY o.name;
--
-- -- Anything that failed to pick up an organization:
-- SELECT 'time_entries' AS t, COUNT(*) FROM time_entries WHERE organization_id IS NULL
-- UNION ALL SELECT 'tasks', COUNT(*) FROM tasks WHERE organization_id IS NULL
-- UNION ALL SELECT 'client_activities', COUNT(*) FROM client_activities WHERE organization_id IS NULL
-- UNION ALL SELECT 'project_clients', COUNT(*) FROM project_clients WHERE organization_id IS NULL
-- UNION ALL SELECT 'project_employees', COUNT(*) FROM project_employees WHERE organization_id IS NULL;
--
-- -- How many legacy time entries matched a real project by name:
-- SELECT COUNT(*) FILTER (WHERE project_id IS NOT NULL) AS linked,
--        COUNT(*) FILTER (WHERE project_id IS NULL AND project_name IS NOT NULL) AS unmatched
-- FROM time_entries;
--
-- -- Users missing a mirrored email (these cannot be invited by address):
-- SELECT COUNT(*) FROM users WHERE email IS NULL;
