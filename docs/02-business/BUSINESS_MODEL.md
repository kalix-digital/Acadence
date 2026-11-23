# Acadence — Business Model and Monetisation

> **Document ID:** BIZ-001 · **Version:** 1.0 · **Status:** Draft for commercial approval · **Date:** 2026-11-23 · **Owner:** Business Strategy
> **Related:** [Product Charter](../01-product/PRODUCT_CHARTER.md) · [PRD](../03-requirements/PRD.md) · [Assumptions Register](../00-governance/ASSUMPTIONS_REGISTER.md)

> Pricing figures in this document are a working hypothesis for validation with design partners. They are not contractual and must be approved before Phase 16 implements billing.

## 1. Customer segments

| Segment | Size profile | Primary buyer | Pain |
| --- | --- | --- | --- |
| Department (pilot) | 1–3 departments, < 2,000 students | Head of department | Manual timetables, workload disputes |
| Faculty | 4–10 departments | Dean / faculty officer | Cross-department clashes |
| Institution | Whole university or polytechnic | Registrar / DVC Academic | Institution-wide timetable governance |
| Multi-campus group | 2+ institutions | Group CIO / registry | Standardisation and reporting |

## 2. Value proposition by segment

- **Time:** timetable assembly drops from weeks to hours, with conflicts caught before publication.
- **Risk:** no published double-bookings, full audit trail for accreditation and examination periods.
- **Cost:** fewer hours of administrative overtime; measurable room-utilisation recovery.
- **Experience:** students and lecturers get a live, personal timetable instead of a PDF.

## 3. Plans (hypothesis)

| Plan | Target | Included | Limits |
| --- | --- | --- | --- |
| Department | Single department pilot | Academic administration, manual timetable, conflict detection, 1 campus | 2,000 students, 1,000 AI credits/term |
| Faculty | Faculty-wide | Everything in Department, workload management, calendar, notifications | 8,000 students, 5,000 AI credits/term |
| Institution | Whole institution | All modules, analytics, subscriptions management, white-label (Phase 17) | Per-seat banding, AI credits pooled |
| Enterprise | Multi-institution group | Institution plan + group reporting, SLA, onboarding support | Negotiated |

### Billing mechanics

- Subscription periods follow the institution's academic session, not the calendar year, because budgets are session-based.
- Prices are quoted per student band, invoiced per semester, with an annual discount option.
- AI credits are pooled at institution level and consumed per generation request; overage is a top-up pack, never an automatic charge.
- Grace period of 14 days after expiry before premium features are restricted (read-only access to published timetables is never withdrawn).

## 4. Payment and invoicing

- Phase 16 integrates a payment provider for card and bank transfer; provider selection is pending (assumptions register).
- Every payment stores an external reference, amount, currency, period and status; billing history is visible to institution admins.
- Manual bank-transfer reconciliation is supported as a first-class flow, since many Nigerian institutions pay by transfer.
- Subscription enforcement is server-side: limits are checked when a feature is used, not only in the UI.

## 5. Unit economics

| Cost driver | Behaviour | Control |
| --- | --- | --- |
| Database/compute | Scales with institutions and timetable generation | Indexed queries, pagination, generation batched per semester |
| AI inference | Linear in requests; the largest variable cost | Credit ledger per institution, server-side model allowlist, per-user daily cap |
| Email | Per-notification | Batched digests, user preferences, institution-level suppression |
| Support | Onboarding-heavy | Guided onboarding, importers, in-app help |

Target gross margin is maintained by pricing AI credits above inference cost and by keeping generation workloads off the request path where possible (see architecture §11).

## 6. Go-to-market

1. **Design partner phase** — 1–2 institutions, discounted, documentation-led onboarding; success measured by published timetables per semester.
2. **Faculty expansion** — convert the pilot department into faculty-wide rollout after one clean publication cycle.
3. **Institution contracts** — registry-led sales, procurement through existing bursary processes, semester invoicing.
4. **Reference marketing** — publish anonymised efficiency outcomes (hours saved, conflicts prevented) with partner consent.

## 7. Risks to the model

| Risk | Mitigation |
| --- | --- |
| Institutions slow to pay / procurement delays | Semester invoicing, manual reconciliation, grace periods |
| AI cost overrun | Credit ledger, caps, allowlist, cost monitoring per institution |
| Perceived as "another dashboard" | Scheduling correctness and audit trail are the pitch, not analytics |
| Single-institution dependency | Publish multi-institution capability early (Phase 3) and prove isolation with tests |

## 8. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Business Strategy | Initial model for validation |
