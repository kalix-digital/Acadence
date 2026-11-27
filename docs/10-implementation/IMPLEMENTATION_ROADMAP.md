# Acadence — Technical Implementation Roadmap

> **Document ID:** IMP-001 · **Version:** 1.4 · **Status:** Active · **Date:** 2026-11-27 · **Owner:** Engineering Lead
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
| 2 | Authentication & authorisation | **Complete** (merged to `main`; hosted Supabase verification pending) | Sign-in/out/reset/verify work; RLS on all tables; role dashboards; isolation tests |
| 3 | Institution management | **Complete** (awaiting approval; hosted verification pending) | Provision → configure → onboard; suspension; membership scopes |
| 4 | Academic administration | **Complete** (awaiting approval) | Campuses, faculties, departments, sessions, semesters, programmes, courses, curricula |
| 4b | People, groups, offerings & calendar | **Complete** (awaiting approval; hosted verification pending) | Students, lecturers, cohort groups, course offerings, academic calendar, CSV imports |
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

## 5. Phase 3 report (delivered)

**Decisions applied before implementation**

| Open question | Decision |
| --- | --- |
| OQ-003 | Invitation-only accounts. No public self-registration; the invited address creates an account only by accepting a single-use token. |
| OQ-004 | `/institution` stays path-based, with an institution switcher for users who belong to several tenants. Subdomains deferred to Phase 17. |
| OQ-005 | No impersonation in v1. Support visibility is read-only and tenant-scoped. |
| Provisioning | Platform administrators provision institutions; there is no public request form. |
| Scope | Institutions, settings, branding, memberships, invitations and activity. Campuses remain with the academic hierarchy in Phase 4–5. |

**Implemented**

- Migration `20261124120000_institution_management.sql`: `institution_invitations` (hashed single-use tokens, expiry, revocation), `institution_activity` (append-only audit trail written by definer triggers), `profiles.email`, a column-level guard that only platform administrators may change institution status or slug, and three definer RPCs: `create_invitation`, `invitation_preview`, `accept_invitation_token`.
- Invitation authorisation is enforced in the database: platform admin, or institution admin of that institution only; platform roles cannot be invited; duplicate pending invitations and existing members are rejected; the invited address must match the accepting account.
- Platform console: overview with real counts, institution list, provisioning form, institution detail with status controls, administrator invitation and activity trail.
- Institution settings: profile, branding, timezone, working days, slot length, teaching day, weekly contact-hour limit and exam-teaching policy, validated server-side.
- Members and roles: member list with real profile emails, role changes, suspension/reactivation, removal, invitation creation with a copyable one-time link, and invitation revocation. Administrators cannot change their own role, status or membership.
- Public `/invite/[token]` acceptance screen: previews the institution and role, supports an existing account or creates one for the invited address, enforces email match, and reports accepted/revoked/expired/consumed states.
- Invitation email through Resend when `RESEND_API_KEY` is set; otherwise the link is returned to the inviter. Tokens are stored only as SHA-256 hashes and are never logged.
- Institution switcher backed by an http-only cookie that is re-validated against active memberships on every request; navigation and shell render platform or institution trees.
- Profile emails are backfilled and maintained by the signup trigger, so members lists never invent identity data.

**Not yet implemented**

- Campuses, faculties and departments (Phase 4–5), and the institution onboarding checklist (FR-INST-008).
- Platform analytics beyond counts, and support tooling (no impersonation by decision).
- Hosted verification: the migrations are proven on a disposable PostgreSQL 16 cluster, not a hosted Supabase project; Resend delivery has not been exercised with a live API key.
- Vitest/Playwright application tests and CI wiring.

**Verification performed**

- `npm run db:test` — both Phase 2 migrations plus the Phase 3 migration apply with `ON_ERROR_STOP=1`; `tenancy_isolation.sql` and `institution_management.sql` both pass. The Phase 3 suite covers authorisation of invitation creation (including cross-tenant and lecturer denial), token acceptance by the wrong email, token reuse, revocation and re-invitation, status-guard rejection for institution admins, role escalation, activity-trail visibility per tenant, and `anon` denial.
- The first version of `create_invitation` failed the cross-tenant test: `auth_role()` is `NULL` for a non-member and `not (false or null)` is `NULL`, so the guard never fired. The guard now coalesces to `false`; the test that caught it is committed.
- `npm run lint` — pass.
- `npm run build` — pass; `/platform`, `/platform/institutions`, `/platform/institutions/new`, `/platform/institutions/[id]`, `/institution/members`, `/institution/settings` and `/invite/[token]` are dynamic.

## 5.1 Phase 4 report (delivered)

| Field | Value |
| --- | --- |
| Scope | Campuses, faculties, departments, academic sessions, semesters, programmes, courses and programme curricula. |
| Deferred by decision | Students, lecturers, student groups, course offerings, the academic calendar and CSV imports were separated from this phase so the hierarchy stabilises before people and scheduling records depend on it. |
| Migration | `20261125120000_academic_structure.sql` |
| Tests | `supabase/tests/academic_structure.sql` |

**Implemented**

- Hierarchy `campuses → faculties → departments`. `campus_id` is optional on a faculty (OQ-016), and every parent reference is a composite `(institution_id, id)` foreign key, so a record can never point at another tenant's parent — not even for `service_role`.
- Academic sessions and semesters with date-ordering constraints, and `programme_courses` linking programmes to shared courses (OQ-017) with a level and required/elective flag.
- Writes are role-scoped by `public.can_manage_academic_unit(institution_id, faculty_id, department_id)`: institution admins write anywhere in the institution, faculty admins inside their faculty, department admins inside their department. Reads are open to every active member of the tenant.
- Archive-only removal (OQ-018): `archived_at` on every table, no DELETE policy and no DELETE grant for `authenticated`.
- Every create, update, archive and restore is written to `institution_activity` by one definer trigger as `academic.<entity>.<action>`.
- Application: `/institution/academics` overview (counts, hierarchy, section links, recent academic changes) plus screens for campuses, faculties, departments, sessions and semesters, programmes, and courses and curriculum. Each has a validated create/edit form, search, active/archived filter, pagination and archive/restore.
- Navigation and the icon rail link to the academic screens instead of a Phase 4 placeholder.
- Validation is repeated server-side: codes, name lengths, unit and level ranges, date ordering, duplicate-code and RLS refusals are mapped to field-level messages.

**Not yet implemented**

- Students, lecturers, student groups, course offerings, the academic calendar and CSV/Excel imports (Phase 4b).
- Institution onboarding checklist (FR-INST-008).
- A single view of the whole academic tree; the hierarchy is browsed level by level.
- Requesting a wider scope from the UI: a faculty or department administrator can read the tenant but is refused writes outside their scope by the database.

**Verification performed**

- `npm run db:test` — four migrations apply with `ON_ERROR_STOP=1`; `tenancy_isolation.sql`, `institution_management.sql` and `academic_structure.sql` pass. Phase 4 coverage: institution/faculty/department administrator scope, cross-tenant insert refusal, cross-tenant UPDATE filtered to zero rows, composite-FK rejection of a foreign campus, duplicate codes, session/semester date rules, one course required by two programmes, archive and restore with activity records, missing DELETE privilege, platform cross-tenant visibility, and `anon` denial.
- Two defects were caught by the suite while writing it: SQL helpers that read `departments`/`programmes` were defined before those tables existed (moved below the DDL), and the activity trigger read `new.title` on tables without that column (replaced with `to_jsonb` access).
- `npm run lint` — pass, no warnings.
- `npm run build` — pass; `/institution/academics` and its six sub-routes are dynamic.

## 5.2 Phase 4b report (delivered)

| Field | Value |
| --- | --- |
| Scope | Students, lecturers, student groups and membership, course offerings with lecturer assignments and linked groups, the academic calendar, and CSV imports. |
| Migration | `20261126120000_people_offerings_calendar.sql` |
| Tests | `supabase/tests/people_offerings_calendar.sql` |

**Implemented**

- **Records before accounts (OQ-020).** `students` and `lecturers` carry a nullable `user_id` that is unique per institution. A roster can be imported or entered before anyone is invited, and an account is linked later without changing the record's identity.
- **Identifiers (OQ-021).** Matriculation and staff numbers are mandatory and unique across the institution; email is optional but unique case-insensitively when present. Both are checked in the database and reported per row during an import.
- **Cohort groups (OQ-022).** `student_groups` is programme + level + session; `student_group_members` is many-to-many with a partial unique index, so a student can be in a cohort group and a lab group at once, and a membership can be archived and restored.
- **Course offerings (OQ-023).** One offering per course per semester, with an optional coordinator, separate lecturer assignments (`lead`/`assistant`, optional contact hours) and linked student groups. A composite foreign key on `(institution_id, semester_id, session_id)` makes it impossible to place an offering in a semester from another session.
- **Calendar (OQ-024).** Events belong to a session and may be narrowed to a semester. Teaching weeks are derived in `src/lib/academics/calendar.ts` from the semester's teaching window and holiday events; nothing is stored, so editing a holiday immediately changes the count.
- **Imports (OQ-025).** `src/lib/academics/import.ts` reads RFC 4180 CSV (quoted fields, CRLF, BOM), accepts common header aliases, and validates every row against the same rules as the form plus existing identifiers and in-file duplicates. The panel validates first, then imports the whole batch in a single insert: one bad row imports nothing.
- **Screens.** `/institution/academics/students`, `/lecturers`, `/groups`, `/offerings` and `/calendar`, each with create/edit, search, filters, pagination, archive/restore and an import panel where it applies. The overview counts and navigation now include all five.
- **Database conventions.** The same composite tenant keys, definer scope helpers, archive-only removal and `institution_activity` logging as Phase 4. New resolvers: `student_group_programme`, `course_department`, `offering_course`.

**Not yet implemented**

- Excel (`.xlsx`) import; only CSV is read.
- Partial import or per-row retry; a file must be clean before anything is written.
- Linking an imported record to an account from the screen; the column exists and the invitation flow already accepts the role.
- Lecturer workload limits (Phase 9) and the ICS calendar feed (Phase 10).
- A search-based student picker for very large rosters; the group-membership form lists up to 500 students by surname.

**Verification performed**

- `npm run db:test` — five migrations apply with `ON_ERROR_STOP=1`; all four suites pass. Phase 4b coverage: records created without an account, one account per student, duplicate matric/staff/email rejection, malformed identifiers, department and faculty write scope, lecturer read-only access, many-to-many membership with duplicate rejection, cross-tenant membership and offering references, one offering per course per semester, semester/session mismatch, duplicate and unknown lecturer assignments, calendar date and session rules, archive/restore activity records, missing DELETE privilege, cross-tenant invisibility, and `anon` denial.
- `npm run lint` — pass, no warnings.
- `npm run build` — pass; the five new routes are dynamic and appear in the route table.
- Not verified: no hosted Supabase project is attached, so no screen has been exercised signed in; CSV import has been unit-checked only through its validation paths, not against a live database.

## 6. Project structure

```
acadence/
├── docs/                       product, engineering and design documentation
├── public/
├── src/
│   ├── app/
│   │   ├── (public)/           public landing page
│   │   ├── (auth)/             sign-in, forgot/reset password, auth actions
│   │   ├── auth/               callback + confirm route handlers
│   │   ├── institution/        dashboard, members/invitations, settings,
│   │   │                       academics/ (campuses, faculties, departments,
│   │   │                       sessions, programmes, courses, curriculum)
│   │   ├── invite/[token]/     public invitation acceptance
│   │   ├── no-access/          signed-in account without a membership
│   │   ├── platform/           platform overview, institutions, provisioning
│   │   ├── lecturer/           planned (guarded)
│   │   ├── student/            planned (guarded)
│   │   └── api/v1/             planned: integrations and webhooks
│   ├── components/
│   │   ├── ui/                 shadcn primitives
│   │   ├── layout/             rail, sidebar, top bar, shell, tenant switcher
│   │   ├── dashboard/          dashboard widgets
│   │   ├── institutions/       status badges, invite and settings forms
│   │   ├── invite/             acceptance and account-creation forms
│   │   ├── platform/           provisioning form
│   │   └── shared/             submit button, copy field
│   ├── modules/                planned: domain modules
│   ├── services/               planned: cross-module business rules
│   ├── lib/
│   │   ├── supabase/           browser, server and proxy clients
│   │   ├── auth/               session, membership, capability resolution
│   │   ├── institutions/       tenant queries, invitations, validation
│   │   ├── email/              Resend invitation delivery
│   │   ├── validation/         planned: zod schemas
│   │   └── utils.ts
│   ├── config/                 site constants, navigation, env
│   ├── data/                   Phase 1 sample data (to be replaced)
│   └── types/                  database types (generated types in a later phase)
├── supabase/
│   ├── migrations/             tenancy schema + RLS (Phase 2), invitations + activity (Phase 3)
│   ├── seed.sql
│   └── tests/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
└── package.json
```

## 7. Git conventions

- Branches: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `chore/<scope>`.
- Commits: imperative subject scoped to the change, e.g. `feat(timetables): add draft publish transaction`. No mixed-purpose commits.
- Pull requests state the phase, the requirements addressed (`FR-*`), tests run, and documentation updated.
- `main` is protected: no force pushes, no direct commits; merges require green CI.
- Stable implementations are not overwritten without a recorded justification (ADR or phase report).

## 8. Traceability

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

## 9. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Engineering | Roadmap with Phase 1 reported complete |
| 1.1 | 2026-11-24 | Engineering | Phase 2 authentication, memberships and RLS reported |
| 1.2 | 2026-11-25 | Engineering | Phase 2 merged; Phase 3 institution management, invitations and members reported complete pending approval |
| 1.3 | 2026-11-25 | Engineering | Phase 3 merged to `main`; Phase 4 academic structure reported complete pending approval, with people and scheduling records deferred to 4b |
| 1.4 | 2026-11-27 | Engineering | Phase 4b students, lecturers, cohort groups, course offerings, academic calendar and CSV imports reported complete pending approval |
