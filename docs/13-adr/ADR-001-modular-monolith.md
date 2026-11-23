# ADR-001 — Modular monolith over microservices

> **Status:** Accepted · **Date:** 2026-11-23 · **Owner:** Architecture
> **Related:** [System Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [ADR-002](ADR-002-nextjs-supabase-vercel.md)

## Context

Acadence must serve multiple institutions with strict isolation, a scheduling engine, AI features and analytics. The initial team is small and the deployment target is Vercel with managed Postgres.

## Problem

Should Acadence be built as a set of microservices (scheduling service, academic service, notification service, AI service) or as a single deployable application with enforced module boundaries?

## Options considered

1. **Microservices** — independent deploys, per-service scaling; requires service discovery, distributed transactions, cross-service auth, observability and a platform team.
2. **Modular monolith** — one deployable, explicit domain modules, one database with strong constraints; boundaries enforced by convention and review.
3. **Single unstructured application** — fastest to start, no boundaries, predictable long-term decay.

## Decision

Adopt the **modular monolith**. One Next.js application, modules under `src/modules` and `src/services`, one Postgres database. The scheduling engine sits behind a stable interface (`SchedulingEngine`) so a separate worker can be extracted only if measurements demand it.

## Rationale

- Multi-tenant data integrity relies on database constraints and RLS — a single transactional database is a strength, not a limitation.
- A distributed scheduler would need its own auth, tenant validation and retry semantics before producing any value.
- Vercel deploys one application; observability and rollback stay simple.
- Module boundaries and the engine interface preserve the option to extract services later (informed by real load).

## Consequences

- Discipline is required: cross-module imports are reviewed, no "shared utils" dumping ground.
- Long-running work must be modelled as queued jobs within the monolith.
- Extracting the scheduling service later requires moving the interface contract, not redesigning the domain.

## Revision history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Initial decision |
