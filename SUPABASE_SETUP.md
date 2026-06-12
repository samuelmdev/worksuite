# Supabase Setup Guide

This guide will help you set up Supabase for your WorkSuite application.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and enter project details:
   - **Name**: `worksuite` (or your preferred name)
   - **Database Password**: Generate a strong password
   - **Region**: Choose the closest region to your users
4. Click "Create new project"

## 2. Get Your Project Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 3. Set Up Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: Never commit the `.env.local` file to version control!

## 4. Set Up the Database

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `database-schema.sql` from this project
3. Paste it into the SQL editor and run it
4. This will create all the necessary tables, indexes, and RLS policies

## 5. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure your site URL:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
3. Enable email authentication
4. Configure email templates if needed

## 6. Set Up Row Level Security (RLS)

The database schema includes RLS policies, but you may need to:

1. Go to **Authentication** → **Policies**
2. Verify that RLS is enabled on all tables
3. Test the policies with different user roles

## 7. Test the Connection

1. Start your development server: `npm run dev`
2. Try to access a protected route (e.g., `/crm`)
3. You should be redirected to login if not authenticated

## 8. Production Setup

For production deployment:

1. Update environment variables with production values
2. Update Supabase site URL to your production domain
3. Add production redirect URLs
4. Configure email settings for production
5. Set up proper backup and monitoring

## 9. Database Types Generation (Optional)

To generate TypeScript types from your database:

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
```

Then update the `Database` type in `src/lib/supabase.ts` to use the generated types.

## 10. Common Issues

### Authentication Issues
- Make sure your site URL and redirect URLs are correctly configured
- Check that environment variables are properly set
- Verify RLS policies are working correctly

### Database Connection Issues
- Ensure your project URL and keys are correct
- Check that the database schema has been applied
- Verify network connectivity to Supabase

### RLS Policy Issues
- Test policies with different user roles
- Check that users have proper organization assignments
- Verify that policies match your business logic

## 11. Next Steps

Once Supabase is set up:

1. Implement authentication pages (`/auth/login`, `/auth/signup`)
2. Add user registration and organization setup
3. Implement subscription management with Stripe
4. Add real-time features using Supabase subscriptions
5. Set up proper error handling and loading states

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js with Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Discord Community](https://discord.supabase.com)
