# Acadence — Testing Strategy

> **Document ID:** QA-001 · **Version:** 1.0 · **Status:** Approved · **Date:** 2026-11-23 · **Owner:** QA Engineering
> **Related:** [SRS](../03-requirements/SRS.md) · [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md)

## 1. Objectives

1. Prove tenant isolation on every release — a cross-institution read is a release blocker.
2. Prove scheduling correctness: no published hard-constraint violation, ever.
3. Prove authorisation: no capability reachable by an unauthorised role, including via direct API calls.
4. Keep feedback fast enough to run on every pull request.

## 2. Test levels

| Level | Scope | Tooling | Runs |
| --- | --- | --- | --- |
| Static | TypeScript, ESLint, migration lint | `tsc`, ESLint, SQL checks | Pre-commit and CI |
| Unit | Services and pure functions (conflict rules, slot maths, workload, capability resolution) | Vitest | CI on every PR |
| Integration | Server actions / route handlers against a real Postgres (local Supabase) | Vitest + Supabase local | CI |
| RLS / isolation | Policies exercised as two tenants with different roles | SQL fixtures + Vitest | CI, and before every deploy |
| End-to-end | Critical journeys in a browser | Playwright | Pre-release and nightly |
| Performance | Key list and publish paths; generation at scale | k6 or scripted load | Before launch and after schema changes |

## 3. Coverage expectations

- Business logic services: ≥ 85% line coverage.
- Conflict detection and scheduling engine: every rule has a positive and a negative test, plus property-based tests for overlap (random entries must never both publish if they overlap).
- Authorisation: a table-driven test iterating every capability × role, asserting allowed/denied at the server boundary.
- No coverage requirement on presentational components; visual behaviour is covered by E2E smoke tests on the shell and one representative CRUD screen.

## 4. Mandatory test suites per phase

| Phase | Required suites |
| --- | --- |
| 2 Auth | Sign-up/in/out, reset, verification, session refresh, protected-route redirects, role escalation attempts, cross-tenant membership access |
| 3 Institutions | Provisioning, suspension blocks sign-in, branding isolation, membership scope enforcement |
| 4 Academics | CRUD, duplicate codes, CSV import validation and rollback, archive behaviour, pagination |
| 5 Facilities | Capacity/suitability rules, concurrent booking overlap rejected, availability computation |
| 6 Timetables | Draft CRUD, publish transaction, version immutability, concurrent publish, personal views filtered by role |
| 7 Conflicts | Each conflict kind, severity classification, publication block, revalidation bypass attempts, concurrent inserts |
| 8 Generation | Feasibility, hard-constraint preservation, unsatisfiable input reporting, cancellation, replayability |
| 9 Workload | Contact-hour derivation, limit warnings, approval workflow |
| 10–12 | Calendar exclusion rules, notification recipients, attendance import and correction |
| 13–14 | Credit ledger debits, insufficient-credit blocking, provider failure handling (mocked), signed download authorisation |
| 15–16 | Metric correctness against seeded fixtures, plan limit enforcement in server actions |

## 5. Test data

- Fixtures: two institutions, each with two campuses, three faculties, six departments, a semester, 40 offerings, 60 rooms, 80 lecturers, 400 students, two published versions.
- Deterministic seeds produce stable IDs; no production data is copied into test environments.
- E2E uses a dedicated local Supabase instance and resets between scenarios.

## 6. CI gates

A pull request cannot merge unless:

1. `npm run lint` and `npm run build` pass.
2. Unit and integration suites pass.
3. Isolation suite passes.
4. New migrations apply cleanly to an empty database and to a snapshot of the previous schema.
5. Documentation affected by the change is updated in the same PR.

## 7. Defect policy

- A failing conflict, isolation or authorisation test blocks the phase, regardless of deadline.
- Bugs found in production get a regression test before the fix is merged.
- Known limitations are recorded in the roadmap's phase report, never hidden behind a skipped test.

## 8. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | QA | Initial strategy |
