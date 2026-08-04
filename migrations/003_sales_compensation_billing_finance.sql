-- =============================================================================
-- WorkSuite — sales rep role, compensation, invoicing, finance, Stripe
-- =============================================================================
--
-- Run AFTER 001_consolidate_schema.sql. Idempotent and non-destructive; safe to
-- re-run and safe against a database holding production data.
--
-- Adds:
--   1. The sales_rep role, and RLS that lets reps work CRM without touching
--      delivery, billing or team administration
--   2. Commission rules, earned commission, bonuses and per-member compensation
--   3. Real invoices (previously kept in browser localStorage, so invoices were
--      lost on cache clear and invisible to everyone else)
--   4. A finance ledger that revenue and costs flow into automatically
--   5. Stripe subscription columns
--
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. SALES REP ROLE
-- =============================================================================

ALTER TABLE public.organization_members
    DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('admin', 'manager', 'sales_rep', 'employee'));

-- Reps may read and write CRM records; delivery and money stay with managers.
CREATE OR REPLACE FUNCTION public.user_sells_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('admin', 'manager', 'sales_rep');
$$;

GRANT EXECUTE ON FUNCTION public.user_sells_organization_ids() TO authenticated;


-- =============================================================================
-- 2. COMPENSATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    calc_type VARCHAR(30) NOT NULL
        CHECK (calc_type IN ('percentage', 'flat', 'percentage_capped')),
    percentage NUMERIC(6,3),
    flat_amount NUMERIC(12,2),
    min_amount NUMERIC(12,2),
    max_amount NUMERIC(12,2),
    applies_to_role VARCHAR(50)
        CHECK (applies_to_role IS NULL OR applies_to_role IN ('admin', 'manager', 'sales_rep', 'employee')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- A rule must actually be computable.
    CONSTRAINT commission_rule_has_value CHECK (
        (calc_type = 'flat' AND flat_amount IS NOT NULL)
        OR (calc_type IN ('percentage', 'percentage_capped') AND percentage IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_org ON public.commission_rules(organization_id);

-- At most one organization-wide default.
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_rules_single_default
    ON public.commission_rules(organization_id)
    WHERE is_default = true AND applies_to_role IS NULL;

CREATE TABLE IF NOT EXISTS public.member_compensation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    base_type VARCHAR(20) NOT NULL DEFAULT 'hourly'
        CHECK (base_type IN ('hourly', 'salary', 'none')),
    hourly_rate NUMERIC(10,2),
    salary_amount NUMERIC(12,2),
    salary_period VARCHAR(10) CHECK (salary_period IS NULL OR salary_period IN ('monthly', 'annual')),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    is_commission_eligible BOOLEAN NOT NULL DEFAULT false,
    commission_rule_id UUID REFERENCES public.commission_rules(id) ON DELETE SET NULL,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    -- NULL means "current"; superseded records get an end date rather than
    -- being overwritten, so historical payroll stays correct after a raise.
    effective_to DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_compensation_org ON public.member_compensation(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_compensation_user ON public.member_compensation(user_id);

-- Exactly one open arrangement per person per organization.
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_compensation_current
    ON public.member_compensation(organization_id, user_id)
    WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pipeline_item_id UUID REFERENCES public.pipeline_items(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES public.commission_rules(id) ON DELETE SET NULL,
    deal_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_org ON public.commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user ON public.commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_earned_at ON public.commissions(earned_at);

-- One live commission per deal. Enforced here rather than only in application
-- code so a deal bounced in and out of closed-won cannot pay twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_one_per_deal
    ON public.commissions(organization_id, pipeline_item_id)
    WHERE status <> 'cancelled' AND pipeline_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    reason TEXT NOT NULL,
    period VARCHAR(7),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    awarded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonuses_org ON public.bonuses(organization_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_user ON public.bonuses(user_id);

DROP TRIGGER IF EXISTS update_commission_rules_updated_at ON public.commission_rules;
CREATE TRIGGER update_commission_rules_updated_at
    BEFORE UPDATE ON public.commission_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_member_compensation_updated_at ON public.member_compensation;
CREATE TRIGGER update_member_compensation_updated_at
    BEFORE UPDATE ON public.member_compensation
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A starting rule for every organization that has none, so commission works
-- the moment a rep closes their first deal.
INSERT INTO public.commission_rules
    (organization_id, name, calc_type, percentage, applies_to_role, is_default, is_active)
SELECT o.id, 'Standard sales commission', 'percentage', 5.0, NULL, true, true
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.commission_rules cr WHERE cr.organization_id = o.id
);


-- =============================================================================
-- 3. INVOICES
-- =============================================================================
-- Invoices previously lived in browser localStorage: invisible to teammates,
-- lost on cache clear, and impossible to report on.

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (unit IN ('hours', 'fixed')),
    rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    source_type VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('time_entry', 'project', 'manual')),
    source_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_source ON public.invoice_line_items(source_type, source_id);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

/*
 * Allocates the next invoice number for an organization.
 *
 * Takes a transaction-scoped advisory lock so two people creating invoices at
 * the same moment cannot be handed the same number — counting existing rows
 * without a lock is a race.
 */
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year TEXT := to_char(NOW(), 'YYYY');
    v_next INTEGER;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));

    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(invoice_number, '^INV-\d{4}-', ''), '')::INTEGER
    ), 0) + 1
    INTO v_next
    FROM public.invoices
    WHERE organization_id = p_organization_id
      AND invoice_number LIKE 'INV-' || v_year || '-%';

    RETURN 'INV-' || v_year || '-' || lpad(v_next::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number(UUID) TO authenticated;


-- =============================================================================
-- 4. FINANCE LEDGER
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.finance_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL means a built-in category shared by every organization.
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    slug VARCHAR(60) NOT NULL,
    name VARCHAR(120) NOT NULL,
    direction VARCHAR(3) NOT NULL CHECK (direction IN ('in', 'out')),
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_categories_system_slug
    ON public.finance_categories(slug) WHERE organization_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_categories_org_slug
    ON public.finance_categories(organization_id, slug) WHERE organization_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    direction VARCHAR(3) NOT NULL CHECK (direction IN ('in', 'out')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    occurred_on DATE NOT NULL,
    description TEXT NOT NULL,
    reference VARCHAR(120),
    category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
    source_type VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('invoice', 'subscription', 'commission', 'bonus', 'salary', 'contract', 'manual')),
    source_id UUID,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_org ON public.finance_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON public.finance_transactions(occurred_on);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_direction ON public.finance_transactions(direction);

-- Automatic entries are keyed to the record that produced them, so replaying an
-- event (a webhook retry, an invoice re-marked paid) cannot double-count.
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_transactions_source
    ON public.finance_transactions(organization_id, source_type, source_id)
    WHERE source_id IS NOT NULL AND source_type <> 'manual';

INSERT INTO public.finance_categories (organization_id, slug, name, direction, is_system) VALUES
    (NULL, 'client_revenue',        'Client revenue',        'in',  true),
    (NULL, 'contract_revenue',      'Contract revenue',      'in',  true),
    (NULL, 'other_income',          'Other income',          'in',  true),
    (NULL, 'salaries',              'Salaries',              'out', true),
    (NULL, 'commissions',           'Sales commission',      'out', true),
    (NULL, 'bonuses',               'Bonuses',               'out', true),
    (NULL, 'software_subscription', 'Software & subscriptions', 'out', true),
    (NULL, 'office',                'Office & facilities',   'out', true),
    (NULL, 'travel',                'Travel',                'out', true),
    (NULL, 'marketing',             'Marketing',             'out', true),
    (NULL, 'taxes',                 'Taxes',                 'out', true),
    (NULL, 'other_expense',         'Other expense',         'out', true)
ON CONFLICT DO NOTHING;

/*
 * Mirrors a paid commission or bonus into the ledger.
 *
 * Runs on the payout transition only — accrued-but-unpaid amounts are a
 * liability, not cash out, and should not appear as spend.
 */
CREATE OR REPLACE FUNCTION public.mirror_payout_to_finance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_category_slug TEXT;
    v_category_id UUID;
    v_description TEXT;
    v_name TEXT;
BEGIN
    IF NEW.status <> 'paid' OR OLD.status = 'paid' THEN
        RETURN NEW;
    END IF;

    v_category_slug := CASE TG_TABLE_NAME
        WHEN 'commissions' THEN 'commissions'
        ELSE 'bonuses'
    END;

    SELECT id INTO v_category_id
    FROM public.finance_categories
    WHERE slug = v_category_slug AND organization_id IS NULL;

    SELECT COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''), 'Unknown')
    INTO v_name
    FROM public.users u WHERE u.id = NEW.user_id;

    v_description := CASE TG_TABLE_NAME
        WHEN 'commissions' THEN 'Sales commission — ' || v_name
        ELSE 'Bonus — ' || v_name
    END;

    INSERT INTO public.finance_transactions (
        organization_id, direction, amount, currency, occurred_on,
        description, category_id, source_type, source_id
    ) VALUES (
        NEW.organization_id, 'out', NEW.amount, NEW.currency, CURRENT_DATE,
        v_description, v_category_id,
        CASE TG_TABLE_NAME WHEN 'commissions' THEN 'commission' ELSE 'bonus' END,
        NEW.id
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mirror_commission_payout ON public.commissions;
CREATE TRIGGER mirror_commission_payout
    AFTER UPDATE OF status ON public.commissions
    FOR EACH ROW EXECUTE FUNCTION public.mirror_payout_to_finance();

DROP TRIGGER IF EXISTS mirror_bonus_payout ON public.bonuses;
CREATE TRIGGER mirror_bonus_payout
    AFTER UPDATE OF status ON public.bonuses
    FOR EACH ROW EXECUTE FUNCTION public.mirror_payout_to_finance();


-- =============================================================================
-- 5. STRIPE SUBSCRIPTION COLUMNS
-- =============================================================================

ALTER TABLE public.organization_subscriptions
    ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(10)
        CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'annual')),
    ADD COLUMN IF NOT EXISTS seats INTEGER;

-- The webhook upserts on organization_id, so one row per organization.
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_subscriptions_org
    ON public.organization_subscriptions(organization_id);

-- Stripe retries webhooks freely; payments must be recorded at most once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_history_stripe_invoice
    ON public.billing_history(stripe_invoice_id)
    WHERE stripe_invoice_id IS NOT NULL;


-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

-- --- CRM tables now writable by sales reps -----------------------------------
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'clients', 'contracts', 'pipeline_items', 'tasks', 'client_activities'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "org_write_%s" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "org_write_%s" ON public.%I FOR ALL
             USING (organization_id IN (SELECT public.user_sells_organization_ids()))
             WITH CHECK (organization_id IN (SELECT public.user_sells_organization_ids()))',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- --- commission rules --------------------------------------------------------
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_rules_read" ON public.commission_rules;
DROP POLICY IF EXISTS "commission_rules_write" ON public.commission_rules;

-- Reps may read the rules that determine their own pay, but not change them.
CREATE POLICY "commission_rules_read" ON public.commission_rules
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "commission_rules_write" ON public.commission_rules
    FOR ALL USING (organization_id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));

-- --- member compensation -----------------------------------------------------
ALTER TABLE public.member_compensation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "member_compensation_read" ON public.member_compensation;
DROP POLICY IF EXISTS "member_compensation_write" ON public.member_compensation;

-- Salary is private: you see your own, admins see everyone's.
CREATE POLICY "member_compensation_read" ON public.member_compensation
    FOR SELECT USING (
        user_id = auth.uid()
        OR organization_id IN (SELECT public.user_admin_organization_ids())
    );

CREATE POLICY "member_compensation_write" ON public.member_compensation
    FOR ALL USING (organization_id IN (SELECT public.user_admin_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));

-- --- commissions and bonuses -------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['commissions', 'bonuses']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_read" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_manage" ON public.%I', tbl, tbl);

        -- You can see your own earnings; managers and admins see the team's.
        EXECUTE format(
            'CREATE POLICY "%s_read" ON public.%I FOR SELECT
             USING (user_id = auth.uid()
                    OR organization_id IN (SELECT public.user_manages_organization_ids()))',
            tbl, tbl
        );

        -- A rep records their own commission when they close a deal.
        EXECUTE format(
            'CREATE POLICY "%s_insert" ON public.%I FOR INSERT
             WITH CHECK (organization_id IN (SELECT public.user_sells_organization_ids()))',
            tbl, tbl
        );

        -- Approving and paying stays with managers and admins.
        EXECUTE format(
            'CREATE POLICY "%s_manage" ON public.%I FOR UPDATE
             USING (organization_id IN (SELECT public.user_manages_organization_ids()))
             WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()))',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- --- invoices ----------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_read" ON public.invoices;
DROP POLICY IF EXISTS "invoices_write" ON public.invoices;

CREATE POLICY "invoices_read" ON public.invoices
    FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "invoices_write" ON public.invoices
    FOR ALL USING (organization_id IN (SELECT public.user_manages_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()));

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_line_items_read" ON public.invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_write" ON public.invoice_line_items;

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

-- --- finance -----------------------------------------------------------------
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_categories_read" ON public.finance_categories;
DROP POLICY IF EXISTS "finance_categories_write" ON public.finance_categories;

CREATE POLICY "finance_categories_read" ON public.finance_categories
    FOR SELECT USING (
        organization_id IS NULL
        OR organization_id IN (SELECT public.user_organization_ids())
    );

CREATE POLICY "finance_categories_write" ON public.finance_categories
    FOR ALL USING (organization_id IN (SELECT public.user_manages_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()));

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_transactions_read" ON public.finance_transactions;
DROP POLICY IF EXISTS "finance_transactions_write" ON public.finance_transactions;

-- The ledger exposes the whole organization's money, so it is manager-and-above
-- for reading as well as writing.
CREATE POLICY "finance_transactions_read" ON public.finance_transactions
    FOR SELECT USING (organization_id IN (SELECT public.user_manages_organization_ids()));

CREATE POLICY "finance_transactions_write" ON public.finance_transactions
    FOR ALL USING (organization_id IN (SELECT public.user_manages_organization_ids()))
    WITH CHECK (organization_id IN (SELECT public.user_manages_organization_ids()));

ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_history_read" ON public.billing_history;
CREATE POLICY "billing_history_read" ON public.billing_history
    FOR SELECT USING (organization_id IN (SELECT public.user_manages_organization_ids()));

COMMIT;


-- =============================================================================
-- VERIFICATION — run separately after the migration
-- =============================================================================
--
-- -- New tables are present:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('commission_rules','member_compensation','commissions',
--                      'bonuses','invoices','invoice_line_items',
--                      'finance_categories','finance_transactions')
-- ORDER BY table_name;
--
-- -- sales_rep is an accepted role:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conname = 'organization_members_role_check';
--
-- -- Every organization has a default commission rule:
-- SELECT o.name, COUNT(cr.id) AS rules
-- FROM organizations o LEFT JOIN commission_rules cr ON cr.organization_id = o.id
-- GROUP BY o.name ORDER BY o.name;
--
-- -- Built-in finance categories loaded (expect 12):
-- SELECT COUNT(*) FROM finance_categories WHERE organization_id IS NULL;
--
-- -- Invoice numbering works and increments:
-- SELECT public.next_invoice_number('<your-organization-uuid>');
