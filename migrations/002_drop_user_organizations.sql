-- =============================================================================
-- WorkSuite — retire user_organizations
-- =============================================================================
--
-- DO NOT RUN THIS YET.
--
-- 001_consolidate_schema.sql deliberately leaves user_organizations in place so
-- the consolidation can be rolled back. Run this only once you have confirmed:
--
--   1. Every member appears in organization_members with the right role
--   2. Sign-in, the organization switcher, and /team/members all behave
--   3. No application code references user_organizations
--      (grep -rn "user_organizations" src/ should return nothing)
--
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

-- Safety check: refuse to drop while rows exist that never made it across.
DO $$
DECLARE
    orphaned INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_organizations'
    ) THEN
        RAISE NOTICE 'user_organizations already dropped — nothing to do.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO orphaned
    FROM public.user_organizations uo
    WHERE NOT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = uo.organization_id
          AND om.user_id = uo.user_id
    );

    IF orphaned > 0 THEN
        RAISE EXCEPTION
            'Refusing to drop: % membership row(s) exist only in user_organizations. Re-run 001 first.',
            orphaned;
    END IF;
END;
$$;

DROP TABLE IF EXISTS public.user_organizations CASCADE;

COMMIT;
