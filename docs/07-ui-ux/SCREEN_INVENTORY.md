# Acadence — Screen Inventory

> **Document ID:** UX-SCR-001 · **Version:** 1.4 · **Status:** Phases 1–5 implemented; remainder planned · **Date:** 2026-11-27 · **Owner:** Design
> **Related:** [Design System](DESIGN_SYSTEM.md) · [PRD](../03-requirements/PRD.md) · [Roadmap](../10-implementation/IMPLEMENTATION_ROADMAP.md)

## 1. Route map

| Route | Screen | Roles | Phase | Status |
| --- | --- | --- | --- | --- |
| `/` | Public landing + sign-in entry | Public | 2 | **Implemented** |
| `(auth)/sign-in` | Sign in | Public | 2 | **Implemented** |
| `(auth)/forgot-password` | Password reset request | Public | 2 | **Implemented** |
| `(auth)/reset-password` | New password | Public (token) | 2 | **Implemented** |
| `(auth)/verify-email` | Email verification | Public (token) | 2 | Planned (hosted by Supabase confirmation) |
| `/invite/[token]` | Accept invitation / create invited account | Invited user | 3 | **Implemented** |
| `/platform` | Platform overview | Platform admin | 3 | **Implemented** |
| `/platform/institutions` | Institution list | Platform admin | 3 | **Implemented** |
| `/platform/institutions/new` | Provision institution | Platform admin | 3 | **Implemented** |
| `/platform/institutions/[id]` | Institution detail (profile, admins, status, invitations, activity) | Platform admin | 3 | **Implemented** |
| `/platform/plans` | Plans and subscriptions | Platform admin | 16 | Planned |
| `/platform/audit` | Audit search | Platform admin, support | 18 | Planned |
| `/institution` | Institution overview | Institution admin | 3 | **Implemented** (sample metrics until Phase 15) |
| `/institution/settings` | Profile, branding, academic defaults | Institution admin | 3 | **Implemented** |
| `/institution/members` | Members, invitations, roles | Institution admin | 3 | **Implemented** |
| `/institution/academics` | Academic overview: counts, hierarchy, recent changes | Academic admin | 4 | **Implemented** |
| `/institution/academics/campuses` | Campuses (optional sites) | Academic admin | 4 | **Implemented** |
| `/institution/academics/faculties` | Faculties | Academic admin | 4 | **Implemented** |
| `/institution/academics/departments` | Departments | Academic admin | 4 | **Implemented** |
| `/institution/academics/sessions` | Academic sessions and semesters | Academic admin | 4 | **Implemented** |
| `/institution/academics/programmes` | Programmes | Academic admin | 4 | **Implemented** |
| `/institution/academics/courses` | Courses and programme curriculum | Academic admin | 4 | **Implemented** |
| `/institution/academics/offerings` | Course offerings, lecturer assignments, linked groups | Dept admin | 4b | **Implemented** |
| `/institution/academics/students` | Student roster, filters, CSV import | Academic admin | 4b | **Implemented** |
| `/institution/academics/lecturers` | Lecturer roster by department, CSV import | Academic admin | 4b | **Implemented** |
| `/institution/academics/groups` | Cohort groups and many-to-many membership | Dept admin | 4b | **Implemented** |
| `/institution/academics/calendar` | Calendar events and derived teaching weeks | Academic admin | 4b | **Implemented** |
| `/institution/facilities` | Facilities overview: counts, sections, conflict model | Facilities admin, dept admin | 5 | **Implemented** |
| `/institution/facilities/buildings` | Buildings per campus | Facilities admin | 5 | **Implemented** |
| `/institution/facilities/rooms` | Rooms, capacity, accessibility, room equipment | Facilities admin | 5 | **Implemented** |
| `/institution/facilities/features` | Institution feature/equipment catalogue | Facilities admin | 5 | **Implemented** |
| `/institution/facilities/availability` | Weekly availability windows per room per semester | Facilities admin | 5 | **Implemented** |
| `/institution/facilities/bookings` | Ad-hoc bookings and cancellation | Facilities admin, dept admin | 5 | **Implemented** |
| `/institution/facilities/utilisation` | Booked over available hours per room | Facilities admin | 5 | **Implemented** |
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
| 1.1 | 2026-11-25 | Design | Marked Phase 2 and Phase 3 routes implemented; campuses deferred |
| 1.2 | 2026-11-25 | Design | Added the Phase 4 academic screens; students, offerings, lecturers and calendar moved to Phase 4b |
| 1.3 | 2026-11-27 | Design | Marked the Phase 4b people, offering and calendar screens implemented |
| 1.4 | 2026-11-27 | Design | Replaced the single planned `/institution/rooms` row with the seven Phase 5 facilities screens |
