# Acadence — Assumptions and Open Questions Register

> **Document ID:** GOV-ASM-001 · **Version:** 1.4 · **Status:** Open (twenty items closed) · **Date:** 2026-11-27 · **Owner:** Product
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
| OQ-007 | Are examination timetables part of v1 or a separate module? | Data model and UI scope | Phase 6 | **Closed** — teaching timetables only; exam periods block teaching unless the institution allows it |
| OQ-008 | Which AI provider and model tiers, and what is one credit worth? | Cost control and capability | Phase 13 | Open (provider abstracted server-side) |
| OQ-009 | Do institutions require their own email domains for notifications? | Deliverability, DNS setup per tenant | Phase 17 | Open |
| OQ-010 | What attendance systems must be integrated, and in which format? | Integration interface design | Phase 12 | Open (generic interface + CSV first) |
| OQ-011 | Audit log retention per institution (default 24 months)? | Storage cost, compliance | Phase 18 | Open (default applied) |
| OQ-012 | Are custom domains required for white-label, or is branding sufficient? | Hosting, TLS, tenant resolution | Phase 17 | Open |
| OQ-013 | Required backup/RPO/RTO commitments for institutional contracts? | Operations cost and SLA | Phase 20 | Open |
| OQ-014 | Should room bookings require approval, and by whom? | Facilities workflow | Phase 5 | **Closed** — auto-approve within scope |
| OQ-015 | Are multi-campus institutions billed per campus or per student band? | Commercial model | Phase 16 | Open |
| OQ-016 | Are campuses part of Phase 4, and is a campus required for every faculty? | Hierarchy shape, onboarding friction, Phase 5 room model | Phase 4 | **Closed** — optional campus on faculty |
| OQ-017 | Does a course belong to one programme, or can several programmes require it? | Curriculum model and duplicate courses | Phase 4 | **Closed** — `programme_courses` join table |
| OQ-018 | May academic records ever be hard-deleted, or only archived? | Referential history, audit integrity | Phase 4 | **Closed** — archive only |
| OQ-019 | Are students, lecturers, groups, offerings, calendar and imports part of this phase? | Delivery scope and dependency risk | Phase 4 | **Closed** — deferred to Phase 4b |
| OQ-020 | Do student and lecturer records require an auth account before they exist? | Onboarding order, invitation flow, roster import | Phase 4b | **Closed** — record first, account later |
| OQ-021 | Which identifiers are mandatory, and how unique are they? | Duplicate detection, imports, account linking | Phase 4b | **Closed** — institution-wide unique numbers, optional unique email |
| OQ-022 | What is a student group, and how do students join one? | Timetable grouping, conflict detection | Phase 4b | **Closed** — cohort groups with many-to-many membership |
| OQ-023 | What does a course offering contain in this phase? | Timetable and workload inputs | Phase 4b | **Closed** — offering + lecturer assignments + groups |
| OQ-024 | How should calendar entries and teaching weeks be modelled? | Calendar UI, scheduling exclusions | Phase 4b | **Closed** — events per session, teaching weeks derived |
| OQ-025 | What should the first import pass cover, and how should it handle bad rows? | Data quality, partial-import risk | Phase 4b | **Closed** — CSV for students and lecturers, dry run then all-or-nothing |
| OQ-026 | Should classrooms, lecture halls and laboratories be separate tables? | Schema shape, duplicated conflict rules, suitability checks | Phase 5 | **Closed** — one `rooms` table with a `room_type` enum shared with courses |
| OQ-027 | Must every building belong to a campus? | Multi-campus reporting, onboarding friction | Phase 5 | **Closed** — required; a Main campus is created on demand |
| OQ-028 | How are room features and equipment stored? | Suitability checks in Phase 7 | Phase 5 | **Closed** — institution catalogue plus link table with quantity |
| OQ-029 | How is room availability defined, and is it binding? | Booking validation, utilisation denominator | Phase 5 | **Closed** — weekly windows per room per semester, binding |
| OQ-030 | How are bookings recorded, approved and capacity-checked? | Overlap enforcement, cancellation, reporting | Phase 5 | **Closed** — one dated row per booking, auto-approved, capacity enforced |
| OQ-031 | What is the utilisation denominator? | Reporting accuracy | Phase 5 | **Closed** — availability windows × teaching weeks |
| OQ-032 | Does a timetable entry represent a weekly pattern or dated occurrences? | Schema shape, publishing volume, conflict checks | Phase 6 | **Closed** — weekly pattern per version; holiday and exam weeks derived |
| OQ-033 | What does publishing produce when drafts are department- or faculty-scoped? | Version granularity, student views | Phase 6 | **Closed** — one live version per semester, scoped drafts publish into it |
| OQ-034 | Which hard checks must Phase 6 publication enforce before the conflict engine? | Publication safety vs phase order | Phase 6 | **Closed** — minimal hard checks now, extended in Phase 7 |
| OQ-035 | How is the timetable grid edited? | Editing UX and accessibility | Phase 6 | **Closed** — drag-and-drop grid with a form fallback for every move |
| OQ-036 | What happens when a timetable change request is approved? | Change workflow, version history | Phase 6 | **Closed** — lecturer requests, admin approves, approval republishes atomically |
| OQ-037 | What conventions do timetable CSV import and draft duplication follow? | Import safety, cross-semester copying | Phase 6 | **Closed** — CSV dry run then all-or-nothing; copy matches by code |

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
| OQ-020 | Student and lecturer records exist before any account. `user_id` is nullable and unique per institution, so a roster is imported or entered first and linked to an account when the person accepts an invitation. | 2026-11-27 | [Database §4.2](../05-database/DATABASE_DESIGN.md) |
| OQ-021 | Matriculation and staff numbers are mandatory and unique across the institution. An email address is optional, but when present it is unique per institution regardless of case. | 2026-11-27 | [Database §4.2](../05-database/DATABASE_DESIGN.md) |
| OQ-022 | A student group is a cohort (programme + level + session). Membership is many-to-many and archived rather than deleted, so one student can sit in a cohort group and a lab or tutorial group at once. | 2026-11-27 | [Database §4.2](../05-database/DATABASE_DESIGN.md) |
| OQ-023 | A course offering is course + session + semester + optional coordinator, with separate lecturer assignments (lead/assistant, contact hours) and linked student groups. One offering per course per semester. | 2026-11-27 | [Database §4.2](../05-database/DATABASE_DESIGN.md) |
| OQ-024 | Calendar events belong to a session and may be narrowed to one of its semesters. Teaching weeks are derived from the semester's teaching window and the holiday events covering it; nothing is stored. | 2026-11-27 | [Roadmap §5.2](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-025 | The first import pass covers students and lecturers in CSV. It validates every row first (dry run with per-row errors), then inserts the whole batch in one statement: one bad row imports nothing. Excel files are a later addition. | 2026-11-27 | [Roadmap §5.2](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-014 | Bookings are auto-approved within scope. Anyone who may book a room confirms it immediately; the only hard rules are capacity, the semester window, the room's availability and non-overlap. Cancelling frees the slot, and an approval queue can be added later without changing the booking model. | 2026-11-27 | [Roadmap §5.3](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-026 | Classrooms, lecture halls, laboratories, studios and seminar rooms share one `rooms` table with a `room_type` enum whose values are exactly `courses.required_room_type`, so a suitability check compares two columns instead of mapping vocabularies. | 2026-11-27 | [Database §4.3](../05-database/DATABASE_DESIGN.md) |
| OQ-027 | A building always belongs to a campus (`campus_id NOT NULL`). If the institution has no campus yet, the first building creates a "Main campus" automatically; if two attempts race, the loser reuses the campus that won. | 2026-11-27 | [Database §4.3](../05-database/DATABASE_DESIGN.md) |
| OQ-028 | Each institution maintains its own feature catalogue (`room_features`) and links features to rooms through `room_feature_links`, optionally with a quantity. The partial unique index allows a link to be archived and restored. | 2026-11-27 | [Database §4.3](../05-database/DATABASE_DESIGN.md) |
| OQ-029 | Availability is a set of weekly windows per room per semester (ISO weekday, opening and closing time). Windows of one room may not overlap on the same day, and a booking must fit inside one window: a room with no window in a semester cannot be booked there. That makes the utilisation denominator well defined. | 2026-11-27 | [Database §5](../05-database/DATABASE_DESIGN.md) |
| OQ-030 | A booking is one dated row (institution wall-clock timestamps, one day, expected attendees, optional department). A weekly series is expanded by the caller into individual rows, so overlap checks and single-occurrence cancellation stay simple. Capacity, semester window and availability are enforced by a trigger; overlap by an exclusion constraint over confirmed bookings. | 2026-11-27 | [Database §5](../05-database/DATABASE_DESIGN.md) |
| OQ-031 | Utilisation is booked hours over available hours per room, where available hours are the room's weekly windows multiplied by how often each weekday occurs in the semester's teaching weeks (holiday weeks removed). The numerator uses the same instants: only the part of a confirmed booking that falls inside a teaching day and the room's window counts, so a booking in a holiday, an exam week or outside a window is reported as excluded and utilisation cannot exceed 100%. Confirmed ad-hoc bookings form the numerator now; published timetable entries join it in Phase 6. | 2026-11-27 | [Roadmap §5.3](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-007 | v1 schedules teaching only. Examination sittings are not modelled; `semesters.exam_starts_on`/`exam_ends_on` block teaching entries at publication unless `allow_teaching_in_exams` is on. Exam timetabling can be added later without changing the entry model. | 2026-11-28 | [Roadmap §5.4](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-032 | An entry is a weekly pattern: weekday plus start and end time, inside a draft or a published version. Holiday and exam weeks are derived from the academic calendar, so one row covers the semester and conflicts are checked on the pattern. No per-occurrence overrides in v1. | 2026-11-28 | [Database §4.4](../05-database/DATABASE_DESIGN.md) |
| OQ-033 | Publishing creates a new immutable version for the semester. The version carries the draft's entries plus the previous live version's entries outside the publishing scope, then the previous version becomes `superseded` in the same transaction. A partial unique index keeps exactly one live version per semester. | 2026-11-28 | [Database §5](../05-database/DATABASE_DESIGN.md) |
| OQ-034 | Phase 6 publication refuses a draft that breaks a hard rule: room, lecturer or group double-booking (also enforced by exclusion constraints), capacity below an offering's expected size, a room outside its availability window, an entry outside the institution's working days or teaching hours, a teaching occurrence in an exam period, or an archived reference. Phase 7 adds severity, explanations, suggestions and soft warnings on the same service. | 2026-11-28 | [Roadmap §5.4](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-035 | The week grid is editable by drag and drop, keeping the entry's duration, and clicking an entry opens the same details in a form. Every move is available through the form, so keyboard and screen-reader users never depend on dragging. | 2026-11-28 | [Roadmap §5.4](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-036 | A lecturer may request a change to an entry they teach; an administrator scoped to that department reviews it. Approval applies the proposal to a fresh department draft of the live version and publishes a new version in one transaction, recording the request as the change summary. Rejection needs no reason but keeps the note. Notifications arrive in Phase 11. | 2026-11-28 | [Roadmap §5.4](../10-implementation/IMPLEMENTATION_ROADMAP.md) |
| OQ-037 | Timetable CSV import matches rows by semester plus course code, staff number and room/group code, validates the whole file before writing, and imports nothing if one row fails. Duplicating a draft into another semester re-matches the same way and reports every skipped row instead of guessing. Only CSV is read. | 2026-11-28 | [Roadmap §5.4](../10-implementation/IMPLEMENTATION_ROADMAP.md) |

## Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Product | Initial register |
| 1.1 | 2026-11-25 | Product | Closed OQ-003 (invitation-only), OQ-004 (`/institution` with switcher) and OQ-005 (no impersonation) for Phase 3 |
| 1.2 | 2026-11-25 | Product | Closed OQ-016 (optional campus), OQ-017 (`programme_courses`), OQ-018 (archive only) and OQ-019 (Phase 4 scope) for Phase 4 |
| 1.3 | 2026-11-27 | Product | Closed OQ-020 … OQ-025 (records before accounts, identifiers, cohort groups, offering contents, derived teaching weeks, CSV dry-run imports) for Phase 4b |
| 1.4 | 2026-11-27 | Product | Closed OQ-014 (auto-approved bookings) and OQ-026 … OQ-031 (room model, buildings and campuses, feature catalogue, binding availability, dated bookings with enforced capacity, utilisation denominator) for Phase 5 |
| 1.5 | 2026-11-27 | Product | Clarified OQ-031 after a review: the numerator is clipped to the same teaching days and windows as the denominator, and out-of-scope bookings are reported as excluded |
| 1.6 | 2026-11-28 | Product | Closed OQ-007 (teaching-only timetables) and OQ-032 … OQ-037 (weekly entry pattern, one live version per semester, Phase 6 publication checks, grid editing, change-request republishing, import and duplication conventions) for Phase 6 |
