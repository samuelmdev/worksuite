-- =============================================================================
-- WorkSuite — make organization signup atomic
-- =============================================================================
--
-- Run AFTER 004. Idempotent. Creates no tables and deletes no data.
--
-- THE BUG
--
-- Signup performed four separate writes from the browser: create the auth
-- user, insert the organization, insert the users row, insert the membership.
-- Step two did `.insert(...).select().single()`, and reading the row back
-- requires the SELECT policy on organizations:
--
--     USING (id IN (SELECT public.user_organization_ids()))
--
-- At that moment the user has no membership row — it is created two steps
-- later — so the new row is filtered out of RETURNING, `.single()` sees zero
-- rows and raises, and the client aborts. The INSERT has already committed by
-- then, leaving an organization with no members and a signed-in user with no
-- organization. Exactly the reported symptom.
--
-- Relaxing the read policy would paper over it. The underlying fault is that
-- four dependent writes had no transaction, so a failure at any step left
-- partial state. This replaces them with one SECURITY DEFINER function that
-- either completes or rolls back.
--
-- It also fixes a second latent bug: organizations.slug is UNIQUE, and the
-- client derived it from the name, so the second customer called "Test Oy"
-- could never register. Slugs are now deduplicated server-side.
--
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

/*
 * Creates an organization and makes the caller its admin, atomically.
 *
 * SECURITY DEFINER so it can write the membership row that the caller is not
 * yet entitled to write, and read back the organization the caller cannot yet
 * see. auth.uid() is still the real caller, so this cannot be used to act as
 * anyone else — the owner is always whoever invoked it.
 */
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    p_name       TEXT,
    p_email      TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name  TEXT DEFAULT NULL
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid       UUID := auth.uid();
    v_auth_mail TEXT;
    v_base_slug TEXT;
    v_slug      TEXT;
    v_suffix    INT := 0;
    v_org       public.organizations;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
    END IF;

    IF COALESCE(TRIM(p_name), '') = '' THEN
        RAISE EXCEPTION 'Organization name is required' USING ERRCODE = '22023';
    END IF;

    SELECT au.email INTO v_auth_mail FROM auth.users au WHERE au.id = v_uid;

    -- slug: lowercase, non-alphanumerics collapsed to hyphens, trimmed, then
    -- suffixed until unique. The column is UNIQUE, so a collision would
    -- otherwise abort signup for anyone sharing a company name.
    v_base_slug := TRIM(BOTH '-' FROM regexp_replace(lower(TRIM(p_name)), '[^a-z0-9]+', '-', 'g'));
    IF v_base_slug = '' THEN
        v_base_slug := 'org';
    END IF;

    v_slug := v_base_slug;
    WHILE EXISTS (SELECT 1 FROM public.organizations o WHERE o.slug = v_slug) LOOP
        v_suffix := v_suffix + 1;
        v_slug := v_base_slug || '-' || v_suffix;
    END LOOP;

    INSERT INTO public.organizations (name, slug, email)
    VALUES (TRIM(p_name), v_slug, COALESCE(NULLIF(TRIM(p_email), ''), v_auth_mail))
    RETURNING * INTO v_org;

    -- The profile row may already exist if an earlier attempt got this far.
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (v_uid, v_auth_mail, NULLIF(TRIM(p_first_name), ''), NULLIF(TRIM(p_last_name), ''))
    ON CONFLICT (id) DO UPDATE SET
        email      = COALESCE(EXCLUDED.email,      public.users.email),
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name  = COALESCE(EXCLUDED.last_name,  public.users.last_name);

    INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
    VALUES (v_org.id, v_uid, 'admin', true)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = 'admin', is_active = true, updated_at = NOW();

    RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION
    public.create_organization_with_owner(TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- Direct inserts are no longer a sanctioned path: they are what produced the
-- orphaned rows. Everything goes through the function above, which runs as
-- definer and so does not need this policy.
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;

COMMIT;


-- =============================================================================
-- CLEANING UP ORPHANS FROM THE FAILED SIGNUPS
-- =============================================================================
--
-- Run this first to see what the earlier attempts left behind. An organization
-- with no members is unreachable: nobody can read, administer or delete it
-- through the app.
--
--   SELECT o.id, o.name, o.slug, o.created_at
--   FROM organizations o
--   WHERE NOT EXISTS (
--       SELECT 1 FROM organization_members om WHERE om.organization_id = o.id
--   )
--   ORDER BY o.created_at;
--
-- Auth users stranded without a profile or membership:
--
--   SELECT au.id, au.email, au.created_at
--   FROM auth.users au
--   WHERE NOT EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = au.id)
--   ORDER BY au.created_at;
--
-- Only once you have looked at the list and recognise the rows as test data,
-- delete them. This is destructive and intentionally not run automatically:
--
--   DELETE FROM organizations o
--   WHERE NOT EXISTS (
--       SELECT 1 FROM organization_members om WHERE om.organization_id = o.id
--   );
--
-- A stranded auth user can simply sign up again once the app is updated; the
-- function above adopts an existing profile row rather than failing on it.
-- To remove one entirely, use Authentication → Users in the dashboard.
--
--
-- VERIFICATION
--
--   SELECT public.create_organization_with_owner('Test Oy');   -- as a signed-in user
--   -- then, same session:
--   SELECT o.name, om.role FROM organizations o
--   JOIN organization_members om ON om.organization_id = o.id;
