# ADR-004 — TypeScript scheduling engine first, OR-Tools later

> **Status:** Accepted · **Date:** 2026-11-23 · **Owner:** Architecture
> **Related:** [System Architecture §9](../04-architecture/SYSTEM_ARCHITECTURE.md) · [SRS FR-GEN-*](../03-requirements/SRS.md)

## Context

Timetable generation is the core differentiator. It must respect hard constraints (lecturer, room and group overlaps, capacity, suitability, availability, calendar) and optimise soft preferences. Candidate implementations: an in-process TypeScript heuristic, or Python with Google OR-Tools.

## Problem

Which engine should v1 ship, and how do we avoid painting ourselves into a corner if instance sizes grow?

## Options considered

1. **Python + OR-Tools from day one** — strongest optimisation, but introduces a second runtime, deployment surface, auth boundary and data duplication before the domain is stable.
2. **TypeScript heuristic first** — fast to iterate, shares types with the application, no extra infrastructure; may struggle on very large instances.
3. **Manual scheduling only** — least risk, but abandons the product's main value.

## Decision

Implement the engine in TypeScript behind `SchedulingEngine { generate, validate }` with fully materialised `SchedulingInput` and `SchedulingResult`. Persist inputs and results so runs are reproducible. Keep the algorithm replaceable: greedy construction plus backtracking/repair and a weighted soft score is sufficient for v1. Extract to an OR-Tools worker only when Phase 8 benchmarks show infeasibility or unacceptable runtime.

## Rationale

- The hard-constraint set is well defined and checkable in-process; correctness comes before optimality.
- Reusing the same constraint rules for validation and generation avoids divergence between "what we check" and "what we build".
- No second runtime means no duplicated tenant checks, no new secrets, no new deploy target.
- The interface plus persisted inputs make a later optimiser a drop-in implementation.

## Consequences

- Large institutions may see longer runs or partial feasibility; surfaced as explicit unsatisfiable-constraint reports instead of silent failures.
- The engine must be deterministic for a given seed to keep tests stable.
- Performance benchmarks at Phase 8 and 19 decide whether OR-Tools is introduced; that decision requires a new ADR.

## Revision history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Initial decision |
