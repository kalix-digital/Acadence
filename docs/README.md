# Acadence Documentation

> **Document ID:** DOC-INDEX · **Version:** 1.1 · **Status:** Approved for implementation · **Date:** 2026-11-24 · **Owner:** Product & Engineering

Acadence is a multi-institution academic scheduling, administration and AI-assisted learning platform. This directory holds the authoritative product, engineering and design documentation that implementation must follow, as required by `project_plan.txt`.

## How to use this documentation

1. Read [`01-product/PRODUCT_CHARTER.md`](01-product/PRODUCT_CHARTER.md) and [`03-requirements/PRD.md`](03-requirements/PRD.md) for *what* Acadence is.
2. Read [`04-architecture/SYSTEM_ARCHITECTURE.md`](04-architecture/SYSTEM_ARCHITECTURE.md) and [`05-database/DATABASE_DESIGN.md`](05-database/DATABASE_DESIGN.md) for *how* it is built.
3. Read [`07-ui-ux/DESIGN_SYSTEM.md`](07-ui-ux/DESIGN_SYSTEM.md) before touching any interface.
4. Work phases strictly as defined in [`10-implementation/IMPLEMENTATION_ROADMAP.md`](10-implementation/IMPLEMENTATION_ROADMAP.md).
5. Record every unresolved decision in [`00-governance/ASSUMPTIONS_REGISTER.md`](00-governance/ASSUMPTIONS_REGISTER.md).

Requirements use unique identifiers (`FR-AUTH-001`, `NFR-SEC-001`) and are traceable to phases and test areas (see §13 of the SRS and §6 of the roadmap).

## Index

### Governance

| Document | ID | Purpose |
| --- | --- | --- |
| [Assumptions and Open Questions](00-governance/ASSUMPTIONS_REGISTER.md) | GOV-ASM-001 | Every unresolved decision, its impact and owner |
| [Documentation Completion Report](00-governance/COMPLETION_REPORT.md) | GOV-REP-001 | What this milestone delivers and what remains |

### Product and business

| Document | ID | Purpose |
| --- | --- | --- |
| [Product Charter](01-product/PRODUCT_CHARTER.md) | PRD-CHARTER-001 | Identity, vision, scope, success measures, lifecycle |
| [Business Model](02-business/BUSINESS_MODEL.md) | BIZ-001 | Plans, pricing logic, AI credits, unit economics, go-to-market |
| [Product Requirements Document](03-requirements/PRD.md) | PRD-001 | Personas, journeys, module scope, feature catalogue |
| [Software Requirements Specification](03-requirements/SRS.md) | SRS-001 | Numbered functional and non-functional requirements |

### Engineering

| Document | ID | Purpose |
| --- | --- | --- |
| [System Architecture](04-architecture/SYSTEM_ARCHITECTURE.md) | ARC-001 | Stack validation, layers, multi-tenancy, auth, scheduling engine, deployment |
| [Database Design](05-database/DATABASE_DESIGN.md) | DBD-001 | ERD, tables, keys, indexes, constraints, RLS model |
| [Authentication, Memberships and RLS](05-database/AUTH_AND_MEMBERSHIPS.md) | DBD-002 | Phase 2 migrations, roles, policy matrix, session flow |
| [API Specification](06-api/API_SPECIFICATION.md) | API-001 | Conventions, endpoints, errors, idempotency, rate limits |
| [Testing Strategy](09-testing/TESTING_STRATEGY.md) | QA-001 | Test pyramid, tenant-isolation tests, gates |
| [Implementation Roadmap](10-implementation/IMPLEMENTATION_ROADMAP.md) | IMP-001 | 20 phases, entry/exit criteria, status, structure |

### Design

| Document | ID | Purpose |
| --- | --- | --- |
| [Design System](07-ui-ux/DESIGN_SYSTEM.md) | UX-DS-001 | Tokens, typography, layout, components, states, accessibility |
| [Screen Inventory](07-ui-ux/SCREEN_INVENTORY.md) | UX-SCR-001 | Every screen, its route, roles and phase |

### Architecture decision records

| ADR | Decision |
| --- | --- |
| [ADR-001](13-adr/ADR-001-modular-monolith.md) | Modular monolith over microservices |
| [ADR-002](13-adr/ADR-002-nextjs-supabase-vercel.md) | Next.js + Supabase + Vercel as the platform |
| [ADR-003](13-adr/ADR-003-rls-multi-tenancy.md) | PostgreSQL RLS as the tenant isolation boundary |
| [ADR-004](13-adr/ADR-004-typescript-scheduling-engine.md) | TypeScript scheduling engine first, OR-Tools later |

## Reference assets

- [`07-ui-ux/reference-dashboard.png`](07-ui-ux/reference-dashboard.png) — the visual reference for the entire product.
- [`reference/Acadence_System_Architecture_and_Developer_Guide.pdf`](reference/Acadence_System_Architecture_and_Developer_Guide.pdf) — the original architecture guide. Its product requirements, workflows and expansion strategy are preserved here; its Flask/MySQL recommendations are superseded by ADR-002.

## Document standards

Every document carries a document ID, version, date, owner, status and revision history, and references its related documents. Documents are updated in the same pull request as the implementation change they describe. Where a requirement cannot yet be decided, it is recorded in the assumptions register rather than invented.

## Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Engineering | Initial documentation milestone |
| 1.1 | 2026-11-24 | Engineering | Added the Phase 2 authentication and RLS document |
