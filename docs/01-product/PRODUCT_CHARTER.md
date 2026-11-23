# Acadence — Product Charter

> **Document ID:** PRD-CHARTER-001 · **Version:** 1.0 · **Status:** Approved · **Date:** 2026-11-23 · **Owner:** Product
> **Related:** [PRD](../03-requirements/PRD.md) · [Business Model](../02-business/BUSINESS_MODEL.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md) · [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md)

## 1. Product identity

| Field | Value |
| --- | --- |
| Name | Acadence |
| Category | Academic scheduling, administration and AI-assisted learning SaaS |
| Primary market | Nigerian universities, polytechnics and colleges; international expansion later |
| Delivery | Multi-tenant web application (desktop, tablet, mobile web) |
| Business model | Institution subscriptions with AI credit top-ups |

## 2. Problem statement

Higher-education institutions assemble timetables by hand across spreadsheets, email and departmental memory. The consequences are predictable and expensive:

- Lecturer double-bookings and room collisions discovered after publication.
- Room capacity and suitability violations, and invisible utilisation waste.
- Workload disputes because contact hours are counted differently in every department.
- Timetables that exist only as PDFs, so students and lecturers cannot query them.
- No audit trail when a published timetable silently changes before an examination.

Acadence replaces this with one academic operations system: a single source of truth for the academic structure, a constraint-checked scheduling engine, versioned timetables, and role-aware portals for every level of the institution.

## 3. Vision

> Every institution should be able to publish a conflict-free, workload-fair timetable in hours — and every student and lecturer should know exactly where they are supposed to be.

Acadence becomes the trusted academic operations platform for African higher education, starting with one department and expanding without re-architecture: department → faculty → institution → multiple institutions.

## 4. Objectives (12-month horizon)

| ID | Objective | Measure |
| --- | --- | --- |
| OBJ-01 | Replace manual timetable assembly | ≥ 80% of timetables generated or validated in Acadence |
| OBJ-02 | Eliminate publication of hard-constraint violations | 0 published timetables with critical conflicts |
| OBJ-03 | Make academic information self-service | ≥ 60% of students and lecturers view their timetable in-app weekly |
| OBJ-04 | Prove multi-tenant isolation | 0 cross-tenant data exposures; isolation tests in CI |
| OBJ-05 | Establish recurring revenue | 3 paying institutions within two semesters |

## 5. Product principles

1. **Correctness before convenience.** A timetable that violates a hard constraint is never published, whatever the pressure.
2. **Configuration over assumption.** Academic rules differ per institution; they are settings, not hardcoded policy.
3. **Server-side truth.** Authorisation is enforced in the database and on the server; the browser never decides access.
4. **One design language.** Every portal uses the same tokens, shell and component library.
5. **Honest state.** The product never shows a mock as if it were live data; planned functionality is labelled.
6. **Incremental delivery.** Each phase ships something testable and documented.

## 6. Scope

### In scope for v1

Institution provisioning and memberships; academic hierarchy (campus, faculty, department, programme, course); students, lecturers and groups; buildings and rooms; timetable drafts, publishing, versioning and change requests; conflict detection; workload management; academic calendar; attendance records; notifications; analytics; subscriptions and AI credits; AI learning assistant with document generation.

### Out of scope for v1

- Learning management (course content delivery, assessments, grading, transcripts).
- Finance/student billing systems, HR payroll, library systems.
- Native mobile applications (responsive web first).
- Institutional single sign-on beyond Supabase Auth providers (SAML/SCIM deferred; see assumptions register).
- A general-purpose optimisation service in Python (interfaces designed, implementation deferred to Phase 8 evaluation).

## 7. Users

Platform Super Admin · Institution Admin · Faculty Admin · Department Admin · Lecturer · Student · Support/Onboarding Operator. Permissions are defined in the PRD and enforced by RLS plus server checks.

## 8. Success criteria for v1

- An institution can be provisioned, configured and onboarded without engineering involvement.
- A department can create a semester, import courses, students and rooms, generate a timetable, resolve conflicts and publish it.
- Students and lecturers see only their own institution's published timetables.
- Every mutation to a timetable or institution setting is attributable in the audit log.
- The platform runs on the approved stack with documented operations.

## 9. Constraints and assumptions

- Stack is fixed by ADR-002; changes require a new ADR.
- Scheduling optimisation is single-tenant, per-semester and must complete within the platform's request limits (see architecture §11).
- Institutions may have intermittent connectivity; the interface must remain usable on mid-range Android browsers.
- Pricing and payment-provider selection remain open decisions (assumptions register).

## 10. Lifecycle

| Stage | Entry condition | Exit artefact |
| --- | --- | --- |
| Discovery | Reference material supplied | This charter, PRD |
| Documentation | Charter approved | Documentation milestone (this set) |
| Foundation | Documentation approved | Phase 1 application shell |
| Core academic operations | Foundation approved | Phases 2–7 |
| Intelligence and insight | Conflict engine stable | Phases 8–15 |
| Commercialisation | Analytics live | Phases 16–17 |
| Hardening and launch | Commercial features approved | Phases 18–20 |

## 11. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Product | Initial charter, derived from `project_plan.txt` and the architecture guide |
