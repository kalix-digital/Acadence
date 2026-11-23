# Acadence — Assumptions and Open Questions Register

> **Document ID:** GOV-ASM-001 · **Version:** 1.0 · **Status:** Open · **Date:** 2026-11-23 · **Owner:** Product
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
| OQ-003 | Do students self-register or receive invitations only? | Auth flow, abuse prevention, data quality | Phase 2 | Open |
| OQ-004 | Should institution access use path-based routing (`/institution/[slug]`) or subdomains? | Tenant resolution, branding, cookie scope | Phase 3 | Open (path-based assumed for v1) |
| OQ-005 | Is support impersonation allowed, and under what audit/consent rules? | Security model and audit requirements | Phase 2 | Open (disabled until decided) |
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

## How to close an item

1. Record the decision, its date, and the deciding owner.
2. Update every affected document (PRD, SRS, architecture, database) in the same change.
3. If the decision changes architecture, add an ADR.
4. Move the item to "Closed decisions" below with a link to the change.

## Closed decisions

| ID | Decision | Date | Reference |
| --- | --- | --- | --- |
| — | Modular monolith, Next.js + Supabase + Vercel, RLS isolation, TypeScript engine first | 2026-11-23 | ADR-001 … ADR-004 |

## Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Product | Initial register |
