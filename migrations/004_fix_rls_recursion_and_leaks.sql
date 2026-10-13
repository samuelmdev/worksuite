-- =============================================================================
-- WorkSuite — repair RLS: policy leaks and infinite recursion
-- =============================================================================
--
-- Run AFTER 001 and 003. Idempotent and non-destructive to data.
--
-- Fixes two defects in the RLS written by 001 and 003, both found by probing
-- the live database rather than reading the files:
--
--   1. LEAK — 001 dropped old policies by name only. Databases configured by
--      the earlier fix-*-rls-*.sql scripts carry policies under different
--      names, and Postgres ORs permissive policies together, so a surviving
--      "USING (true)" defeated every policy added afterwards. Observed:
--      public.organizations returned rows to an anonymous caller.
--
--      This migration drops EVERY policy on the tables in scope, by
--      enumerating pg_policies, then recreates the intended set. That makes
--      this file the single authority on RLS regardless of what came before.
--
--   2. RECURSION — the "Users can join as first admin" policy on
--      organization_members contained a subquery against organization_members
--      itself, so evaluating the policy re-entered the policy:
--      42P17 "infinite recursion detected in policy". This broke every write
--      to the table, including signup. The emptiness test now lives in a
--      SECURITY DEFINER function, which does not re-enter RLS.
--
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. HELPERS
-- =============================================================================
-- SECURITY DEFINER so they bypass RLS internally. Any policy that needs to
-- consult organization_members MUST go through one of these, never an inline
-- subquery, or it recurses.

CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.user_admin_organization_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true AND role = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.user_manages_organization_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.user_sells_organization_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('admin', 'manager', 'sales_rep');
$$;

-- Replaces the inline subquery that caused the recursion.
CREATE OR REPLACE FUNCTION public.organization_has_no_members(p_organization_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM public.organization_members WHERE organization_id = p_organization_id
    );
$$;

-- Everyone sharing an organization with the caller. Keeps the users policy
-- from querying organization_members inline.
CREATE OR REPLACE FUNCTION public.user_teammate_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT DISTINCT om.user_id
    FROM public.organization_members om
    WHERE om.is_active = true
      AND om.organization_id IN (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid() AND is_active = true
      );
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_admin_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_manages_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_sells_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.organization_has_no_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_teammate_ids() TO authenticated;


-- =============================================================================
-- 2. CLEAR EVERY EXISTING POLICY IN SCOPE
-- =============================================================================
-- By enumeration, not by name. This is what 001 should have done.

DO $$
DECLARE
    target TEXT;
    pol RECORD;
    tables TEXT[] := ARRAY[
        'organizations', 'organization_members', 'users',
        'clients', 'contracts', 'pipeline_items', 'tasks', 'client_activities',
        'projects', 'project_clients', 'project_employees',
        'time_entries', 'activity_logs',
        'commission_rules', 'member_compensation', 'commissions', 'bonuses',
        'invoices', 'invoice_line_items',
        'finance_categories', 'finance_transactions',
        'organization_subscriptions', 'subscription_plans', 'billing_history'
    ];
BEGIN
    FOREACH target IN ARRAY tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = target
        ) THEN
            RAISE NOTICE 'Skipping %, table not present', target;
            CONTINUE;
        END IF;

        FOR pol IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = target
        LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, target);
        END LOOP;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    END LOOP;
END;
$$;


-- =============================================================================
-- 3. ORGANIZATIONS
-- =============================================================================

CREATE POLICY "organizations_read" ON public.organizations
    FOR SELECT USING (id IN (SELECT public.user_organization_ids()));

CREATE POLICY "organizations_admin_update" ON public.organizations
    FOR UPDATE USING (id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (id IN (SELECT public.user_admin_organization_ids()));

-- Signup creates the organization before any membership row exists.
CREATE POLICY "organizations_insert" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================================================
-- 4. ORGANIZATION_MEMBERS
-- =============================================================================

CREATE POLICY "organization_members_read" ON public.organization_members
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "organization_members_admin_all" ON public.organization_members
    FOR ALL USING (organization_id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));

-- The subscriber attaching themselves to the organization they just created.
-- organization_has_no_members() is SECURITY DEFINER; an inline EXISTS here is
-- what caused 42P17.
CREATE POLICY "organization_members_first_admin_insert" ON public.organization_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND public.organization_has_no_members(organization_id)
    );


-- =============================================================================
-- 5. USERS
-- =============================================================================

CREATE POLICY "users_read" ON public.users
    FOR SELECT USING (
        id = auth.uid() OR id IN (SELECT public.user_teammate_ids())
    );

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (id = auth.uid());


-- =============================================================================
-- 6. CRM  (sales reps write, everyone in the org reads)
-- =============================================================================

DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY['clients', 'contracts', 'pipeline_items', 'tasks', 'client_activities']
    LOOP
        EXECUTE format(
            'CREATE POLICY "org_read_%s" ON public.%I FOR SELECT
             USING (organization_id IN (SELECT public.user_organization_ids()))',
            target, target);
        EXECUTE format(
            'CREATE POLICY "org_write_%s" ON public.%I FOR ALL
             USING (organization_id IN (SELECT public.user_sells_organization_ids()))
             WITH CHECK (organization_id IN (SELECT public.user_sells_organization_ids()))',
            target, target);
    END LOOP;
END;
$$;


-- =============================================================================
-- 7. DELIVERY  (managers and admins write)
-- =============================================================================

DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY['projects', 'project_clients', 'project_employees']
    LOOP
        EXECUTE format(
            'CREATE POLICY "org_read_%s" ON public.%I FOR SELECT
             USING (organization_id IN (SELECT public.user_organization_ids()))',
            target, target);
        EXECUTE format(
            'CREATE POLICY "org_write_%s" ON public.%I FOR ALL
             USING (organization_id IN (SELECT public.user_manages_organization_ids()))
             WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()))',
            target, target);
    END LOOP;
END;
$$;


-- =============================================================================
-- 8. TIME ENTRIES
-- =============================================================================
-- Employees own their hours; managers see and approve the organization's.

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


-- =============================================================================
-- 9. ACTIVITY LOG
-- =============================================================================

CREATE POLICY "activity_logs_read" ON public.activity_logs
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "activity_logs_insert" ON public.activity_logs
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND organization_id IN (SELECT public.user_organization_ids())
    );


-- =============================================================================
-- 10. COMPENSATION
-- =============================================================================

-- Reps may read the rules that decide their own pay, but not change them.
CREATE POLICY "commission_rules_read" ON public.commission_rules
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "commission_rules_write" ON public.commission_rules
    FOR ALL USING (organization_id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));

-- Salary is private: your own, or an admin's view of everyone.
CREATE POLICY "member_compensation_read" ON public.member_compensation
    FOR SELECT USING (
        user_id = auth.uid()
        OR organization_id IN (SELECT public.user_admin_organization_ids())
    );

CREATE POLICY "member_compensation_write" ON public.member_compensation
    FOR ALL USING (organization_id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));

DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY['commissions', 'bonuses'] LOOP
        -- Own earnings, or the team's for managers and admins.
        EXECUTE format(
            'CREATE POLICY "%s_read" ON public.%I FOR SELECT
             USING (user_id = auth.uid()
                    OR organization_id IN (SELECT public.user_manages_organization_ids()))',
            target, target);
        -- A rep records commission when they close a deal.
        EXECUTE format(
            'CREATE POLICY "%s_insert" ON public.%I FOR INSERT
             WITH CHECK (organization_id IN (SELECT public.user_sells_organization_ids()))',
            target, target);
        -- Approving and paying stays with managers and admins.
        EXECUTE format(
            'CREATE POLICY "%s_manage" ON public.%I FOR UPDATE
             USING (organization_id IN (SELECT public.user_manages_organization_ids()))
             WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()))',
            target, target);
    END LOOP;
END;
$$;


-- =============================================================================
-- 11. INVOICES
-- =============================================================================

CREATE POLICY "invoices_read" ON public.invoices
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "invoices_write" ON public.invoices
    FOR ALL USING (organization_id IN (SELECT public.user_manages_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()));

-- Line items inherit their invoice's organization.
CREATE POLICY "invoice_line_items_read" ON public.invoice_line_items
    FOR SELECT USING (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE organization_id IN (SELECT public.user_organization_ids())
        )
    );

CREATE POLICY "invoice_line_items_write" ON public.invoice_line_items
    FOR ALL USING (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE organization_id IN (SELECT public.user_manages_organization_ids())
        )
    )
    WITH CHECK (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE organization_id IN (SELECT public.user_manages_organization_ids())
        )
    );


-- =============================================================================
-- 12. FINANCE
-- =============================================================================

-- organization_id IS NULL marks the built-in categories, shared by everyone.
CREATE POLICY "finance_categories_read" ON public.finance_categories
    FOR SELECT USING (
        organization_id IS NULL
        OR organization_id IN (SELECT public.user_organization_ids())
    );

CREATE POLICY "finance_categories_write" ON public.finance_categories
    FOR ALL USING (organization_id IN (SELECT public.user_manages_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()));

-- The ledger exposes the whole organization's money, so reading it is
-- manager-and-above as well.
CREATE POLICY "finance_transactions_read" ON public.finance_transactions
    FOR SELECT USING (organization_id IN (SELECT public.user_manages_organization_ids()));

CREATE POLICY "finance_transactions_write" ON public.finance_transactions
    FOR ALL USING (organization_id IN (SELECT public.user_manages_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()));


-- =============================================================================
-- 13. SUBSCRIPTION AND BILLING
-- =============================================================================

CREATE POLICY "organization_subscriptions_read" ON public.organization_subscriptions
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "organization_subscriptions_write" ON public.organization_subscriptions
    FOR ALL USING (organization_id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));

CREATE POLICY "billing_history_read" ON public.billing_history
    FOR SELECT USING (organization_id IN (SELECT public.user_manages_organization_ids()));

-- Plans are a public catalogue shown on the pricing page before sign-in.
CREATE POLICY "subscription_plans_read" ON public.subscription_plans
    FOR SELECT USING (true);

COMMIT;


-- =============================================================================
-- VERIFICATION — run separately
-- =============================================================================
--
-- -- Exactly one policy set per table, with no strays left from older scripts:
-- SELECT tablename, COUNT(*) AS policies, string_agg(policyname, ', ' ORDER BY policyname)
-- FROM pg_policies WHERE schemaname = 'public'
-- GROUP BY tablename ORDER BY tablename;
--
-- -- Every table in scope has RLS switched on:
-- SELECT relname, relrowsecurity
-- FROM pg_class WHERE relnamespace = 'public'::regnamespace
--   AND relkind = 'r' AND relrowsecurity = false
-- ORDER BY relname;
--
-- -- No policy consults its own table inline (the recursion trap):
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual LIKE '%' || tablename || '%' OR with_check LIKE '%' || tablename || '%')
--   AND policyname NOT LIKE 'invoice_line_items%';
