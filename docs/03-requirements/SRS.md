# Acadence — Software Requirements Specification (SRS)

> **Document ID:** SRS-001 · **Version:** 1.0 · **Status:** Approved for implementation · **Date:** 2026-11-23 · **Owner:** Engineering
> **Related:** [PRD](PRD.md) · [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [Database](../05-database/DATABASE_DESIGN.md) · [API](../06-api/API_SPECIFICATION.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md)

## 0. Conventions

- Requirement IDs: `FR-<MODULE>-<NNN>` (functional), `NFR-<AREA>-<NNN>` (non-functional). IDs are stable forever; withdrawn requirements are marked, never reused.
- Priority: **M** must (v1 blocker), **S** should (v1 unless a recorded decision defers it), **C** could (post-v1).
- Phase references the implementation phase in the [roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md).
- "Scoped role" means the actor's membership scope (faculty/department) restricts the operation.

## 1. Authentication and authorisation (Phase 2)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-AUTH-001 | M | Sign in with email and password through Supabase Auth; sessions are httpOnly cookies refreshed by middleware. |
| FR-AUTH-002 | M | Sign out invalidates the session server-side and redirects to the public landing page. |
| FR-AUTH-003 | M | Password reset via expiring, single-use email link. |
| FR-AUTH-004 | M | Email verification is required before a user gains access to any tenant data. |
| FR-AUTH-005 | M | Every user has exactly one profile; profiles are linked to memberships, never to a role field trusted by the client. |
| FR-AUTH-006 | M | A user may hold memberships in multiple institutions with independent roles and scopes. |
| FR-AUTH-007 | M | Users cannot self-assign privileged roles; role assignment requires Institution Admin (or platform) authority and is audited. |
| FR-AUTH-008 | M | Server-side route protection: unauthenticated requests to protected routes redirect to sign-in; unauthorised API calls return 403. |
| FR-AUTH-009 | M | All protected tables are covered by RLS policies; service-role credentials never reach the browser. |
| FR-AUTH-010 | M | Session expiry and refresh are handled without exposing tokens to client JavaScript storage. |

## 2. Institutions (Phase 3)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-INST-001 | M | Super Admin can create an institution with name, unique slug, type; creation provisions default settings, roles and an onboarding checklist. |
| FR-INST-002 | M | Institution Admin can edit profile, logo and brand colours; branding applies only within that institution. |
| FR-INST-003 | M | Super Admin can approve, suspend and reactivate institutions; suspension blocks sign-in to that tenant but preserves data. |
| FR-INST-004 | M | Institution Admin can create and manage campuses. |
| FR-INST-005 | M | Institution Admin can create faculties and departments under a campus, establishing Platform → Institution → Campus → Faculty → Department. |
| FR-INST-006 | M | Institution Admin can invite, deactivate and re-scope members (faculty/department scope). |
| FR-INST-007 | M | Institution settings cover working days, teaching slot length, default semester structure, workload limits and grading of "hard" publication rules. |
| FR-INST-008 | S | Onboarding checklist tracks profile, campuses, faculties, session, data import and first draft timetable. |
| FR-INST-009 | S | Institution admins see institution analytics limited to their own tenant. |
| FR-INST-010 | M | Institution-scoped operations cannot read or write another institution's records, verified by automated isolation tests. |

## 3. Academic administration (Phase 4)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-ACAD-001 | M | Manage academic sessions (start/end, status) and semesters (teaching weeks, examination weeks). |
| FR-ACAD-002 | M | Manage programmes (code, name, level, department). |
| FR-ACAD-003 | M | Manage courses (code unique per institution, title, units, level, department, required room type, required features). |
| FR-ACAD-004 | M | Manage course offerings per semester: course, student group(s), lecturer(s), expected size, required sessions per week and duration. |
| FR-ACAD-005 | M | Manage students (matriculation number unique per institution, programme, level, group memberships). |
| FR-ACAD-006 | M | Manage lecturers (staff number, department, max contact hours) linked to user profiles. |
| FR-ACAD-007 | M | Manage student groups and memberships with duplicate protection. |
| FR-ACAD-008 | M | Course assignment records lecturer, offering and contact-hour weight; assigning an offering twice is rejected. |
| FR-ACAD-009 | M | CSV import for students, lecturers, courses and offerings with preview, per-row validation report and all-or-nothing commit per file. |
| FR-ACAD-010 | M | List views support search, filters, sorting and pagination; archiving preserves history. |
| FR-ACAD-011 | S | Bulk archive/restore and bulk group assignment. |
| FR-ACAD-012 | M | Duplicate codes and numbers produce actionable errors rather than silent overwrite. |

## 4. Facilities (Phase 5)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-ROOM-001 | M | Manage buildings per campus and rooms per building with type, capacity, floor and accessibility notes. |
| FR-ROOM-002 | M | Rooms record features/equipment (projector, laboratory benches, computers) used for suitability checks. |
| FR-ROOM-003 | M | Room availability windows can be defined per day and semester. |
| FR-ROOM-004 | M | Room bookings cannot overlap; the database rejects overlap under concurrency. |
| FR-ROOM-005 | S | Ad-hoc bookings outside timetables are recorded separately from published entries and conflict-checked against them. |
| FR-ROOM-006 | M | Utilisation report computes booked hours over available hours per room/building/campus. |
| FR-ROOM-007 | M | Room capacity below an offering's expected size is a hard conflict at scheduling time. |

## 5. Timetables (Phase 6)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-TT-001 | M | Create a draft timetable for an institution, semester and organisational scope (department/faculty). |
| FR-TT-002 | M | Add, edit, move and delete draft entries: offering, lecturer, room, student group, day, start/end time, or fixed entries. |
| FR-TT-003 | M | Editing validates that referenced entities belong to the actor's institution and scope. |
| FR-TT-004 | M | Drafts can be duplicated for a new semester. |
| FR-TT-005 | M | Publishing creates an immutable version; published versions are never edited in place. |
| FR-TT-006 | M | Publishing requires zero hard-constraint violations at the moment of publication. |
| FR-TT-007 | M | Version history exposes every published version, its publisher, timestamp and change summary. |
| FR-TT-008 | M | Timetable views exist for department, faculty, lecturer, student group and room, with week/day filters. |
| FR-TT-009 | M | Timetable import accepts a validated CSV of entries and reports conflicts before commit. |
| FR-TT-010 | S | Publishing a new version supersedes the previous one for student/lecturer views while retaining the archive. |
| FR-TT-011 | M | Students and lecturers only see published timetables for their own institution and assignments. |
| FR-TT-012 | S | Print/PDF export of a timetable view. |

## 6. Conflict detection (Phase 7)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-CONF-001 | M | Detect lecturer, room and student-group time overlaps within the same institution and semester. |
| FR-CONF-002 | M | Detect capacity violations (expected size > room capacity). |
| FR-CONF-003 | M | Detect room suitability violations against required room type/features. |
| FR-CONF-004 | M | Detect lecturer unavailability and workload limit breaches. |
| FR-CONF-005 | M | Classify violations as hard (block publication) or soft (warn), configurable per institution within documented bounds. |
| FR-CONF-006 | M | Every conflict includes a human-readable explanation naming the entries, lecturer, room or group involved. |
| FR-CONF-007 | M | Conflicts are recomputed server-side before publication; stale client validation is never trusted. |
| FR-CONF-008 | M | Concurrent publications cannot create conflicting published entries for the same semester. |
| FR-CONF-009 | S | Suggested resolutions (move room, move slot, split group) are offered with impact notes. |
| FR-CONF-010 | M | A conflict report is available per draft and per published version. |

## 7. Timetable generation (Phase 8)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-GEN-001 | M | Generate a candidate draft from offerings, constraints and availability for a semester. |
| FR-GEN-002 | M | Hard constraints are never violated in a generated result; if unsatisfiable, the engine reports the blocking constraints. |
| FR-GEN-003 | S | Soft constraints (preferred slots, gaps, utilisation balance) influence the score, not feasibility. |
| FR-GEN-004 | M | Generation input and output are persisted so a run can be inspected and reproduced. |
| FR-GEN-005 | M | Generation is tenant-scoped and can be cancelled; long runs report progress. |
| FR-GEN-006 | C | External OR-Tools optimiser behind the same engine interface when instance size justifies it. |

## 8. Workload (Phase 9)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-WL-001 | M | Contact hours are derived from timetable entries per lecturer per semester. |
| FR-WL-002 | M | Configurable limits per institution, faculty or lecturer produce overload warnings. |
| FR-WL-003 | M | Workload report lists lecturers, hours, limits and utilisation with department filters. |
| FR-WL-004 | S | Department admins submit workload for approval; Institution Admin approves. |

## 9. Calendar (Phase 10)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-CAL-001 | M | Sessions, semesters, teaching weeks, examination weeks, holidays, deadlines and events are calendar records. |
| FR-CAL-002 | M | Scheduling respects teaching weeks and excludes holidays; examination weeks block teaching entries unless explicitly allowed. |
| FR-CAL-003 | S | Calendar feeds (ICS) for staff and students. |

## 10. Notifications (Phase 11)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-NOT-001 | M | In-app notifications for timetable publication, changes, approvals and announcements. |
| FR-NOT-002 | M | Email delivery via Resend for the same events, respecting user preferences. |
| FR-NOT-003 | S | Digest batching for high-volume events. |
| FR-NOT-004 | M | Notifications are tenant-scoped and delivered only to users with access to the referenced entity. |

## 11. Attendance (Phase 12)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-ATT-001 | M | Attendance records per offering and session date with student status. |
| FR-ATT-002 | M | Import and correction flows with audit trail; unreasonably old corrections require higher authority. |
| FR-ATT-003 | M | Student attendance history and per-course statistics. |
| FR-ATT-004 | S | Documented interface for external attendance hardware/software. |

## 12. AI learning assistant and documents (Phases 13–14)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-AI-001 | M | Generate study guides, summaries, practice questions, worked examples, revision plans and formula sheets per course. |
| FR-AI-002 | M | Requests are grounded in course material uploaded to the institution's storage; unsupported claims are avoided by instruction and source references. |
| FR-AI-003 | M | AI credits are debited from the institution ledger; insufficient credits block generation with a clear message. |
| FR-AI-004 | M | AI credentials stay server-side; the browser never receives provider keys. |
| FR-AI-005 | M | Generation history is per user and per course, with status and credit consumption. |
| FR-DOC-001 | M | Generated documents are stored with metadata, source references and a downloadable PDF. |
| FR-DOC-002 | M | Lecturers can review/approve generated material; students see approval state. |
| FR-DOC-003 | S | Signed, expiring download links; no public document URLs. |

## 13. Analytics and subscriptions (Phases 15–16)

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-AN-001 | M | Institution, faculty and department dashboards show real counts and trends with an "as of" timestamp. |
| FR-AN-002 | M | Reports: room utilisation, lecturer workload, conflicts, attendance, timetable activity. |
| FR-AN-003 | S | Export reports to CSV/PDF. |
| FR-SUB-001 | M | Plans define feature limits and AI credits; institution subscriptions record period, status and payment reference. |
| FR-SUB-002 | M | Limits are enforced server-side when features are used. |
| FR-SUB-003 | M | Billing history lists payments with reference, amount, period and status. |
| FR-SUB-004 | M | Expiry applies a grace period, then restricts premium features without deleting data. |

## 14. Non-functional requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| NFR-SEC-001 | M | All tenant tables enforce RLS; service-role use is confined to audited server jobs. |
| NFR-SEC-002 | M | All inputs validated server-side with typed schemas; outputs never leak another tenant's records or secrets. |
| NFR-SEC-003 | M | Rate limiting on authentication, AI generation, imports and public endpoints. |
| NFR-SEC-004 | M | Audit log for administrative and academic mutations, retained for the institution's configured period. |
| NFR-SEC-005 | M | Secrets only in environment variables; no secret in source, client bundle, logs or error pages. |
| NFR-SEC-006 | M | Webhooks (payments, email) verified by signature and idempotency key. |
| NFR-PERF-001 | M | Authenticated page navigation ≤ 2 s p95; list endpoints paginate with bounded page size. |
| NFR-PERF-002 | S | Timetable validation for a 200-entry draft completes in ≤ 3 s. |
| NFR-PERF-003 | S | Generation for a 500-entry semester completes in ≤ 60 s or reports progress and remains cancellable. |
| NFR-A11Y-001 | M | WCAG 2.2 AA: keyboard operable, visible focus, 4.5:1 text contrast, labelled controls, reduced-motion support. |
| NFR-RESP-001 | M | Layouts usable at 360 px, 768 px, 1024 px, 1440 px and 1920 px. |
| NFR-REL-001 | M | Database migrations are versioned and reversible where feasible; backups and restore are documented. |
| NFR-OBS-001 | M | Structured server logs with request ID, tenant ID and actor; errors captured without personal data. |
| NFR-MAINT-001 | M | No file above ~400 lines without documented justification; business rules live in services, not components. |
| NFR-TEST-001 | M | CI runs typecheck, lint, unit tests and tenant-isolation tests on every pull request. |

## 15. Traceability

| Requirement group | Phase | Primary test area |
| --- | --- | --- |
| FR-AUTH-* | 2 | Auth integration + RLS tests |
| FR-INST-*, FR-ACAD-*, FR-ROOM-* | 3–5 | CRUD integration + isolation tests |
| FR-TT-*, FR-CONF-* | 6–7 | Conflict unit tests + publication integration |
| FR-GEN-*, FR-WL-* | 8–9 | Engine property tests + workload calculations |
| FR-CAL-*, FR-NOT-*, FR-ATT-* | 10–12 | Calendar rules, delivery, attendance imports |
| FR-AI-*, FR-DOC-* | 13–14 | Prompt/credit handling with mocked provider |
| FR-AN-*, FR-SUB-* | 15–16 | Metric correctness + limit enforcement |
| NFR-SEC-*, NFR-PERF-* | all | Security review, load checks, CI gates |

## 16. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Engineering | Initial SRS |
