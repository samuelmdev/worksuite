# Database migrations

The repository root used to hold ~25 loose `fix-*.sql` / `add-*.sql` scripts
with no ordering, several of which defined the same tables differently. This
directory replaces them.

## Where to run these

**Supabase Dashboard → SQL Editor → New query.** Paste the whole file, press
Run. Do the files in numeric order, one at a time, and check the result before
moving on. Every file is idempotent, so re-running one is harmless.

## Existing database

Run these three, in order:

```
001_consolidate_schema.sql
003_sales_compensation_billing_finance.sql
004_fix_rls_recursion_and_leaks.sql
```

All are idempotent and non-destructive to data — safe to re-run, and none of
them drops a table. Afterwards run the verification queries commented at the
bottom of each file.

**004 is required, not optional.** It repairs two RLS defects in 001 and 003
that only showed up against a real database:

- 001 dropped pre-existing policies *by name*. A database previously set up by
  the old `fix-*-rls-*.sql` scripts keeps its policies under other names, and
  Postgres ORs permissive policies together — so a surviving `USING (true)`
  silently defeated every policy added afterwards. `public.organizations` was
  readable by anonymous callers.
- The `organization_members` insert policy queried `organization_members`
  inline, so evaluating it re-entered it: `42P17 infinite recursion detected
  in policy`. That blocked every write to the table, signup included.

004 drops every policy on the tables in scope by enumerating `pg_policies`,
then recreates the intended set, and moves the recursive check into a
`SECURITY DEFINER` function. It is the single authority on RLS.

Once the app is confirmed healthy, optionally run:

```
002_drop_user_organizations.sql
```

This retires the duplicate membership table. It refuses to run if any
membership row exists only in `user_organizations`.

## Fresh database

Run the base table definitions first, in this order (dependencies matter), then
the numbered migrations:

| # | File | Creates |
|---|------|---------|
| 1 | `../database-schema.sql` | organizations, users, clients, projects, time_entries, subscriptions, logs |
| 2 | `../contracts-table-schema.sql` | contracts, contract_activities |
| 3 | `../leads-table-schema.sql` | pipeline_items |
| 4 | `../tasks-table-schema.sql` | tasks |
| 5 | `001_consolidate_schema.sql` | organization_members, missing columns, triggers, all RLS |
| 6 | `003_sales_compensation_billing_finance.sql` | sales_rep role, compensation, invoices, finance, Stripe columns |
| 7 | `004_fix_rls_recursion_and_leaks.sql` | rebuilds all RLS policies; required |

`001` creates `organization_members` itself, so
`../organization-members-table-schema.sql` is not needed.

## What 001 changes

1. **`users.email`** — mirrored from `auth.users` by trigger. Inviting a
   teammate by email needs this; `auth.users` is not readable from the browser.
2. **`organization_members` becomes the only membership table.** Roles and
   access all derive from it. Rows still living in `user_organizations` are
   folded in. Any organization left without an admin gets its earliest user
   promoted.
3. **`time_entries.project_id`** — hours previously stored a free-text
   `project_name` that could not be joined on, so hours could never roll up to a
   project. Legacy entries are matched to real projects by name within the same
   organization; `project_name` is kept as a historical label.
4. **Direct `organization_id`** on `tasks`, `client_activities`,
   `activity_logs`, `project_clients` and `project_employees`, backfilled from
   the parent record and maintained by triggers so existing application inserts
   keep working.
5. **One coherent RLS scheme.** Read across your organizations, write where you
   hold admin or manager, with time entries additionally readable and writable
   by their own author. Policies call `SECURITY DEFINER` helpers
   (`user_organization_ids()`, `user_admin_organization_ids()`,
   `user_manages_organization_ids()`) — a policy on `organization_members` that
   queried `organization_members` directly would recurse infinitely.

## What 003 changes

1. **`sales_rep` role.** Reps get read and write access to clients, pipeline,
   contracts, tasks and activity — but not projects, billing, finance or team
   administration. Enforced by a new `user_sells_organization_ids()` helper
   alongside the existing manager/admin ones.
2. **Compensation.** `commission_rules` (percentage, flat, or percentage with
   floor and cap), `member_compensation` (hourly / salary / commission-only,
   effective-dated so a raise does not rewrite past payroll), `commissions` and
   `bonuses`. A unique index guarantees at most one live commission per deal —
   dragging a deal in and out of closed-won cannot pay a rep twice. Salary rows
   are readable only by their owner and admins.
3. **Invoices become real.** They previously lived in browser localStorage:
   invisible to teammates, lost on cache clear, impossible to report on. Invoice
   numbers come from `next_invoice_number()`, which takes an advisory lock so
   two people invoicing simultaneously cannot collide.
4. **Finance ledger.** `finance_transactions` plus twelve built-in categories.
   Paid invoices, paid commission, paid bonuses and your own Stripe
   subscription charges flow in automatically; a unique index on
   `(source_type, source_id)` makes replayed events safe to process twice.
5. **Stripe columns.** `billing_interval` and `seats` on
   `organization_subscriptions`, plus a unique index on
   `billing_history.stripe_invoice_id` so retried webhooks record one payment.

## Stripe setup

The app builds and runs without Stripe configured; the subscribe button just
returns "Billing is not configured yet". To switch it on:

1. In the Stripe Dashboard create one product with **four prices**:
   - base monthly (€149), base annual (€1609)
   - per-seat monthly (€10), per-seat annual (€108)
2. Add to `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASE_MONTHLY=price_...
STRIPE_PRICE_BASE_ANNUAL=price_...
STRIPE_PRICE_SEAT_MONTHLY=price_...
STRIPE_PRICE_SEAT_ANNUAL=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3003
```

3. Point a webhook at `/api/stripe/webhook` subscribing to
   `checkout.session.completed`, `customer.subscription.*`, `invoice.paid` and
   `invoice.payment_failed`. Locally:

```bash
stripe listen --forward-to localhost:3003/api/stripe/webhook
```

The webhook — not the checkout redirect — is what activates a subscription.
A user returning from Checkout proves nothing about payment.

## Superseded scripts

Everything in `legacy/` is folded into `001` and should not be run. It is kept
only as a record of how the schema got here.
