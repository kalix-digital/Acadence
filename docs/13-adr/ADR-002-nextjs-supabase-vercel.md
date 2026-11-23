# ADR-002 — Next.js, Supabase and Vercel as the platform

> **Status:** Accepted · **Date:** 2026-11-23 · **Owner:** Architecture
> **Related:** [System Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [Database](../05-database/DATABASE_DESIGN.md) · [ADR-001](ADR-001-modular-monolith.md)

## Context

The reference architecture guide proposed Flask + MySQL. The project plan proposes Next.js, TypeScript, Supabase and Vercel. Acadence needs server-rendered dashboards, strong tenant isolation, file storage, background work and low operational overhead.

## Problem

Which stack should implement Acadence, and does the proposed stack satisfy the requirements without unnecessary infrastructure?

## Options considered

1. **Flask + MySQL (original guide)** — familiar, but requires building auth, storage, RLS-equivalent isolation and deployment plumbing.
2. **Next.js + Supabase + Vercel (proposed)** — one language across UI and server, managed Postgres with RLS, managed auth, storage and pooled connections, Vercel deployment.
3. **Django + Postgres + separate SPA** — solid, but duplicates API surface and adds an unrequested frontend build system.

## Decision

Adopt **Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase (Postgres, Auth, Storage) + Vercel**, with Resend for email and a server-side AI provider. The Flask/MySQL direction is superseded, while its product requirements and domain concepts are retained.

## Rationale

- RLS in Postgres gives a database-level tenant boundary that the application cannot accidentally bypass — the single most important security property here.
- TypeScript across server and client reduces contract drift; Server Components deliver dashboards without a separate API for first-party screens.
- Managed auth, storage and pooling removes infrastructure work that adds no product value at this stage.
- The stack is compatible with the required visual design (Tailwind + shadcn + Recharts).

## Consequences

- Serverless duration limits constrain heavy generation; jobs must be chunked or checkpointed (architecture §10, AR-01).
- Supabase's connection model requires pooled connections from serverless functions.
- Vendor coupling to Supabase/Vercel: mitigated by standard Postgres, versioned SQL migrations and no proprietary data formats.
- Python/OR-Tools remains an optional worker behind the scheduling interface, not part of production until justified.

## Revision history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Initial decision |
