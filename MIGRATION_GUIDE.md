# Multi-Organization Architecture Migration Guide

## Overview

This migration transforms the application from a single-organization-per-user model to a multi-organization architecture where:

1. **Auth users** can belong to multiple organizations
2. **All data** is properly isolated by organization
3. **Users** can switch between organizations seamlessly
4. **Data integrity** is enforced at the database level

## Database Changes

### 1. Run the Migration Script

Execute the SQL script `fix-organization-architecture.sql` to:
- Create `user_organizations` junction table
- Migrate existing data
- Update table structures
- Add proper constraints and indexes
- Set up RLS policies

### 2. Key Schema Changes

#### Before (Single Organization):
```sql
users (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id), -- Direct FK
  role VARCHAR(50)
)
```

#### After (Multi Organization):
```sql
users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100)
  -- No direct organization_id
)

user_organizations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50), -- Role within this organization
  is_active BOOLEAN,
  UNIQUE(user_id, organization_id)
)
```

## Application Changes

### 1. Update Auth Context

Replace the existing auth context with the multi-org version:

```typescript
// Old: src/app/lib/auth-context.tsx
// New: src/app/lib/auth-context-multi-org.tsx

// Key changes:
- User interface now has organizations[] array
- Added currentOrganization state
- Added switchOrganization function
- Removed direct organizationId from User
```

### 2. Update Service Layers

Replace service files with multi-org versions:

```typescript
// Old: src/lib/time-service.ts
// New: src/lib/time-service-multi-org.ts

// Old: src/lib/client-service.ts  
// New: src/lib/client-service-multi-org.ts

// Key changes:
- All methods now require organizationId parameter
- All queries filtered by organization_id
- Data isolation enforced at service level
```

### 3. Update Components

#### TimeEntryModal
```typescript
// Update to use currentOrganization from auth context
const { currentOrganization } = useAuth()

// Ensure organization_id is always set
formData: {
  ...formData,
  organization_id: currentOrganization?.id
}
```

#### Reports Pages
```typescript
// Update to use currentOrganization
const { currentOrganization } = useAuth()

// Pass organizationId to all service calls
const data = await TimeService.getEmployeeSalaryData(
  startDate, 
  endDate, 
  currentOrganization?.id
)
```

### 4. Add Organization Switcher

Add the organization switcher component to the header:

```typescript
import OrganizationSwitcher from './components/OrganizationSwitcher'

// In header component:
<OrganizationSwitcher />
```

## Migration Steps

### Step 1: Database Migration
1. Backup your database
2. Run `fix-organization-architecture.sql`
3. Verify data migration was successful

### Step 2: Update Auth System
1. Replace `auth-context.tsx` with `auth-context-multi-org.tsx`
2. Update all imports to use the new auth context
3. Test login/signup functionality

### Step 3: Update Service Layers
1. Replace service files with multi-org versions
2. Update all service method calls to include organizationId
3. Test data isolation

### Step 4: Update Components
1. Update TimeEntryModal to use currentOrganization
2. Update all pages to use currentOrganization
3. Add OrganizationSwitcher to header
4. Test organization switching

### Step 5: Update Time Context
1. Update time-context.tsx to use multi-org services
2. Ensure all CRUD operations include organizationId
3. Test time entry functionality

## Data Isolation Verification

### Test Cases

1. **User A** creates time entries in **Organization 1**
2. **User A** switches to **Organization 2** 
3. **User A** should not see time entries from **Organization 1**
4. **User B** in **Organization 1** should see **User A's** entries from **Organization 1**
5. **User B** should not see **User A's** entries from **Organization 2**

### Verification Queries

```sql
-- Check user organizations
SELECT * FROM user_organizations WHERE user_id = 'user-uuid';

-- Check time entries isolation
SELECT te.*, uo.organization_id as user_org_id 
FROM time_entries te
JOIN user_organizations uo ON te.user_id = uo.user_id
WHERE uo.user_id = 'user-uuid';

-- Verify RLS policies
SET row_security = on;
SELECT * FROM time_entries; -- Should only show user's org data
```

## Benefits

1. **Multi-Company Support**: Users can work for multiple companies
2. **Data Isolation**: Complete separation of organization data
3. **Scalability**: Architecture supports enterprise use cases
4. **Security**: RLS policies enforce data access at database level
5. **Flexibility**: Users can switch contexts seamlessly

## Rollback Plan

If issues arise, you can rollback by:

1. Restore database from backup
2. Revert to original service files
3. Revert to original auth context
4. Remove organization switcher component

## Testing Checklist

- [ ] User can belong to multiple organizations
- [ ] User can switch between organizations
- [ ] Data is properly isolated by organization
- [ ] Time entries are created with correct organization_id
- [ ] Reports show only current organization data
- [ ] CRM data is isolated by organization
- [ ] RLS policies prevent cross-organization data access
- [ ] Organization switcher works correctly
- [ ] Existing data was migrated properly
- [ ] New users can sign up and create organizations

## Future Enhancements

1. **Organization Management**: Admin interface for managing organizations
2. **User Invitations**: Invite users to join organizations
3. **Role Management**: Granular permissions within organizations
4. **Billing**: Per-organization subscription management
5. **Audit Logs**: Track organization-level activities
