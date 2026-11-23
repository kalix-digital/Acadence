# Acadence — Product Requirements Document (PRD)

> **Document ID:** PRD-001 · **Version:** 1.0 · **Status:** Approved for implementation · **Date:** 2026-11-23 · **Owner:** Product
> **Related:** [Charter](../01-product/PRODUCT_CHARTER.md) · [SRS](../03-requirements/SRS.md) · [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [Design System](../07-ui-ux/DESIGN_SYSTEM.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md)

## 1. Purpose and audience

This PRD defines the behaviour Acadence must deliver, organised by user role and product module. It is the reference for the SRS (numbered requirements), the design system, and the implementation roadmap. It does not prescribe implementation detail — that is the architecture and database documents.

## 2. Roles and permission model

### 2.1 Role definitions

| Role | Scope | Core responsibilities |
| --- | --- | --- |
| Platform Super Admin | Platform | Provision/suspend institutions, manage plans, platform analytics, support |
| Support Operator | Platform, read-mostly | Assist onboarding, inspect audit logs, cannot change academic data |
| Institution Admin | One institution | Institution profile, campuses, memberships, settings, subscriptions, institution analytics |
| Faculty Admin | One or more faculties | Faculties, departments, programmes, courses, faculty timetables and approvals |
| Department Admin | One or more departments | Courses and offerings, groups, lecturer assignment, drafts, conflict resolution |
| Lecturer | Own assignments | View own timetable and workload, request changes, approve own AI documents |
| Student | Own registration | View own published timetable, notifications, own attendance |

### 2.2 Permission matrix (capability → roles)

| Capability | Super Admin | Support | Institution Admin | Faculty Admin | Department Admin | Lecturer | Student |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create institution | ✔ | — | — | — | — | — | — |
| Edit institution profile/branding | ✔ | — | ✔ | — | — | — | — |
| Manage campuses | ✔ | — | ✔ | — | — | — | — |
| Manage memberships/roles | ✔ | — | ✔ | — | — | — | — |
| Manage faculties | ✔ | — | ✔ | ✔ (own) | — | — | — |
| Manage departments | ✔ | — | ✔ | ✔ (own) | — | — | — |
| Manage courses/offerings | ✔ | — | ✔ | ✔ | ✔ (own dept) | — | — |
| Manage rooms | ✔ | — | ✔ | ✔ | ✔ (request) | — | — |
| Create/edit timetable drafts | ✔ | — | ✔ | ✔ | ✔ | — | — |
| Publish timetable | ✔ | — | ✔ | ✔ | — | — | — |
| Approve change requests | ✔ | — | ✔ | ✔ | — | — | — |
| View institution analytics | ✔ | ✔ | ✔ | ✔ (faculty) | ✔ (dept) | — | — |
| View own timetable | — | — | ✔ | ✔ | ✔ | ✔ | ✔ |
| Generate AI study material | — | — | — | — | — | ✔ | ✔ |
| Approve AI documents | — | — | ✔ | ✔ | ✔ | ✔ | — |
| Manage subscription/billing | ✔ | — | ✔ | — | — | — | — |
| View audit logs | ✔ | ✔ | ✔ | — | — | — | — |

Rules:

- A user may hold memberships in several institutions; each membership carries exactly one role per institution (plus optional faculty/department scope).
- Capabilities are always checked server-side and reinforced by RLS; the matrix above is reflected in both.
- Platform Super Admin access to tenant data is explicit, logged and read-only unless an audited impersonation/support mode is enabled (Phase 2 design decision).

## 3. Personas

| Persona | Context | Goals | Frustrations |
| --- | --- | --- | --- |
| **Dr. Adaeze — Institution Admin** | Registrar's office, 12k students | Publish semester timetables on time, prove zero conflicts, report utilisation | Chasing departments for spreadsheets; no single view |
| **Mr. Tunde — Department Admin** | Computer Science, 40 courses | Assign lecturers and rooms, resolve clashes fast | Manually checking overlaps; last-minute room changes |
| **Prof. Balogun — Lecturer** | 3 courses, 21 contact hours | Know where to be, flag impossible schedules, keep workload fair | Timetable PDFs that change silently |
| **Chiamaka — Student** | 400 level, 6 courses | See personal timetable, exam dates, changes | Screenshots forwarded on WhatsApp that are out of date |
| **Ngozi — Faculty Admin** | 6 departments | Approve faculty timetable, balance lecturer load | Department silos; conflicting assumptions |
| **Sam — Platform Admin** | Acadence operations | Onboard institutions quickly, monitor usage and risk | Manual provisioning, unclear tenant health |

## 4. User journeys (primary)

### J1 — Institution onboarding
Super Admin provisions institution → assigns Institution Admin → Institution Admin configures profile, campuses, faculties, departments, academic session and settings → imports or creates courses, students, lecturers, rooms → invites staff. **Done when** the dashboard shows real counts and a draft timetable can be created.

### J2 — Semester timetable publication
Department Admin creates a draft for a semester → assigns offerings, lecturers, groups and rooms → conflict engine validates → hard conflicts resolved → Faculty Admin reviews → publishes (versioned). **Done when** version is visible to students/lecturers and no critical conflicts remain.

### J3 — Timetable change request
Lecturer submits a change request for an entry → Department/Faculty Admin reviews impact (conflicts recomputed) → approves → new version published, notifications sent, audit recorded.

### J4 — Conflict resolution
Admin opens conflict report → sees severity, explanation, affected entries → applies a suggested resolution or edits manually → revalidates → publishes.

### J5 — Student self-service
Student signs in → sees today's classes and full personal timetable → receives change notification → downloads/prints. Student never sees other students' data.

### J6 — AI study material
Student requests a study guide for a course → server checks credits and entitlement → generation stored with source references → PDF available in document history; lecturer may review/approve.

### J7 — Subscription renewal
Institution Admin views plan usage → renews subscription → payment reference recorded → limits updated; expired plan restricts premium features after grace period.

## 5. Module requirements (product level)

Numbered requirements live in the [SRS](../03-requirements/SRS.md); this section defines product intent and acceptance for each module.

### A. Platform administration
Provision institutions with a unique slug and subdomain/branding, approve or suspend them, manage plans and global settings, view platform-wide analytics, and inspect audit logs. Institution deletion is a governed, audited operation with data-retention rules.

### B. Institution management
Institution profile (name, slug, type, logo, colours), multiple campuses, faculties, departments, academic defaults (working days, slot length, semester structure) and onboarding checklist. Branding is institution-scoped, never global.

### C. User management
Invitations (email-based, expiring), account activation, profiles, memberships with role and scope, bulk CSV import with validation report, deactivation (never hard delete while academic history exists). Privileged roles can only be granted by Institution Admin or above.

### D. Academic administration
Academic sessions → semesters → teaching weeks; programmes; courses; course offerings per semester (course + group + lecturer + expected size); student groups (level/programme cohorts) and memberships; lecturer assignments with contact-hour weight. Duplicate detection on course codes per institution.

### E. Classrooms and facilities
Campuses → buildings → rooms with type (lecture hall, laboratory, seminar, computer lab), capacity, features/equipment and accessibility notes; availability windows; bookings with overlap prevention; utilisation reporting.

### F. Timetable management
Draft creation per department/faculty/semester, entry editing on a grid, assignment of course offering, lecturer, room, student group, day and time slot; import; publish; immutable published versions with change history; views for department, faculty, lecturer, group and room; change requests with approval workflow.

### G. Intelligent timetable generation
Generate a candidate timetable from offerings and constraints. Hard constraints: lecturer/room/group overlap, capacity, room suitability, lecturer availability, fixed entries. Soft constraints: preferred slots, gap minimisation, workload balance, room proximity. Generation never publishes automatically; the result is a draft requiring validation and approval.

### H. Conflict detection
Detect and explain: lecturer clash, room clash, group clash, capacity violation, suitability violation, workload breach, unavailable period. Severity levels (critical/high/medium/low) and resolution suggestions. Publication is blocked by hard violations; API returns structured conflicts.

### I. Lecturer workload
Contact hours derived from timetable entries plus non-teaching load; configurable limits per institution/department; overload warnings before publication; workload reports and approvals.

### J. Academic calendar
Sessions, semesters, teaching/examination weeks, holidays, registration deadlines and events; calendar affects available scheduling days and blocks publication into examination periods unless allowed.

### K. Attendance
Attendance records per session/offering (present/absent/late/excused), import, correction with audit, student history and per-course statistics. External attendance systems integrate through documented interfaces.

### L. Notifications
In-app and email notifications for timetable publication, changes, approvals and announcements; per-user preferences; digests to avoid fatigue; delivery status recorded.

### M. AI learning assistant
Study guides, summaries, practice questions, worked examples, revision plans and formula sheets grounded in course material; usage limits and credit ledger; lecturer review of generated content; clear AI disclosure and citation of source documents.

### N. Document generation
Server-rendered PDFs (timetables, workload reports, study material, analytics exports), stored in Supabase Storage with signed links, versioned history and source tracking.

### O. Analytics and reporting
Institution, faculty, department dashboards: students, lecturers, courses, rooms, published timetables, conflicts, workload distribution, attendance and usage. Metrics must be computed from real data with a visible "as of" timestamp.

### P. Commercial and subscription
Plans, institution subscriptions, renewal, AI credit ledger, payment references, billing history, feature limits and premium gating enforced server-side.

## 6. Cross-cutting product requirements

| Area | Requirement |
| --- | --- |
| Tenancy | Every record is institution-scoped and enforced by RLS; cross-institution access is a critical defect |
| Audit | Administrative mutations record actor, action, entity, before/after summary and timestamp |
| Validation | Every form and endpoint validates on the server; errors are field-specific and actionable |
| Empty/loading/error states | Required on every data surface |
| Accessibility | WCAG 2.2 AA for all authenticated screens |
| Responsiveness | Usable from 360 px; full experience from 1280 px |
| Data import | CSV (and Excel via CSV) with preview, validation report and partial-commit rules |
| Performance | Interactive navigation ≤ 2 s p95 on 3G-class connections for list/detail screens |

## 7. Out of scope (v1)

Grading, transcripts, learning content delivery, payroll, library, native mobile apps, institutional SAML/SCIM, general-purpose Python optimisation service, white-label custom domains before Phase 17.

## 8. Acceptance for the product milestone

The product is v1-complete when every module A–P has: a working interface backed by real persisted data, server-side authorisation, validation, error handling, passing tests, and documentation updated in the same change set.

## 9. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Product | Initial PRD from `project_plan.txt` and the architecture guide |
