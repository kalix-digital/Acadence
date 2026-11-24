# Acadence — Authentication, Memberships and RLS

> **Document ID:** DBD-002 · **Version:** 1.0 · **Status:** Implemented (Phase 2) · **Date:** 2026-11-24 · **Owner:** Engineering
> **Related:** [Database Design](DATABASE_DESIGN.md) · [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [ADR-003](../13-adr/ADR-003-rls-multi-tenancy.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md)

This document describes how Phase 2 implements authentication, institution memberships and the tenant isolation boundary. It is the reference for every later module: no table is added without RLS and a tenant helper.

## 1. Migrations

| Migration | Contents |
| --- | --- |
| `supabase/migrations/20261123120000_tenancy_core.sql` | Enums (`institution_status`, `membership_role`, `membership_status`), `institutions`, `institution_settings`, `profiles`, `institution_memberships`, `updated_at` trigger, profile-on-signup trigger, tenant helper functions, grants |
| `supabase/migrations/20261123120100_tenancy_rls.sql` | RLS enabled and policies for all four tables |

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
| `institution_memberships` | Self; institution admins of that institution; platform admin | Platform admin, or institution admin limited to their institution and non-platform roles | Platform admin; institution admin; self-acceptance only | Platform admin; institution admin (never self) |

Deliberate restrictions:

- An institution admin cannot grant `platform_admin` — the insert policy rejects it.
- An institution admin cannot remove their own membership.
- No table grants access to `anon`; unauthenticated reads return zero rows.
- The service-role key is server-only and never used by application request paths.

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

## 6. Known gaps

- Automated tenant-isolation tests and Vitest/Playwright infrastructure are still pending; Phase 2 has been verified by build, lint and route-level HTTP checks only.
- Migrations have not been applied to a live Supabase project from this workspace (no project credentials). Provision a project, set the two public keys and `NEXT_PUBLIC_SITE_URL`, then run `supabase db push` and verify sign-in end to end.
- Invitation creation/acceptance UI, member management screens and role landing pages are Phase 3.
- MFA, session revocation policy and auth rate limiting are handled in Phase 18 (security hardening).

## 7. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-24 | Engineering | Phase 2 authentication, membership and RLS implementation |
