# Acadence — Database Design

> **Document ID:** DBD-001 · **Version:** 1.0 · **Status:** Approved for migration authoring · **Date:** 2026-11-23 · **Owner:** Database Architecture
> **Related:** [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [SRS](../03-requirements/SRS.md) · [API](../06-api/API_SPECIFICATION.md) · [ADR-003](../13-adr/ADR-003-rls-multi-tenancy.md)

## 1. Principles

1. PostgreSQL (Supabase) is the source of truth; no business data lives only in the application.
2. Every tenant-owned table carries `institution_id uuid NOT NULL` with an FK and an index, even when derivable.
3. Composite foreign keys `(id, institution_id)` make cross-tenant references impossible at the database level.
4. Integrity that matters (overlaps, uniqueness, duplicates) is enforced by constraints, not only by services.
5. RLS is enabled on every tenant table; helper functions are `SECURITY DEFINER` with a pinned `search_path`.
6. Published timetables are immutable; corrections create new versions.
7. Migrations are additive-first and versioned in `supabase/migrations`.

## 2. Enumerated types

| Type | Values |
| --- | --- |
| `institution_status` | `pending`, `active`, `suspended`, `archived` |
| `membership_role` | `platform_admin`, `support_operator`, `institution_admin`, `faculty_admin`, `department_admin`, `lecturer`, `student` |
| `membership_status` | `invited`, `active`, `suspended`, `revoked` |
| `room_type` | `lecture_hall`, `laboratory`, `seminar_room`, `computer_lab`, `studio`, `other` |
| `timetable_status` | `draft`, `validated`, `published`, `superseded`, `archived` |
| `conflict_severity` | `critical`, `high`, `medium`, `low` |
| `conflict_kind` | `lecturer_overlap`, `room_overlap`, `group_overlap`, `capacity`, `suitability`, `lecturer_unavailable`, `workload`, `calendar` |
| `workload_status` | `draft`, `submitted`, `approved`, `rejected` |
| `attendance_status` | `present`, `absent`, `late`, `excused` |
| `generation_kind` | `study_guide`, `summary`, `practice_questions`, `worked_examples`, `revision_plan`, `formula_sheet` |
| `generation_status` | `queued`, `running`, `succeeded`, `failed`, `cancelled` |
| `document_approval` | `pending`, `approved`, `rejected` |
| `subscription_status` | `trialing`, `active`, `past_due`, `grace`, `expired`, `cancelled` |
| `payment_status` | `pending`, `succeeded`, `failed`, `refunded` |
| `job_status` | `queued`, `running`, `succeeded`, `failed`, `cancelled`, `pending_continuation` |
| `calendar_event_kind` | `holiday`, `exam_period`, `registration_deadline`, `event` |

## 3. Entity relationship diagram

```mermaid
erDiagram
  profiles ||--o{ institution_memberships : holds
  institutions ||--o{ institution_memberships : scopes
  institutions ||--|| institution_settings : configures
  institutions ||--o{ institution_invitations : invites
  institutions ||--o{ institution_activity : logs
  institutions ||--o{ campuses : has
  campuses ||--o{ faculties : contains
  faculties ||--o{ departments : contains
  departments ||--o{ programmes : offers
  departments ||--o{ courses : owns
  institutions ||--o{ academic_sessions : runs
  academic_sessions ||--o{ semesters : splits
  departments ||--o{ student_groups : groups
  programmes ||--o{ students : enrols
  student_groups ||--o{ student_group_members : contains
  students ||--o{ student_group_members : joins
  departments ||--o{ lecturers : employs
  semesters ||--o{ course_offerings : schedules
  courses ||--o{ course_offerings : instantiates
  student_groups ||--o{ course_offerings : attends
  course_offerings ||--o{ offering_lecturers : taught_by
  lecturers ||--o{ offering_lecturers : teaches
  campuses ||--o{ buildings : contains
  buildings ||--o{ rooms : contains
  rooms ||--o{ room_availability : available
  rooms ||--o{ room_bookings : booked
  institutions ||--o{ timetable_drafts : drafts
  timetable_drafts ||--o{ timetable_versions : publishes
  timetable_versions ||--o{ timetable_entries : contains
  course_offerings ||--o{ timetable_entries : scheduled_as
  rooms ||--o{ timetable_entries : hosts
  lecturers ||--o{ timetable_entries : teaches_at
  timetable_entries ||--o{ timetable_change_requests : amended_by
  lecturers ||--o{ lecturer_workloads : assessed
  semesters ||--o{ calendar_events : annotates
  course_offerings ||--o{ attendance_sessions : meets
  attendance_sessions ||--o{ attendance_records : records
  students ||--o{ attendance_records : attends
  study_generations ||--o{ documents : produces
  plans ||--o{ subscriptions : defines
  institutions ||--o{ subscriptions : subscribes
  subscriptions ||--o{ payments : billed
  institutions ||--o{ ai_credit_ledger : consumes
  institutions ||--o{ audit_logs : records
  institutions ||--o{ job_queue : executes
```

## 4. Table catalogue

### 4.1 Identity and tenancy

| Table | Key columns | Constraints / notes |
| --- | --- | --- |
| `profiles` | `id` (= `auth.users.id`), `full_name`, `email`, `avatar_url`, `phone` | No role column: roles live in memberships only. `email` is copied from `auth.users` on signup and backfilled in Phase 3 so member lists show real identities |
| `institutions` | `id`, `name`, `slug`, `type`, `status`, `logo_url`, `brand_primary`, `brand_accent`, `timezone` | `slug` unique; `timezone` default `Africa/Lagos` |
| `institution_settings` | `institution_id` PK, `working_days smallint[]`, `slot_minutes`, `day_start`, `day_end`, `default_max_contact_hours`, `allow_teaching_in_exams`, `hard_rule_overrides jsonb` | Configurable academic rules (SRS FR-INST-007) |
| `institution_memberships` | `id`, `institution_id`, `user_id`, `role`, `faculty_id`, `department_id`, `status`, `invited_email`, `accepted_at` | `unique (institution_id, user_id)`; scope nullable only for institution-level roles; CHECK ensures role/scope consistency |
| `institution_invitations` | `id`, `institution_id`, `email`, `role`, `token_hash`, `invited_by`, `expires_at`, `accepted_at`, `revoked_at` | `token_hash` unique; partial unique index on `(institution_id, lower(email))` for live invitations; CHECK restricts invitable roles; only a SHA-256 hash is stored |
| `institution_activity` | `id` (identity), `institution_id`, `actor_id`, `action`, `summary`, `metadata jsonb`, `created_at` | Append-only: select for institution admins/support/platform; rows written by definer triggers, never by `authenticated` directly |

### 4.2 Academic structure

| Table | Key columns | Constraints |
| --- | --- | --- |
| `campuses` | `id`, `institution_id`, `name`, `code`, `address` | `unique (institution_id, code)` |
| `faculties` | `id`, `institution_id`, `campus_id`, `name`, `code` | `unique (institution_id, code)`; composite FK to campus |
| `departments` | `id`, `institution_id`, `faculty_id`, `name`, `code` | `unique (institution_id, code)` |
| `academic_sessions` | `id`, `institution_id`, `name`, `starts_on`, `ends_on`, `status` | `unique (institution_id, name)`; CHECK `ends_on > starts_on` |
| `semesters` | `id`, `institution_id`, `session_id`, `name`, `sequence`, `teaching_starts_on`, `teaching_ends_on`, `exam_starts_on`, `exam_ends_on`, `status` | `unique (session_id, sequence)`; CHECK date ordering |
| `programmes` | `id`, `institution_id`, `department_id`, `code`, `name`, `level`, `duration_years` | `unique (institution_id, code)` |
| `courses` | `id`, `institution_id`, `department_id`, `programme_id`, `code`, `title`, `units`, `level`, `required_room_type`, `required_features text[]` | `unique (institution_id, code)`; `units` CHECK 1–12 |
| `student_groups` | `id`, `institution_id`, `department_id`, `programme_id`, `level`, `name`, `expected_size` | `unique (institution_id, name)` |
| `students` | `id`, `institution_id`, `user_id`, `matric_number`, `programme_id`, `level`, `status` | `unique (institution_id, matric_number)`; `user_id` unique per institution |
| `student_group_members` | `group_id`, `student_id`, `institution_id` | PK `(group_id, student_id)`; trigger enforces same institution |
| `lecturers` | `id`, `institution_id`, `user_id`, `staff_number`, `department_id`, `max_contact_hours`, `status` | `unique (institution_id, staff_number)` |
| `course_offerings` | `id`, `institution_id`, `semester_id`, `course_id`, `group_id`, `expected_size`, `sessions_per_week`, `session_minutes`, `required_room_type` | `unique (semester_id, course_id, group_id)`; `sessions_per_week` CHECK 1–5 |
| `offering_lecturers` | `offering_id`, `lecturer_id`, `institution_id`, `contact_hours`, `is_primary` | PK `(offering_id, lecturer_id)`; `contact_hours >= 0` |

### 4.3 Facilities

| Table | Key columns | Constraints |
| --- | --- | --- |
| `buildings` | `id`, `institution_id`, `campus_id`, `name`, `code` | `unique (institution_id, code)` |
| `rooms` | `id`, `institution_id`, `building_id`, `name`, `code`, `room_type`, `capacity`, `floor`, `features text[]`, `accessibility_notes` | `unique (institution_id, code)`; `capacity > 0` |
| `room_availability` | `id`, `institution_id`, `room_id`, `semester_id`, `day_of_week`, `opens_at`, `closes_at` | `day_of_week` CHECK 1–7; `closes_at > opens_at` |
| `room_bookings` | `id`, `institution_id`, `room_id`, `starts_at timestamptz`, `ends_at timestamptz`, `purpose`, `created_by` | Overlap exclusion (§5) |

### 4.4 Timetables

| Table | Key columns | Constraints |
| --- | --- | --- |
| `timetable_drafts` | `id`, `institution_id`, `semester_id`, `department_id`, `faculty_id`, `title`, `status`, `created_by` | Exactly one of department/faculty may be set at a time (CHECK) |
| `timetable_versions` | `id`, `institution_id`, `semester_id`, `draft_id`, `version_no`, `status`, `published_at`, `published_by`, `change_summary`, `validation_report jsonb` | `unique (semester_id, version_no)`; partial unique `(semester_id) WHERE status = 'published'` ensures one live version |
| `timetable_entries` | `id`, `institution_id`, `version_id`, `offering_id`, `room_id`, `lecturer_id`, `group_id`, `day_of_week`, `starts_at time`, `ends_at time`, `is_fixed`, `notes` | Overlap exclusions (§5); `ends_at > starts_at` |
| `timetable_change_requests` | `id`, `institution_id`, `entry_id`, `requested_by`, `proposed jsonb`, `reason`, `status`, `reviewed_by`, `reviewed_at`, `review_note` | Only open requests per entry allowed |

### 4.5 Workload, calendar, attendance

| Table | Key columns | Constraints |
| --- | --- | --- |
| `lecturer_workloads` | `id`, `institution_id`, `semester_id`, `lecturer_id`, `contact_hours`, `non_teaching_hours`, `limit_hours`, `status`, `approved_by` | `unique (semester_id, lecturer_id)`; hours `>= 0` |
| `calendar_events` | `id`, `institution_id`, `semester_id`, `title`, `kind`, `starts_on`, `ends_on`, `all_day`, `created_by` | CHECK `ends_on >= starts_on` |
| `attendance_sessions` | `id`, `institution_id`, `offering_id`, `session_date`, `starts_at`, `ends_at`, `room_id`, `created_by` | `unique (offering_id, session_date, starts_at)` |
| `attendance_records` | `id`, `institution_id`, `attendance_session_id`, `student_id`, `status`, `recorded_by`, `recorded_at`, `note` | `unique (attendance_session_id, student_id)` |

### 4.6 Communication, AI, commerce, operations

| Table | Key columns | Constraints |
| --- | --- | --- |
| `notifications` | `id`, `institution_id`, `user_id`, `kind`, `title`, `body`, `entity_type`, `entity_id`, `read_at`, `emailed_at` | Index `(user_id, read_at)` |
| `notification_preferences` | `user_id`, `institution_id`, `kind`, `in_app`, `email` | PK `(user_id, institution_id, kind)` |
| `course_materials` | `id`, `institution_id`, `offering_id`, `title`, `storage_path`, `mime_type`, `size_bytes`, `uploaded_by` | Private bucket path prefix `institution_id/` |
| `study_generations` | `id`, `institution_id`, `user_id`, `offering_id`, `kind`, `status`, `model`, `credit_cost`, `source_ids uuid[]`, `error`, `created_at` | Credit cost > 0 |
| `documents` | `id`, `institution_id`, `generation_id`, `owner_id`, `kind`, `title`, `storage_path`, `mime_type`, `size_bytes`, `approval`, `approved_by` | Private signed access only |
| `plans` | `id`, `code`, `name`, `student_band_max`, `ai_credits_per_term`, `features jsonb`, `price_per_term`, `currency` | `code` unique; global table |
| `subscriptions` | `id`, `institution_id`, `plan_id`, `status`, `period_start`, `period_end`, `grace_until` | One current subscription per institution (partial unique where status in active/grace) |
| `payments` | `id`, `institution_id`, `subscription_id`, `provider`, `provider_reference`, `amount`, `currency`, `status`, `paid_at`, `period_start`, `period_end` | `unique (provider, provider_reference)` |
| `ai_credit_ledger` | `id`, `institution_id`, `delta`, `reason`, `reference_id`, `balance_after`, `created_at` | Append-only; `balance_after` maintained by a transactional function |
| `audit_logs` | `id`, `institution_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `before jsonb`, `after jsonb`, `request_id`, `created_at` | Append-only; no update/delete policy |
| `job_queue` | `id`, `institution_id`, `kind`, `payload jsonb`, `status`, `attempts`, `job_key`, `checkpoint jsonb`, `last_error`, `locked_at` | `unique (job_key)` for idempotency |

## 5. Integrity under concurrency

```sql
-- Room double-booking protection
alter table room_bookings
  add constraint no_room_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  );

-- Within a version: no lecturer, room or group may be double-booked.
alter table timetable_entries
  add constraint no_lecturer_overlap
  exclude using gist (
    version_id with =,
    lecturer_id with =,
    day_of_week with =,
    timerange(starts_at, ends_at) with &&
  ) where (lecturer_id is not null);

alter table timetable_entries
  add constraint no_room_overlap_in_version
  exclude using gist (
    version_id with =,
    room_id with =,
    day_of_week with =,
    timerange(starts_at, ends_at) with &&
  ) where (room_id is not null);

alter table timetable_entries
  add constraint no_group_overlap
  exclude using gist (
    version_id with =,
    group_id with =,
    day_of_week with =,
    timerange(starts_at, ends_at) with &&
  ) where (group_id is not null);
```

Requires `create extension if not exists btree_gist;`.

Publishing is a single transaction that (a) re-validates the draft, (b) marks the previous published version `superseded`, and (c) inserts the new version with `status = 'published'`. The partial unique index plus `serializable` isolation prevents two simultaneous publications.

## 6. Indexing

| Index | Purpose |
| --- | --- |
| `(institution_id, semester_id)` on offerings, versions, calendar events | Semester-scoped lists |
| `(version_id, day_of_week, starts_at)` on entries | Grid rendering |
| `(lecturer_id)` and `(group_id)` on entries | Personal timetable views |
| `(semester_id, status)` on timetable_versions | Resolve the live version |
| `(institution_id, starts_at)` on room_bookings | Conflict lookups |
| `(user_id, read_at)` on notifications | Unread counts |
| `(institution_id, created_at desc)` on audit_logs | Admin audit view |
| `(status, locked_at)` on job_queue | Worker polling |
| Trigram index on `courses.title`, `institutions.name` | Search |

## 7. Row Level Security model

### 7.1 Helper functions

```sql
create or replace function public.auth_institution_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select institution_id
  from institution_memberships
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.auth_role(p_institution uuid)
returns membership_role
language sql stable security definer set search_path = public
as $$
  select role
  from institution_memberships
  where user_id = auth.uid()
    and institution_id = p_institution
    and status = 'active'
  limit 1;
$$;

create or replace function public.auth_department_ids(p_institution uuid)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select department_id
  from institution_memberships
  where user_id = auth.uid()
    and institution_id = p_institution
    and status = 'active'
    and department_id is not null;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from institution_memberships
    where user_id = auth.uid() and role = 'platform_admin' and status = 'active'
      and institution_id is null
  );
$$;
```

### 7.2 Policy patterns

- **Read:** `institution_id in (select * from auth_institution_ids())`, narrowed further by role/scope where required (e.g. `department_admin` limited to `auth_department_ids(institution_id)`).
- **Write:** capability check, e.g. `auth_role(institution_id) in ('institution_admin','faculty_admin','department_admin')`, plus scope restriction for faculty/department admins.
- **Student/lecturer self-service:** policies join to `students.user_id` / `lecturers.user_id` and only expose published versions.
- **Append-only tables** (`audit_logs`, `ai_credit_ledger`): no UPDATE or DELETE policies; writes happen through `SECURITY DEFINER` functions with explicit authorisation.
- **Platform tables** (plans): read for authenticated users, write only for `is_platform_admin()`.
- **Storage:** bucket policies require the object's first path segment to equal an institution the user belongs to; documents are downloaded through signed URLs after an authorisation check.

### 7.3 Testing isolation

Fixtures create two institutions with independent admins. Tests assert: direct table reads return only own rows; cross-tenant IDs produce empty results or constraint/403 errors; service functions reject foreign institution IDs; storage signed URLs cannot be requested across tenants.

Phase 3 extends this with `supabase/tests/institution_management.sql`: invitation tokens are unreadable as table rows, `create_invitation` refuses cross-tenant and lecturer callers, acceptance requires the invited email, tokens are single-use, and activity rows never leak across tenants. The institution status/slug guard is a column-level trigger because RLS cannot restrict individual columns.

## 8. Migrations and seeding

- Every change is a new file `supabase/migrations/YYYYMMDDHHMMSS_description.sql`; no edits to applied migrations.
- Enum values are added, never removed. Column drops are two-phase (stop writing, then drop in a later release).
- RLS policies ship in the same migration as the table.
- `supabase/seed.sql` provides platform plans and a local development institution; it never contains production data.
- Generated types (`supabase gen types typescript`) are committed and updated in the same PR as the migration.

## 9. Retention and backup

| Data | Retention |
| --- | --- |
| Published timetable versions | Indefinite (institutional record) |
| Audit logs | Institution-configured, default 24 months |
| AI generations and documents | Until deleted by owner or institution policy |
| Notifications | 12 months |
| Job records | 90 days after completion |
| Backups | Daily automated, 30-day retention; restore tested each release cycle |

## 10. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Database Architecture | Initial schema, ERD, constraints and RLS model |
| 1.1 | 2026-11-25 | Engineering | Added Phase 3 invitation, activity and profile-email tables to the ERD, catalogue and isolation notes |
