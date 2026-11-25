# Acadence — Authentication, Memberships and RLS

> **Document ID:** DBD-002 · **Version:** 1.2 · **Status:** Implemented and tested (Phases 2–3) · **Date:** 2026-11-25 · **Owner:** Engineering
> **Related:** [Database Design](DATABASE_DESIGN.md) · [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [ADR-003](../13-adr/ADR-003-rls-multi-tenancy.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md)

This document describes how Phase 2 implements authentication, institution memberships and the tenant isolation boundary. It is the reference for every later module: no table is added without RLS and a tenant helper.

## 1. Migrations

| Migration | Contents |
| --- | --- |
| `supabase/migrations/20261123120000_tenancy_core.sql` | Enums (`institution_status`, `membership_role`, `membership_status`), `institutions`, `institution_settings`, `profiles`, `institution_memberships`, `updated_at` trigger, profile-on-signup trigger, tenant helper functions, grants |
| `supabase/migrations/20261123120100_tenancy_rls.sql` | RLS enabled and policies for all four tables; `accept_invitation(uuid)` definer RPC |
| `supabase/migrations/20261124120000_institution_management.sql` | `profiles.email` backfill, `institution_invitations`, `institution_activity`, definer triggers for the activity trail, institution status/slug guard, `create_invitation`, `invitation_preview`, `accept_invitation_token`, RLS and grants |

Migrations are additive and idempotent where PostgreSQL allows (`create table if not exists`, `drop policy if exists`). Apply them with the Supabase CLI against a project or a local stack:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

`supabase/seed.sql` is intentionally empty until Phase 3 defines institutional seed data; the first institution admin is created through the platform provisioning flow.

## 2. Identity model

- `auth.users` owns credentials and sessions. Supabase Auth is the only writer.
- `public.profiles` holds display data, one row per auth user, created by the `on_auth_user_created` trigger. Users may edit only their own row.
- `public.institution_memberships` is the **authoritative role record**. A user's role is never stored on `profiles`, so changing a role never requires touching identity data.
- Role is scoped to an institution. `institution_id` is `NULL` only for `platform_admin`, enforced by `memberships_institution_required`.
- A partial unique index (`memberships_one_platform_role`) allows at most one platform-admin membership per user.
- `faculty_id` and `department_id` narrow a membership to a scope; at most one may be set.

### Roles

| Role | Tenant scope | Purpose |
| --- | --- | --- |
| `platform_admin` | All institutions | Platform provisioning and cross-tenant support |
| `support_operator` | Read-only cross-tenant | Diagnose issues without changing academic data |
| `institution_admin` | One institution | Institution configuration, members, billing |
| `faculty_admin` | One faculty | Faculty-level academic and scheduling administration |
| `department_admin` | One department | Department courses, groups and timetables |
| `lecturer` | Own teaching | Personal timetable, workload, AI assistant |
| `student` | Own enrolment | Personal timetable, AI assistant |

Membership `status` (`invited`, `active`, `suspended`, `revoked`) is separate from role: only `active` memberships grant access. `accepted_at` records invitation acceptance.

## 3. Helper functions

All helpers are `SECURITY DEFINER` with `search_path = public` so policies never recurse through the tables they protect.

| Function | Returns |
| --- | --- |
| `auth_institution_ids()` | Active institution IDs for the current user |
| `auth_role(institution)` | The caller's active role inside one institution |
| `auth_department_ids(institution)` | Department scope IDs for the caller |
| `is_platform_admin()` | Whether the caller holds an active platform membership |

Use `(select auth.uid())` in policies rather than a bare `auth.uid()` so PostgreSQL evaluates it once per statement.

## 4. Policy matrix

| Table | Select | Insert | Update | Delete |
| --- | --- | --- | --- | --- |
| `institutions` | Member of the institution, or platform admin | Platform admin | Institution admin of that institution, or platform admin | Platform admin |
| `institution_settings` | Member of the institution, or platform admin | Settings row created by trigger | Institution admin, or platform admin | — (cascades with institution) |
| `profiles` | Self; institution admins for their members; platform admin | Self | Self | — (cascades with auth user) |
| `institution_memberships` | Self; institution admins of that institution; platform admin | Platform admin, or institution admin limited to their institution and non-platform roles | Platform admin; institution admin (no self-service role changes) | Platform admin; institution admin (never self) |

Invitation acceptance is deliberately **not** an UPDATE policy: it goes through `public.accept_invitation(uuid)` (see §4.1).

Deliberate restrictions:

- An institution admin cannot grant or promote to `platform_admin` — both the insert and update policies reject it.
- An institution admin cannot remove their own membership.
- No table grants access to `anon`; unauthenticated reads return zero rows.
- The service-role key is server-only and never used by application request paths.

### 4.1 Invitation acceptance without policy recursion

An RLS policy that queries the table it protects recurses: PostgreSQL re-applies the policy to the policy's own subquery and aborts with `infinite recursion detected in policy for relation "institution_memberships"`. The first revision of the update policy compared the new role against the existing row with a subquery on `institution_memberships`, which produced exactly that failure on every update attempt.

The fix removes all self-references:

- `memberships_update` now grants UPDATE only to platform admins and institution admins, and its `WITH CHECK` also rejects `role = 'platform_admin'`.
- A member activates their own invitation through `public.accept_invitation(p_membership_id uuid)`, `SECURITY DEFINER` with a pinned `search_path`. It updates only a row whose `user_id` equals `auth.uid()` and whose status is `invited`, sets `accepted_at`, returns the new status, and raises `P0002` otherwise. Execute is granted to `authenticated` and revoked from `public`/`anon`.
- No policy on any table queries its own relation. This is asserted statically in the test suite.

Reproduction: reinstating the old policy in a scratch database and running one UPDATE as a member returns `infinite recursion detected in policy for relation "institution_memberships"`; the committed policy completes the same UPDATE.

### 4.2 Invitation tokens (Phase 3, OQ-003)

Accounts are invitation-only. `public.institution_invitations` holds one row per issued invitation:

| Column | Notes |
| --- | --- |
| `institution_id` | Tenant the invitation belongs to; cascades with the institution |
| `email` | Normalised lower-case address; must match the accepting account |
| `role` | CHECK restricts to institution-grantable roles (`institution_admin` … `student`); platform roles can never be invited |
| `token_hash` | SHA-256 of the raw token, unique. The raw token is returned once and never stored or logged |
| `expires_at` | Default 14 days, constrained to 1–60 days by the creation function |
| `accepted_at`, `revoked_at` | One live invitation per address per institution, enforced by a partial unique index |

Three `SECURITY DEFINER` functions own the flow, so no policy reads its own table and no broad UPDATE right exists:

1. `create_invitation(p_institution, p_email, p_role, p_expires_in_days default 14) returns text` — authorises platform admin or that institution's active institution admin, rejects duplicates and existing members, generates two v4 UUIDs as the token, stores only its hash, returns the raw token. The authorisation check coalesces `auth_role()`: for a non-member it returns `NULL`, and `not (false or null)` evaluates to `NULL`, which would silently skip the guard.
2. `invitation_preview(p_token) returns table(institution_id, institution_name, email, role, state, expires_at)` — callable by `anon`; possession of the token is the only requirement, and no other tenant data is exposed.
3. `accept_invitation_token(p_token) returns uuid` — requires an authenticated user whose `auth.users.email` equals the invited address, locks the invitation row, rejects accepted/revoked/expired tokens, then creates or reactivates the membership and consumes the token in one transaction.

RLS on `institution_invitations` allows select/insert/update/delete only to platform administrators or that institution's institution admin; the invited user never reads the table directly and cannot mutate it. `institution_activity` is select-only for those administrators (plus support operators scoped to the institution); rows are written exclusively by definer triggers on institutions, memberships, invitations and settings, attributed to `auth.uid()`.

Email delivery uses Resend when `RESEND_API_KEY` is configured (`EMAIL_FROM` overrides the sender). Without a key the invitation is still created and the one-time link is returned to the inviter — the fallback is explicit in the UI, never a silent failure.

## 5. Application session flow

1. `src/proxy.ts` (Next.js 16 proxy convention, formerly middleware) calls `updateSession`, which asks Supabase Auth to revalidate the cookie and returns the user.
2. Unauthenticated requests to `/institution`, `/platform`, `/lecturer`, `/student` or `/no-access` are redirected to `/sign-in?next=…`.
3. Authenticated requests to `/sign-in` or `/forgot-password` are redirected to `/institution`.
4. `requireUser()` resolves the user; `requireMember()` additionally requires an active membership and redirects membership-less users to `/no-access`; `requireCapability()` guards a specific permission.
5. `getAuthContext()` loads all active memberships with their institution, selects the primary membership, and derives capabilities from `ROLE_CAPABILITIES`.

The proxy refreshes cookies but never authorises data access on its own: RLS remains the enforcement boundary.

### Routes

| Route | Access |
| --- | --- |
| `/` | Public landing page |
| `/sign-in`, `/forgot-password`, `/reset-password` | Public (redirect away when signed in) |
| `/auth/callback`, `/auth/confirm` | Public route handlers that establish a session from an email link |
| `/institution` | Active member of an institution |
| `/no-access` | Signed in, no active membership |
| `/platform`, `/lecturer`, `/student` | Reserved for Phases 3+; guarded by the proxy |

### Capabilities

`src/lib/auth/capabilities.ts` maps each role to capabilities (`manage_members`, `manage_timetables`, `view_analytics`, …). Server routes call `requireCapability`; navigation items declare a `capability` and the sidebar filters to what the signed-in role may use. Capabilities are a convenience layer for UX, never a substitute for RLS.

### Password reset and verification

- Reset requests call `resetPasswordForEmail` with a redirect to `/auth/callback?next=/reset-password`, which exchanges the PKCE code for a session before the new password is set.
- Email templates that use token hashes can link to `/auth/confirm?token_hash=…&type=recovery&next=/reset-password` instead.
- Reset requests always report success, so the form cannot enumerate accounts.
- `NEXT_PUBLIC_SITE_URL` should be set in deployed environments so email links point at the canonical origin.

## 6. Verification

`npm run db:test` applies the harness, both migrations and the isolation suite to a disposable PostgreSQL cluster:

```bash
npm run db:test
# PG_BIN=/path/to/postgresql/bin npm run db:test
```

- `supabase/tests/harness.sql` reproduces the Supabase surface the migrations need — `anon`/`authenticated`/`service_role` roles, `auth.users`, and an `auth.uid()` reading `request.jwt.claims` — and is test-only.
- `supabase/tests/tenancy_isolation.sql` seeds two institutions (Alpha, Beta), two institution admins, a lecturer, a student, an invited user, a new user and a platform admin, then runs every assertion under `SET ROLE authenticated` with a JWT subject so only RLS decides visibility.
- `scripts/db-test.sh` creates, seeds, tests and destroys the cluster; nothing touches a real project.

The suite covers: tenant read isolation both ways, cross-tenant update/delete attempts, cross-tenant inserts, platform-role escalation, self-deletion, invited-user visibility, invitation acceptance (own vs. someone else's), capability to provision and remove members inside the tenant, platform-admin cross-tenant reads, `anon` denial, and the static no-self-reference policy guard.

`supabase/tests/institution_management.sql` adds Phase 3 coverage: platform provisioning, institution status/slug guard rejection for institution admins, invitation authorisation (own tenant vs. cross-tenant vs. lecturer), duplicate and existing-member rejection, platform-role invitation rejection, token preview by `anon`, rejection for the wrong account, successful acceptance and membership activation, single-use enforcement, revocation and re-invitation, per-tenant activity visibility, and `anon` denial. `test.expect_error(sql, sqlstate, message)` runs as the caller so RLS and column guards still apply.

Verified on PostgreSQL 16.15: all three migrations apply with `ON_ERROR_STOP=1`, and both suites pass (`npm run db:test`).

## 7. Known gaps

- The migrations have been proven on a local PostgreSQL 16 cluster with a Supabase-compatible auth shim, not on a hosted Supabase project. Before relying on it in production, run `supabase db push` and complete a browser sign-in, invitation-acceptance and password-reset cycle on the deployed origin.
- Vitest/Playwright application tests and CI wiring are still pending; `db:test` is not yet part of a pipeline.
- Invitation links and access were verified in SQL, not against a hosted Supabase project; Resend delivery has not been exercised with a live API key.
- `/lecturer` and `/student` landing pages are still pending (guards exist, pages do not).
- MFA, session revocation policy and auth rate limiting are handled in Phase 18 (security hardening).

## 8. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-24 | Engineering | Phase 2 authentication, membership and RLS implementation |
| 1.1 | 2026-11-24 | Engineering | Removed membership policy recursion via `accept_invitation`; added isolation tests and disposable-Postgres verification |
| 1.2 | 2026-11-25 | Engineering | Added Phase 3 invitation tokens, activity trail, status guard and their isolation suite |
