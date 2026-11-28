# Acadence — API Specification

> **Document ID:** API-001 · **Version:** 1.5 · **Status:** Approved conventions · **Date:** 2026-11-28 · **Owner:** Engineering
> **Related:** [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md) · [Database](../05-database/DATABASE_DESIGN.md) · [SRS](../03-requirements/SRS.md)

## 1. Surfaces

| Surface | Used for | Notes |
| --- | --- | --- |
| Server Components | Reads on page load | Tenant-scoped queries, no public cache |
| Server Actions | Form mutations from the app | Typed result objects, progressive enhancement |
| Route Handlers `/api/v1/*` | Integrations, webhooks, downloads, mobile clients later | JSON envelope, explicit status codes |

Business logic lives in services; all three surfaces call the same services. There is no second implementation of a rule for the API.

Phase 4 academic structure is served by Server Components (reads) and Server Actions (writes) only. No `/api/v1` endpoint is exposed for campuses, faculties, departments, sessions, semesters, programmes, courses or curricula yet; integrations will be added to the versioned API when Phase 15+ requires them, and they will reuse the same RLS-scoped queries and `can_manage_academic_unit` rule described in [AUTH_AND_MEMBERSHIPS §4.3](../05-database/AUTH_AND_MEMBERSHIPS.md).

## 2. Conventions

- Base path: `/api/v1`. Breaking changes require `/api/v2`.
- Content type: `application/json; charset=utf-8` (except file downloads and webhooks).
- Authentication: Supabase session cookie. Bearer tokens are not accepted for browser surfaces. Webhooks authenticate by signature.
- Tenant: institution is derived from the authenticated session and the resource path; a body-supplied `institution_id` is validated against membership and never trusted alone.
- IDs: UUID v4 in paths and bodies.
- Times: ISO 8601 with offset; timetable times are `HH:MM` local to the institution timezone.
- Date fields: `YYYY-MM-DD`.
- All list endpoints paginate; maximum page size 100 (default 25).
- Every mutating endpoint accepts `Idempotency-Key`; replaying the same key returns the original result.

### 2.1 Response envelope

```json
{ "data": { "...": "..." }, "meta": { "requestId": "req_01H..." } }
```

Errors:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The timetable entry overlaps an existing lecturer booking.",
    "fields": { "starts_at": "Overlaps CSC 401 (Mon 10:00–12:00)" },
    "requestId": "req_01H..."
  }
}
```

### 2.2 Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `AUTH_REQUIRED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Authenticated but not permitted (role, scope or tenant) |
| `NOT_FOUND` | 404 | Entity absent or not visible to this tenant |
| `VALIDATION_FAILED` | 422 | Schema validation failed; `fields` populated |
| `CONFLICT` | 409 | State conflict (duplicate code, stale version, open change request) |
| `HARD_CONSTRAINT_VIOLATION` | 409 | Publication blocked by conflicts |
| `LIMIT_EXCEEDED` | 402/429 | Plan limit or AI credits exhausted |
| `RATE_LIMITED` | 429 | Too many requests, `Retry-After` set |
| `INTERNAL` | 500 | Unexpected failure; logs carry `requestId` |

## 3. Endpoint catalogue

Endpoints are introduced by the phase that implements them. All are institution-scoped unless marked platform.

### 3.1 Institutions and members (Phase 3)

| Method | Path | Capability | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/platform/institutions` | platform admin | Provision institution |
| `PATCH` | `/api/v1/platform/institutions/{id}/status` | platform admin | Approve / suspend / archive |
| `GET` | `/api/v1/institutions/{id}` | member | Profile |
| `PATCH` | `/api/v1/institutions/{id}` | institution admin | Profile, branding |
| `GET` | `/api/v1/institutions/{id}/settings` | member | Settings |
| `PATCH` | `/api/v1/institutions/{id}/settings` | institution admin | Academic defaults, limits |
| `GET/POST` | `/api/v1/institutions/{id}/campuses` | institution admin | Campuses |
| `GET/POST` | `/api/v1/institutions/{id}/faculties` | institution/faculty admin | Faculties |
| `GET/POST` | `/api/v1/institutions/{id}/departments` | institution/faculty admin | Departments |
| `GET/POST` | `/api/v1/institutions/{id}/members` | institution admin | Memberships |
| `POST` | `/api/v1/institutions/{id}/members/invite` | institution admin | Invite by email |
| `PATCH` | `/api/v1/institutions/{id}/members/{membershipId}` | institution admin | Role/scope change |

Phase 3 ships these operations as Server Actions over RLS rather than as public REST routes; the tables and RPCs below are the stable contract. Invitation creation, preview and acceptance are database functions so authorisation and token consumption happen in one transaction:

| Function | Caller | Contract |
| --- | --- | --- |
| `create_invitation(p_institution, p_email, p_role, p_expires_in_days)` | platform admin, or that institution's institution admin | Returns the raw token once; stores only its SHA-256 hash. Rejects platform roles, duplicates, existing members and foreign tenants with `42501`/`23505` |
| `invitation_preview(p_token)` | `anon`/`authenticated` holding the token | Returns institution name, invited email, role and state (`pending`/`accepted`/`revoked`/`expired`). Nothing else about the tenant |
| `accept_invitation_token(p_token)` | authenticated user whose email matches the invitation | Creates or reactivates the membership and consumes the token atomically. `42501` on email mismatch, `23505` when used/revoked/expired |

Server Action mutation results follow §4; forms surface `fields` inline. Invitation links are returned once in the action result (`inviteUrl`) because the token cannot be recovered afterwards.

### 3.2 Academic administration (Phase 4)

| Method | Path | Capability | Purpose |
| --- | --- | --- | --- |
| `GET/POST` | `/api/v1/institutions/{id}/sessions` | academic admin | Sessions |
| `GET/POST` | `/api/v1/institutions/{id}/semesters` | academic admin | Semesters |
| `GET/POST` | `/api/v1/institutions/{id}/programmes` | academic admin | Programmes |
| `GET/POST` | `/api/v1/institutions/{id}/courses` | academic admin | Courses |
| `GET/POST` | `/api/v1/institutions/{id}/offerings` | dept admin | Course offerings |
| `GET/POST` | `/api/v1/institutions/{id}/students` | academic admin | Students |
| `GET/POST` | `/api/v1/institutions/{id}/lecturers` | academic admin | Lecturers |
| `GET/POST` | `/api/v1/institutions/{id}/groups` | dept admin | Student groups |
| `GET/POST` | `/api/v1/institutions/{id}/groups/{groupId}/members` | dept admin | Group membership (archive, never delete) |
| `GET/POST` | `/api/v1/institutions/{id}/offerings/{offeringId}/lecturers` | dept admin | Lecturer assignments (lead/assistant, contact hours) |
| `GET/POST` | `/api/v1/institutions/{id}/offerings/{offeringId}/groups` | dept admin | Student groups linked to an offering |
| `GET/POST` | `/api/v1/institutions/{id}/calendar-events?sessionId=` | academic admin | Calendar events; teaching weeks are derived, not stored |
| `POST` | `/api/v1/institutions/{id}/imports/{entity}` | academic admin | CSV import (preview then commit) |

Phase 4b is implemented as Next.js Server Actions rather than REST routes, like the rest of the academic module: `saveAcademicRecordAction` covers every entity above, `archiveAcademicRecordAction` archives and restores, and `importRecordsAction` runs the two-pass CSV import. A file with any invalid row imports nothing; the action returns per-row errors for the dry run.

### 3.3 Facilities (Phase 5)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET/POST` | `/api/v1/institutions/{id}/buildings` | Buildings |
| `GET/POST` | `/api/v1/institutions/{id}/rooms` | Rooms and features |
| `GET/POST` | `/api/v1/institutions/{id}/rooms/{roomId}/availability` | Availability windows |
| `GET/POST` | `/api/v1/institutions/{id}/rooms/{roomId}/bookings` | Ad-hoc bookings |
| `GET` | `/api/v1/institutions/{id}/rooms/utilisation?semesterId=` | Utilisation report |

Phase 5 is implemented as Next.js Server Actions, like Phases 3–4b: `saveFacilityRecordAction` covers buildings, rooms, features, room equipment, availability windows and bookings; `archiveFacilityRecordAction` archives and restores; `cancelBookingAction` cancels a booking and releases its slot. A refused booking returns the database's own reason (capacity, availability window, semester window or overlap) rather than a generic failure. Institution and faculty administrators manage facilities; department administrators may book only for their own department, which the RLS policies enforce.

### 3.4 Timetables and conflicts (Phases 6–7)

| Method | Path | Capability | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/institutions/{id}/timetables/drafts` | dept/faculty admin | Create draft |
| `GET` | `/api/v1/institutions/{id}/timetables/drafts/{draftId}` | scoped admin | Draft with entries |
| `POST` | `/api/v1/institutions/{id}/timetables/drafts/{draftId}/entries` | scoped admin | Add entry |
| `PATCH` | `/api/v1/institutions/{id}/timetables/entries/{entryId}` | scoped admin | Move/edit entry |
| `DELETE` | `/api/v1/institutions/{id}/timetables/entries/{entryId}` | scoped admin | Remove entry |
| `POST` | `/api/v1/institutions/{id}/timetables/drafts/{draftId}/validate` | scoped admin | Run validation, return report |
| `POST` | `/api/v1/institutions/{id}/timetables/drafts/{draftId}/publish` | faculty/institution admin | Publish new version |
| `GET` | `/api/v1/institutions/{id}/timetables/versions?semesterId=` | member | Version history |
| `GET` | `/api/v1/institutions/{id}/timetables/views/{scope}` | member | `scope` ∈ `department`, `faculty`, `lecturer`, `group`, `room` |
| `POST` | `/api/v1/institutions/{id}/timetables/change-requests` | lecturer/admin | Request a change |
| `PATCH` | `/api/v1/institutions/{id}/timetables/change-requests/{requestId}` | faculty/institution admin | Approve/reject |
| `GET` | `/api/v1/institutions/{id}/conflicts?draftId=&versionId=` | scoped admin | Conflict report |

Phase 6 is implemented as Next.js Server Actions plus database functions, like the earlier phases. `saveTimetableDraftAction`, `saveTimetableEntryAction` and `deleteTimetableEntryAction` cover drafts and entries; `moveTimetableEntryAction` performs a drag-and-drop move; `publishTimetableAction` validates first and then calls `publish_timetable_draft`, which supersedes the live version, inserts the next version and copies both the draft's rows and the live rows outside the draft's scope in one transaction; `duplicateTimetableDraftAction` calls the code-matching copy function and reports skipped rows; `archiveTimetableVersionAction` retires a superseded version; `importTimetableEntriesAction` runs the dry run and the all-or-nothing commit. Change requests use `submit_timetable_change_request` and `review_timetable_change_request`; approval applies the proposal to a fresh department draft of the live version and publishes the result, recording the request as the change summary. A blocked publication lists every hard issue found and never writes a partial version.

### 3.5 Generation and workload (Phases 8–9)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/institutions/{id}/scheduling/runs` | Start generation (returns run) |
| `GET` | `/api/v1/institutions/{id}/scheduling/runs/{runId}` | Status, progress, result summary |
| `POST` | `/api/v1/institutions/{id}/scheduling/runs/{runId}/cancel` | Cancel a run |
| `GET` | `/api/v1/institutions/{id}/workloads?semesterId=` | Workload report |
| `POST` | `/api/v1/institutions/{id}/workloads/{semesterId}/submit` | Submit for approval |
| `POST` | `/api/v1/institutions/{id}/workloads/{semesterId}/approve` | Approve |

### 3.6 Calendar, attendance, notifications (Phases 10–12)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET/POST` | `/api/v1/institutions/{id}/calendar/events` | Calendar events |
| `GET` | `/api/v1/institutions/{id}/calendar/ics` | ICS feed for the signed-in user |
| `GET/POST` | `/api/v1/institutions/{id}/attendance/sessions` | Attendance sessions |
| `POST` | `/api/v1/institutions/{id}/attendance/sessions/{sessionId}/records` | Record attendance |
| `GET` | `/api/v1/institutions/{id}/students/{studentId}/attendance` | History |
| `GET` | `/api/v1/institutions/{id}/notifications` | Inbox |
| `POST` | `/api/v1/institutions/{id}/notifications/{notificationId}/read` | Mark read |
| `PATCH` | `/api/v1/institutions/{id}/notification-preferences` | Preferences |

### 3.7 AI, documents, analytics, subscription, platform (Phases 13–16)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/institutions/{id}/ai/generations` | Request study material |
| `GET` | `/api/v1/institutions/{id}/ai/generations?offeringId=` | History and credit use |
| `POST` | `/api/v1/institutions/{id}/documents/{documentId}/approval` | Lecturer approval |
| `GET` | `/api/v1/institutions/{id}/documents/{documentId}/download` | Signed URL redirect |
| `GET` | `/api/v1/institutions/{id}/analytics/overview` | Dashboard metrics |
| `GET` | `/api/v1/institutions/{id}/analytics/{report}` | `utilisation`, `workload`, `conflicts`, `attendance` |
| `GET` | `/api/v1/institutions/{id}/subscription` | Plan, usage, credits |
| `POST` | `/api/v1/institutions/{id}/subscription/renew` | Start renewal |
| `GET` | `/api/v1/institutions/{id}/billing` | Billing history |
| `GET` | `/api/v1/platform/metrics` | Platform analytics |
| `GET` | `/api/v1/platform/audit?institutionId=` | Audit search |

### 3.8 Webhooks

| Path | Provider | Verification |
| --- | --- | --- |
| `/api/v1/webhooks/payments` | Payment provider | HMAC signature + `provider_reference` idempotency |
| `/api/v1/webhooks/email` | Resend | Signature + event id de-duplication |

Webhooks are idempotent, verify the signature before parsing business fields, respond `2xx` only after the durable write, and never trust event payload amounts without cross-checking the stored payment.

## 4. Server Action result contract

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: "VALIDATION_FAILED" | "FORBIDDEN" | "CONFLICT" | "LIMIT_EXCEEDED" | "INTERNAL";
      message: string;
      fields?: Record<string, string>;
    };
```

Actions never throw for expected failures; the UI maps `fields` to form errors and `message` to the error banner.

## 5. Rate limits

| Surface | Limit |
| --- | --- |
| Sign-in / password reset | 5 requests / 10 min / IP + email |
| AI generation | Per-user daily cap and per-institution credit balance |
| CSV import | 3 concurrent imports per institution |
| General API | 120 requests / min / user |
| Public webhooks | 600 requests / min / provider |

Rate limiting is server-side and returns `429` with `Retry-After`; the UI disables the action while limited.

## 6. Versioning and deprecation

- Additive changes ship without a version bump.
- A breaking change requires `/api/v2`, a deprecation notice in this document, and at least one release of overlap.
- Every endpoint added by a phase is documented here in the same pull request.

## 7. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Engineering | Initial surface conventions and endpoint catalogue |
| 1.1 | 2026-11-25 | Engineering | Documented the Phase 3 invitation RPC contract and Server Action delivery |
| 1.2 | 2026-11-25 | Engineering | Recorded that Phase 4 academic structure is Server-Component/Action only, with no `/api/v1` endpoints yet |
| 1.3 | 2026-11-27 | Engineering | Recorded Phase 4b people, offering, calendar and CSV-import actions |
| 1.4 | 2026-11-27 | Engineering | Recorded Phase 5 facilities actions, cancellation semantics and department booking scope |
