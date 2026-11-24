# Acadence

Multi-institution academic scheduling, administration and analytics platform — Next.js + TypeScript + Supabase.

This repository currently contains **Phases 1 and 2** of the implementation roadmap in [`project_plan.txt`](project_plan.txt):

- **Phase 1 — foundation:** application shell, design system and dashboard.
- **Phase 2 — identity and tenancy:** Supabase authentication, protected routes, institution memberships, role capabilities and the first RLS migrations.

Business modules (academic administration, scheduling, rooms, workload, analytics) are not implemented yet.

## Documentation

The authoritative product, architecture, database, UI/UX and roadmap documents live in [`docs/`](docs/README.md). Implementation follows them phase by phase; see [`docs/10-implementation/IMPLEMENTATION_ROADMAP.md`](docs/10-implementation/IMPLEMENTATION_ROADMAP.md) and [`docs/05-database/AUTH_AND_MEMBERSHIPS.md`](docs/05-database/AUTH_AND_MEMBERSHIPS.md).

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix primitives) |
| Icons | Lucide React |
| Charts | Recharts |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth + RLS |
| Deployment | Vercel |

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs at http://localhost:3000. Dark theme is the default; the top bar has a theme selector for light mode.

Without Supabase values the public landing page and the auth screens still render, with sign-in disabled and a configuration notice. To enable real sign-in:

1. Create a Supabase project and put its URL and anon key in `.env.local`.
2. Apply the tenancy migrations: `supabase link --project-ref <ref>` then `supabase db push`.
3. Create the first user in Supabase Auth, then insert an `institution_memberships` row (`role = 'institution_admin'`, `status = 'active'`) with the service-role key or the SQL editor.
4. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin so password-reset and verification emails link back correctly.
5. In Supabase Auth → URL configuration, allow `http://localhost:3000/auth/callback` and the production equivalent.

Database changes are covered by tenant-isolation tests that apply both migrations to a disposable PostgreSQL cluster:

```bash
npm run db:test
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/sign-in`, `/forgot-password`, `/reset-password` | Authentication |
| `/institution` | Institution dashboard (requires an active membership) |
| `/no-access` | Signed-in account without a membership |
| `/auth/callback`, `/auth/confirm` | Email link handlers; exchange the code/token for a session |

## Project structure

```
docs/                    product + engineering documentation, design references
supabase/migrations/     tenancy schema and RLS policies (Phase 2)
src/proxy.ts             session refresh and route protection
src/app/(public)/        public landing page
src/app/(auth)/          sign-in, password reset, auth server actions
src/app/auth/            email callback and confirmation route handlers
src/app/institution/     authenticated institution shell and dashboard
src/app/no-access/       membership-less account guidance
src/components/ui/       shadcn/ui primitives
src/components/layout/   icon rail, sidebar, top bar, shell
src/components/dashboard/ dashboard widgets
src/components/auth/     sign-out control
src/config/              site constants, navigation model, env access
src/data/                sample dashboard data (replaced by Supabase queries)
src/lib/auth/            session, membership and capability resolution
src/lib/supabase/        browser, server and proxy Supabase clients
src/types/database.ts    handwritten Phase 2 schema types
```

## Phase 1 and 2 scope

Implemented:

- Next.js + TypeScript + Tailwind + shadcn/ui foundation with linting.
- Acadence design tokens (dark navy default, light mode supported).
- Responsive shell and institution dashboard (metrics still sample data).
- Supabase browser/server clients and documented environment variables.
- Email/password sign-in, password reset, session refresh in the Next.js proxy, protected routes and capability-filtered navigation.
- Tenancy migrations: institutions, settings, profiles, memberships, helper functions and RLS policies.

Not implemented yet: invitations UI, member management, role landing pages, automated tests/CI, every business module from Phase 3 onward.

## Roadmap

Phases follow `project_plan.txt`: 2 auth & RBAC, 3 institutions, 4 academic administration, 5 facilities, 6 timetables, 7 conflicts, 8 generation engine, 9 workloads, 10 calendar, 11 notifications, 12 attendance, 13 AI assistant, 14 documents, 15 analytics, 16 subscriptions, 17 white-label, 18–20 hardening and deployment.

## Design reference

The dashboard reference image is stored at [`docs/07-ui-ux/reference-dashboard.png`](docs/07-ui-ux/reference-dashboard.png); the existing architecture guide is in [`docs/reference/`](docs/reference/).
