# Test Users Setup Guide

The test users need to be created in two places:
1. **Supabase Auth** (authentication system)
2. **Database** (user profiles and organizations)

## Option 1: Create Users via Supabase Dashboard (Recommended)

### Step 1: Create Auth Users

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** → **"Create new user"**
4. Create three users:

   **Admin User:**
   - Email: `admin@worksuite.com`
   - Password: `password`
   - Auto Confirm User: ✅ (checked)

   **Manager User:**
   - Email: `manager@worksuite.com`
   - Password: `password`
   - Auto Confirm User: ✅ (checked)

   **Employee User:**
   - Email: `employee@worksuite.com`
   - Password: `password`
   - Auto Confirm User: ✅ (checked)

### Step 2: Run Database Setup Script

After creating the auth users, run the SQL script:

1. Go to **SQL Editor** in Supabase dashboard
2. Open the file `create-test-users.sql`
3. Copy and paste it into the SQL editor
4. Click **Run**

This will:
- Create a test organization
- Create user profiles for all three users
- Link them to the organization with appropriate roles

## Option 2: Create Users via SQL (Advanced)

If you have admin access, you can create users directly via SQL using Supabase's admin functions. However, this requires service role key access.

## Verification

After setup, you should be able to login with:
- **Admin**: `admin@worksuite.com` / `password`
- **Manager**: `manager@worksuite.com` / `password`
- **Employee**: `employee@worksuite.com` / `password`

## Troubleshooting

If login fails:
1. Check that users exist in **Authentication** → **Users**
2. Verify users are confirmed (not pending)
3. Check that `create-test-users.sql` ran successfully
4. Verify the `users` and `user_organizations` tables have the correct data

