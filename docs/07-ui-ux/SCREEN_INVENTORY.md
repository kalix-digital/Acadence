# Acadence — Screen Inventory

> **Document ID:** UX-SCR-001 · **Version:** 1.0 · **Status:** Phase 1 implemented; remainder planned · **Date:** 2026-11-23 · **Owner:** Design
> **Related:** [Design System](DESIGN_SYSTEM.md) · [PRD](../03-requirements/PRD.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md)

## 1. Route map

| Route | Screen | Roles | Phase | Status |
| --- | --- | --- | --- | --- |
| `/` | Institution dashboard | Institution/faculty/department admin | 1 | **Implemented** (sample data) |
| `(public)/` | Marketing landing + sign-in entry | Public | 2 | Planned |
| `(auth)/sign-in` | Sign in | Public | 2 | Planned |
| `(auth)/forgot-password` | Password reset request | Public | 2 | Planned |
| `(auth)/reset-password` | New password | Public (token) | 2 | Planned |
| `(auth)/verify-email` | Email verification | Public (token) | 2 | Planned |
| `(auth)/invite/[token]` | Accept invitation | Invited user | 2 | Planned |
| `/platform` | Platform overview | Platform admin, support | 3 | Planned |
| `/platform/institutions` | Institution list | Platform admin | 3 | Planned |
| `/platform/institutions/new` | Provision institution | Platform admin | 3 | Planned |
| `/platform/institutions/[id]` | Institution detail (profile, campuses, admins, status) | Platform admin | 3 | Planned |
| `/platform/plans` | Plans and subscriptions | Platform admin | 16 | Planned |
| `/platform/audit` | Audit search | Platform admin, support | 18 | Planned |
| `/institution` | Institution overview | Institution admin | 3 | Planned |
| `/institution/settings` | Profile, branding, academic defaults | Institution admin | 3 | Planned |
| `/institution/members` | Members, invitations, roles | Institution admin | 3 | Planned |
| `/institution/campuses` | Campuses, buildings | Institution admin | 3–5 | Planned |
| `/institution/academics` | Sessions, semesters, programmes, courses | Academic admin | 4 | Planned |
| `/institution/academics/offerings` | Course offerings and lecturer assignment | Dept admin | 4 | Planned |
| `/institution/academics/students` | Students, groups, imports | Academic admin | 4 | Planned |
| `/institution/academics/lecturers` | Lecturers and limits | Academic admin | 4 | Planned |
| `/institution/rooms` | Rooms, availability, bookings, utilisation | Academic admin | 5 | Planned |
| `/faculty` | Faculty dashboard | Faculty admin | 15 | Planned |
| `/faculty/timetables` | Faculty timetables and approvals | Faculty admin | 6 | Planned |
| `/department` | Department dashboard | Dept admin | 15 | Planned |
| `/department/timetables` | Draft grid, conflicts, publish | Dept admin | 6–7 | Planned |
| `/department/workloads` | Workload review | Dept admin | 9 | Planned |
| `/lecturer` | Lecturer dashboard | Lecturer | 15 | Planned |
| `/lecturer/timetable` | Personal timetable | Lecturer | 6 | Planned |
| `/lecturer/requests` | Change requests | Lecturer | 6 | Planned |
| `/student` | Student dashboard | Student | 15 | Planned |
| `/student/timetable` | Personal timetable and exam dates | Student | 6 | Planned |
| `/student/attendance` | Own attendance | Student | 12 | Planned |
| `/student/study` | AI study material and documents | Student | 13–14 | Planned |
| `/shared/calendar` | Academic calendar | All staff | 10 | Planned |
| `/shared/analytics` | Analytics and reports | Admin roles | 15 | Planned |
| `/shared/notifications` | Notification centre | All | 11 | Planned |

## 2. Shell elements (all authenticated screens)

Icon rail · grouped sidebar with capability filtering · top bar (breadcrumbs, search, theme, notifications, profile) · page header with context line and actions · content area using shared cards.

## 3. Screen acceptance checklist

Every screen must include:

1. A clear page title and role/institution context.
2. Loading, empty, error and success states.
3. Server-validated forms with field-level errors.
4. Permission-aware actions (hidden **and** server-enforced).
5. Keyboard navigation and accessible labels.
6. Responsive behaviour at 360 px, 768 px and 1440 px.
7. No fabricated data presented as live.

## 4. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Design | Initial inventory |
