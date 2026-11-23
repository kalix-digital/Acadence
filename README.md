# Acadence

Multi-institution academic scheduling, administration and analytics platform — Next.js + TypeScript + Supabase.

This repository currently contains **Phase 1 (project foundation)** of the implementation roadmap in [`project_plan.txt`](project_plan.txt): the application shell, design system and dashboard are in place; business modules, authentication and database schema are not yet implemented.

## Documentation

The authoritative product, architecture, database, UI/UX and roadmap documents live in [`docs/`](docs/README.md). Implementation follows them phase by phase; see [`docs/10-implementation/IMPLEMENTATION_ROADMAP.md`](docs/10-implementation/IMPLEMENTATION_ROADMAP.md).

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
cp .env.example .env.local   # optional until Phase 2
npm run dev
```

The app runs at http://localhost:3000. Dark theme is the default; the top bar has a theme selector for light mode.

## Project structure

```
docs/                    product + engineering documentation, design references
src/app/(dashboard)/     authenticated application shell and pages
src/components/ui/       shadcn/ui primitives
src/components/layout/   icon rail, sidebar, top bar, shell
src/components/dashboard/ dashboard widgets
src/config/              site constants, navigation model, env access
src/data/                Phase 1 sample data (replaced by Supabase queries)
src/lib/supabase/        browser + server Supabase clients
```

## Phase 1 scope

Implemented:

- Next.js + TypeScript + Tailwind + shadcn/ui foundation with linting.
- Acadence design tokens (dark navy default, light mode supported).
- Responsive shell: icon rail, grouped sidebar with planned-module markers, top bar with search, theme selector, notifications and account menu.
- Institution dashboard composed of reusable cards, charts, tables and workload indicators.
- Supabase browser/server clients and documented environment variables.

Not implemented yet: Supabase project provisioning, authentication, database migrations, RLS policies, automated tests, and every business module (see the roadmap below).

## Roadmap

Phases follow `project_plan.txt`: 2 auth & RBAC, 3 institutions, 4 academic administration, 5 facilities, 6 timetables, 7 conflicts, 8 generation engine, 9 workloads, 10 calendar, 11 notifications, 12 attendance, 13 AI assistant, 14 documents, 15 analytics, 16 subscriptions, 17 white-label, 18–20 hardening and deployment.

## Design reference

The dashboard reference image is stored at [`docs/07-ui-ux/reference-dashboard.png`](docs/07-ui-ux/reference-dashboard.png); the existing architecture guide is in [`docs/reference/`](docs/reference/).
