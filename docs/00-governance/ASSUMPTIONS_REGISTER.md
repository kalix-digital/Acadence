# Acadence — Assumptions and Open Questions Register

> **Document ID:** GOV-ASM-001 · **Version:** 1.2 · **Status:** Open (seven items closed) · **Date:** 2026-11-25 · **Owner:** Product
> **Related:** [Documentation Index](../README.md) · [PRD](../03-requirements/PRD.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md)

This register lists every decision that cannot yet be made from available evidence. Nothing here is implemented as an assumption: the affected feature either stays configurable or waits for the decision.

## Assumptions in force

| ID | Assumption | Impact if wrong |
| --- | --- | --- |
| ASM-00 | Documents are the authoritative source; code that contradicts them is a defect | Divergence between product intent and implementation |
| ASM-00b | The approved stack (ADR-002) is fixed for v1 | Re-architecture and migration cost |
| ASM-00c | Dark navy is the default visual theme for all roles | Design rework across every screen |
| ASM-00d | Institutions operate a two-semester session by default, configurable per institution | Calendar and scheduling assumptions |

## Open questions

| ID | Question | Why it matters | Needed by | Status |
| --- | --- | --- | --- | --- |
| OQ-001 | Are plan prices and student bands acceptable to design partners? | Billing implementation and margin | Phase 16 | Open |
| OQ-002 | Which payment provider (cards + bank transfer + reconciliation)? | Payments, webhooks, refunds | Phase 16 | Open |
| OQ-003 | Do students self-register or receive invitations only? | Auth flow, abuse prevention, data quality | Phase 2 | **Closed** — invitation-only |
| OQ-004 | Should institution access use path-based routing (`/institution/[slug]`) or subdomains? | Tenant resolution, branding, cookie scope | Phase 3 | **Closed** — `/institution` + switcher |
| OQ-005 | Is support impersonation allowed, and under what audit/consent rules? | Security model and audit requirements | Phase 2 | **Closed** — none in v1 |
| OQ-006 | What is the canonical workload formula (contact hours, supervision, marking weights)? | Workload reports and overload warnings | Phase 9 | Open (contact hours + configurable weights implemented) |
| OQ-007 | Are examination timetables part of v1 or a separate module? | Data model and UI scope | Phase 6 | Open (v1 covers teaching timetables; exam periods only block teaching) |
| OQ-008 | Which AI provider and model tiers, and what is one credit worth? | Cost control and capability | Phase 13 | Open (provider abstracted server-side) |
| OQ-009 | Do institutions require their own email domains for notifications? | Deliverability, DNS setup per tenant | Phase 17 | Open |
| OQ-010 | What attendance systems must be integrated, and in which format? | Integration interface design | Phase 12 | Open (generic interface + CSV first) |
| OQ-011 | Audit log retention per institution (default 24 months)? | Storage cost, compliance | Phase 18 | Open (default applied) |
| OQ-012 | Are custom domains required for white-label, or is branding sufficient? | Hosting, TLS, tenant resolution | Phase 17 | Open |
| OQ-013 | Required backup/RPO/RTO commitments for institutional contracts? | Operations cost and SLA | Phase 20 | Open |
| OQ-014 | Should room bookings require approval, and by whom? | Facilities workflow | Phase 5 | Open (auto-approve within scope) |
| OQ-015 | Are multi-campus institutions billed per campus or per student band? | Commercial model | Phase 16 | Open |
| OQ-016 | Are campuses part of Phase 4, and is a campus required for every faculty? | Hierarchy shape, onboarding friction, Phase 5 room model | Phase 4 | **Closed** — optional campus on faculty |
| OQ-017 | Does a course belong to one programme, or can several programmes require it? | Curriculum model and duplicate courses | Phase 4 | **Closed** — `programme_courses` join table |
| OQ-018 | May academic records ever be hard-deleted, or only archived? | Referential history, audit integrity | Phase 4 | **Closed** — archive only |
| OQ-019 | Are students, lecturers, groups, offerings, calendar and imports part of this phase? | Delivery scope and dependency risk | Phase 4 | **Closed** — deferred to Phase 4b |

## How to close an item

1. Record the decision, its date, and the deciding owner.
2. Update every affected document (PRD, SRS, architecture, database) in the same change.
3. If the decision changes architecture, add an ADR.
4. Move the item to "Closed decisions" below with a link to the change.

## Closed decisions

| ID | Decision | Date | Reference |
| --- | --- | --- | --- |
| — | Modular monolith, Next.js + Supabase + Vercel, RLS isolation, TypeScript engine first | 2026-11-23 | ADR-001 … ADR-004 |
| OQ-003 | Accounts are invitation-only. There is no public sign-up; an invitation is a single-use email token, and the invited address gets an account only by accepting it. | 2026-11-25 | [AUTH_AND_MEMBERSHIPS §4.2](../05-database/AUTH_AND_MEMBERSHIPS.md) |
| OQ-004 | Institution routes stay at `/institution`; the active tenant comes from a validated membership and a cookie-backed switcher. Path slugs and subdomains are deferred to Phase 17. | 2026-11-25 | [Roadmap §5](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-005 | Support operators and platform administrators cannot impersonate users in v1. Support has read-only, tenant-scoped visibility and every administrative action is attributed by `auth.uid()`. | 2026-11-25 | [Roadmap §5](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-016 | Campuses ship in Phase 4 as the optional top of the hierarchy. `faculties.campus_id` is nullable, so a single-site institution never creates one; Phase 5 rooms and buildings carry the campus. | 2026-11-25 | [DATABASE_DESIGN §4.2](../05-database/DATABASE_DESIGN.md) |
| OQ-017 | A course belongs to a department and is linked to any number of programmes through `programme_courses` (level, required/elective). Shared courses such as GST 101 are never duplicated per programme. | 2026-11-25 | [DATABASE_DESIGN §4.2](../05-database/DATABASE_DESIGN.md) |
| OQ-018 | Academic records are archived, never deleted. Every table has `archived_at`; `authenticated` holds no DELETE grant and no table has a DELETE policy, so archives are the only removal the application can perform. Archived records stay visible in an "Archived" view and can be restored. | 2026-11-25 | [Roadmap §5.1](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-019 | Phase 4 delivers the academic structure only: campuses, faculties, departments, sessions, semesters, programmes, courses and curricula. Students, lecturers, student groups, course offerings, the academic calendar and CSV imports move to Phase 4b, after the hierarchy is proven in use. | 2026-11-25 | [Roadmap §5.1](../10-implementation/IMPLEMENTATION_ROADMAP.md) |

## Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Product | Initial register |
| 1.1 | 2026-11-25 | Product | Closed OQ-003 (invitation-only), OQ-004 (`/institution` with switcher) and OQ-005 (no impersonation) for Phase 3 |
| 1.2 | 2026-11-25 | Product | Closed OQ-016 (optional campus), OQ-017 (`programme_courses`), OQ-018 (archive only) and OQ-019 (Phase 4 scope) for Phase 4 |
