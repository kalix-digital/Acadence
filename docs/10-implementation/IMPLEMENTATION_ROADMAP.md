# Acadence — Technical Implementation Roadmap

> **Document ID:** IMP-001 · **Version:** 1.0 · **Status:** Active · **Date:** 2026-11-23 · **Owner:** Engineering Lead
> **Related:** [SRS](../03-requirements/SRS.md) · [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [Testing](../09-testing/TESTING_STRATEGY.md) · [Screen Inventory](../07-ui-ux/SCREEN_INVENTORY.md)

## 1. Delivery rules

- Phases run in order. Business modules never start before their dependencies are complete.
- Each phase ends with a written completion report: implemented, partly implemented, mocked, pending, tests run, known gaps.
- **Approval gate:** after every phase, work stops until the phase is approved. No phase is declared complete because its interface exists.
- Documentation is updated in the same change set as the implementation.
- Every phase must pass the checks in the [testing strategy](../09-testing/TESTING_STRATEGY.md).

## 2. Phase status

| Phase | Module | Status | Exit criteria |
| --- | --- | --- | --- |
| 1 | Project foundation | **Complete** (tests pending) | App builds, shell renders, tokens shared, env documented |
| 2 | Authentication & authorisation | **Complete** (hosted Supabase verification pending) | Sign-in/out/reset/verify work; RLS on all tables; role dashboards; isolation tests |
| 3 | Institution management | Not started | Provision → configure → onboard; suspension; membership scopes |
| 4 | Academic administration | Not started | Sessions, programmes, courses, offerings, students, lecturers, groups, imports |
| 5 | Classroom & facilities | Not started | Rooms, features, availability, bookings without overlap, utilisation |
| 6 | Timetable management | Not started | Drafts, grid editing, publish, immutable versions, personal views, change requests |
| 7 | Conflict detection | Not started | All conflict kinds, severity, explanations, publication block, concurrency safety |
| 8 | Timetable generation | Not started | Feasible drafts from constraints, unsatisfiable reporting, cancellable runs |
| 9 | Lecturer workload | Not started | Derived hours, limits, warnings, reports, approvals |
| 10 | Academic calendar | Not started | Calendar CRUD, scheduling exclusions, ICS |
| 11 | Notifications | Not started | In-app + email, preferences, tenant-safe recipients |
| 12 | Attendance | Not started | Records, import, corrections, history, statistics |
| 13 | AI learning assistant | Not started | Grounded generations, credit ledger, review flow |
| 14 | Document generation | Not started | PDFs, storage metadata, signed downloads, approval |
| 15 | Analytics | Not started | Real metrics with "as of", role dashboards, exports |
| 16 | Subscriptions | Not started | Plans, periods, payments, server-side limit enforcement |
| 17 | White-label | Not started | Institution branding/domain configuration |
| 18 | Security hardening | Not started | Threat model verified, rate limits, audit coverage, dependency review |
| 19 | Performance | Not started | Index review, load results, generation benchmarks |
| 20 | Production deployment | Not started | Environments, backups, monitoring, runbooks |

## 3. Phase 1 report (delivered)

**Implemented**

- Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui (Radix) + Lucide + Recharts, ESLint configured.
- Design tokens for dark (default) and light themes, `dashboard-surface` and `glass-panel` treatments.
- Shell: icon rail, collapsible grouped sidebar with phase markers, sticky top bar (breadcrumbs, search, theme selector, notifications, account menu), mobile navigation sheet.
- Institution dashboard: welcome banner, stat cards, timetable activity chart, room utilisation donut, conflicts, events, workload, recent activity table.
- Supabase browser/server client factories with lazy environment validation, `.env.example`, project README, this documentation set.

**Not yet implemented**

- Automated test infrastructure (Vitest/Playwright) and CI pipelines.
- Authentication, database schema/migrations, RLS policies, middleware route protection.
- Logging/monitoring wiring and formatting (Prettier) configuration.
- All business modules from Phase 2 onward.

**Verification performed**

- `npm run lint` — pass.
- `npm run build` — pass (TypeScript clean, `/` prerendered).
- Dev server on `0.0.0.0:3000` answered `HTTP 200` for `/` with the preview host header and returned the dashboard markup.

## 4. Phase 2 report (delivered)

**Implemented**

- Tenancy migrations: `institutions`, `institution_settings`, `profiles`, `institution_memberships`, enums, profile-on-signup trigger, tenant helper functions.
- RLS enabled on all four tables with an institution-admin/platform-admin policy matrix; `anon` has no access; institution admins cannot grant platform roles or delete themselves.
- Invitation acceptance through the `accept_invitation(uuid)` definer RPC, so no membership policy reads its own table.
- Next.js 16 `proxy.ts` session refresh (replacing the deprecated `middleware` convention) and route protection for `/institution`, `/platform`, `/lecturer`, `/student`, `/no-access`.
- Email/password sign-in, password reset (PKCE callback plus token-hash confirmation), sign-out, and safe `next` redirects.
- Membership and capability resolution (`getAuthContext`, `requireUser`, `requireMember`, `requireCapability`) with a role → capability map.
- Public landing page, auth route group, membership-less `/no-access` guidance, and a capability-filtered shell that renders the resolved user, institution and role instead of placeholder identity.
- Typed subset of the schema in `src/types/database.ts`; `cacheComponents` disabled because authenticated routes read the session per request.

**Not yet implemented**

- Invitation creation/acceptance and member management screens (Phase 3), and the `/platform`, `/lecturer`, `/student` landing pages (guards exist, pages do not).
- Vitest/Playwright application tests, CI and a hosted deployment.
- Verification against a hosted Supabase project: the migrations were proven on a disposable PostgreSQL 16 cluster, not on a hosted project.

**Verification performed**

- `npm run lint` — pass.
- `npm run build` — pass; `/institution` and `/no-access` are dynamic, `/` and the auth screens are static.
- `next start` with a preview `Host` header: `/`, `/sign-in`, `/forgot-password` returned `200`; `/institution` and `/no-access` returned `307` to `/sign-in?next=…` while unauthenticated; `/auth/callback` without a code redirected to the sign-in error state.
- `npm run db:test` against a disposable PostgreSQL 16.15 cluster: both migrations apply with `ON_ERROR_STOP=1`; all tenant-isolation assertions pass for two institutions. Reinstating the previous membership update policy reproduces `infinite recursion detected in policy`.

**Follow-up fix (same phase)**

- The original `memberships_update` policy read `institution_memberships` inside its own `WITH CHECK`, which made every membership update recurse. Update rights are now limited to admins, and invitation acceptance uses the `accept_invitation` definer RPC.

## 5. Project structure

```
acadence/
├── docs/                       product, engineering and design documentation
├── public/
├── src/
│   ├── app/
│   │   ├── (public)/           public landing page
│   │   ├── (auth)/             sign-in, forgot/reset password, auth actions
│   │   ├── auth/               callback + confirm route handlers
│   │   ├── institution/        authenticated institution shell and dashboard
│   │   ├── no-access/          signed-in account without a membership
│   │   ├── platform/           planned: platform admin routes (guarded)
│   │   ├── lecturer/           planned (guarded)
│   │   ├── student/            planned (guarded)
│   │   └── api/v1/             planned: integrations and webhooks
│   ├── components/
│   │   ├── ui/                 shadcn primitives
│   │   ├── layout/             rail, sidebar, top bar, shell
│   │   ├── dashboard/          dashboard widgets
│   │   └── shared/             planned: tables, filters, states
│   ├── modules/                planned: domain modules
│   ├── services/               planned: cross-module business rules
│   ├── lib/
│   │   ├── supabase/           browser, server and proxy clients
│   │   ├── auth/               session, membership, capability resolution
│   │   ├── validation/         planned: zod schemas
│   │   └── utils.ts
│   ├── config/                 site constants, navigation, env
│   ├── data/                   Phase 1 sample data (to be replaced)
│   └── types/                  database types (generated types in a later phase)
├── supabase/
│   ├── migrations/             tenancy schema + RLS (Phase 2)
│   ├── seed.sql
│   └── tests/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
└── package.json
```

## 6. Git conventions

- Branches: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `chore/<scope>`.
- Commits: imperative subject scoped to the change, e.g. `feat(timetables): add draft publish transaction`. No mixed-purpose commits.
- Pull requests state the phase, the requirements addressed (`FR-*`), tests run, and documentation updated.
- `main` is protected: no force pushes, no direct commits; merges require green CI.
- Stable implementations are not overwritten without a recorded justification (ADR or phase report).

## 7. Traceability

| Phase | Requirement groups | Screens |
| --- | --- | --- |
| 1 | NFR-MAINT-001, NFR-RESP-001, NFR-A11Y-001 (shell) | `/` (now the public entry; dashboard moved to `/institution`) |
| 2 | FR-AUTH-001…010 | `/sign-in`, `/forgot-password`, `/reset-password`, `/no-access`, `/institution` |
| 3 | FR-INST-001…010 | `/institution/*`, `/platform/institutions*` |
| 4 | FR-ACAD-001…012 | `/institution/academics/*` |
| 5 | FR-ROOM-001…007 | `/institution/rooms` |
| 6 | FR-TT-001…012 | `/department/timetables`, `/lecturer/timetable`, `/student/timetable` |
| 7 | FR-CONF-001…010 | conflict report, publish dialog |
| 8 | FR-GEN-001…006 | generation run screens |
| 9 | FR-WL-001…004 | `/department/workloads` |
| 10–12 | FR-CAL, FR-NOT, FR-ATT | `/shared/calendar`, notifications, attendance |
| 13–14 | FR-AI-*, FR-DOC-* | `/student/study`, document history |
| 15–16 | FR-AN-*, FR-SUB-* | `/shared/analytics`, `/platform/plans` |

## 8. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Engineering | Roadmap with Phase 1 reported complete |
| 1.1 | 2026-11-24 | Engineering | Phase 2 authentication, memberships and RLS reported |
