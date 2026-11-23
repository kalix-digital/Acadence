# ADR-003 — PostgreSQL RLS as the tenant isolation boundary

> **Status:** Accepted · **Date:** 2026-11-23 · **Owner:** Security Architecture
> **Related:** [Database Design §7](../05-database/DATABASE_DESIGN.md) · [System Architecture §7](../04-architecture/SYSTEM_ARCHITECTURE.md) · [SRS NFR-SEC-001](../03-requirements/SRS.md)

## Context

Acadence serves independent institutions from one database. An institution admin in Institution A must never read or write Institution B's academic data, even through a crafted request.

## Problem

Where should tenant isolation be enforced: in every query, in a middleware layer, in the API, or in the database?

## Options considered

1. **Application-level filtering only** — `where institution_id = ?` in every query; one forgotten filter leaks data.
2. **Separate database/schema per institution** — strong isolation, expensive migrations and connection management, awkward cross-tenant platform reporting.
3. **PostgreSQL RLS with institution_id on every tenant table** — enforced for every role, including future code paths, with server-side capability checks layered on top.

## Decision

Use **RLS as the mandatory boundary**, with `SECURITY DEFINER` helper functions (`auth_institution_ids`, `auth_role`, `auth_department_ids`) and composite foreign keys `(id, institution_id)`. Application code additionally performs explicit membership and capability checks; the UI never determines access.

## Rationale

- Isolation becomes a property of the data layer, not of developer memory.
- Composite foreign keys make cross-tenant references structurally impossible.
- Policies compose with role scope (faculty/department) in one place.
- Platform admins get explicit, audited access rather than a bypass.

## Consequences

- Every tenant table must carry `institution_id` and an index; policies require careful testing for recursion and performance.
- Storage policies must mirror the same tenant rule.
- The isolation test suite is a permanent CI gate; failures block release.
- Service-role usage is restricted to audited jobs and never exposed to the browser.

## Revision history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Initial decision |
