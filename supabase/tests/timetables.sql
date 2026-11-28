-- Acadence · Phase 6 · Timetable tests
--
-- Runs on the disposable cluster created by scripts/db-test.sh, after the
-- harness and every migration, and as `authenticated` with a JWT subject so
-- RLS and the definer scope helpers decide every outcome.
--
-- Institutions: Tau (one faculty, two departments, a session with two
-- semesters, rooms, courses, offerings, a lecturer and a cohort group) and
-- Upsilon as the neighbouring tenant.
--
-- Covers: draft creation and scope, entry validation, room/lecturer/group
-- double-booking inside a draft, semester mismatch, publishing (immutability,
-- version numbering, supersession, cross-scope union and clash rejection),
-- draft duplication by code, archiving, change requests (submit, duplicate,
-- approve → new version), role boundaries and anonymous denial.

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Seed (as the cluster owner, before switching to authenticated)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('bce00000-0000-4000-8000-0000000000a1', 'admin.t@tau.test',        '{"full_name":"Tara Tau"}'),
  ('bce00000-0000-4000-8000-0000000000a2', 'department.t@tau.test',   '{"full_name":"Dele Tau"}'),
  ('bce00000-0000-4000-8000-0000000000a3', 'lecturer.t@tau.test',     '{"full_name":"Lami Tau"}'),
  ('bce00000-0000-4000-8000-0000000000a4', 'admin.u@upsilon.test',    '{"full_name":"Uche Upsilon"}');

insert into public.institutions (id, name, slug, status) values
  ('bce00000-0000-4000-8000-000000000001', 'Tau University', 'tau-university', 'active'),
  ('bce00000-0000-4000-8000-000000000002', 'Upsilon College', 'upsilon-college', 'active');

insert into public.campuses (id, institution_id, name, code) values
  ('bce00000-0000-4000-8000-0000000000b1', 'bce00000-0000-4000-8000-000000000001', 'Main campus', 'MAIN');

insert into public.faculties (id, institution_id, name, code) values
  ('bce00000-0000-4000-8000-0000000000b2', 'bce00000-0000-4000-8000-000000000001', 'Faculty of Science', 'SCI');

insert into public.departments (id, institution_id, faculty_id, name, code) values
  ('bce00000-0000-4000-8000-0000000000b3', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b2', 'Computer Science', 'CSC'),
  ('bce00000-0000-4000-8000-0000000000b4', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b2', 'Mathematics', 'MTH');

insert into public.academic_sessions (id, institution_id, name, starts_on, ends_on) values
  ('bce00000-0000-4000-8000-0000000000b5', 'bce00000-0000-4000-8000-000000000001',
   '2027/2028', '2027-09-01', '2028-07-31');

insert into public.semesters (
  id, institution_id, session_id, name, sequence,
  teaching_starts_on, teaching_ends_on, exam_starts_on, exam_ends_on
) values
  ('bce00000-0000-4000-8000-0000000000b6', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b5', 'First Semester', 1,
   '2027-09-13', '2027-12-17', '2028-01-10', '2028-01-28'),
  ('bce00000-0000-4000-8000-0000000000b7', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b5', 'Second Semester', 2,
   '2028-02-07', '2028-06-09', '2028-06-19', '2028-07-07');

insert into public.buildings (id, institution_id, campus_id, name, code) values
  ('bce00000-0000-4000-8000-0000000000c1', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b1', 'Science Block', 'SB');

insert into public.rooms (id, institution_id, building_id, name, code, room_type, capacity) values
  ('bce00000-0000-4000-8000-0000000000c2', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000c1', 'Hall T', 'HALL-T', 'lecture_hall', 120),
  ('bce00000-0000-4000-8000-0000000000c3', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000c1', 'Lab T', 'LAB-T', 'laboratory', 40);

insert into public.programmes (id, institution_id, department_id, code, name, level, duration_years) values
  ('bce00000-0000-4000-8000-0000000000d3', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b3', 'BSC-CS', 'BSc Computer Science', 'undergraduate', 4);

insert into public.courses (
  id, institution_id, department_id, code, title, units, level, required_room_type
) values
  ('bce00000-0000-4000-8000-0000000000d1', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b3', 'CSC101', 'Introduction to Computing', 3, 100, 'lecture_hall'),
  ('bce00000-0000-4000-8000-0000000000d2', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b3', 'CSC102', 'Programming Laboratory', 2, 100, 'laboratory'),
  ('bce00000-0000-4000-8000-0000000000d4', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000b4', 'MTH101', 'Elementary Mathematics', 3, 100, 'classroom');

insert into public.lecturers (
  id, institution_id, user_id, staff_number, first_name, last_name, department_id
) values
  ('bce00000-0000-4000-8000-0000000000e1', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000a3', 'T-100', 'Lami', 'Tau',
   'bce00000-0000-4000-8000-0000000000b3');

insert into public.student_groups (
  id, institution_id, programme_id, session_id, level, name, code, expected_size
) values
  ('bce00000-0000-4000-8000-0000000000f1', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000d3', 'bce00000-0000-4000-8000-0000000000b5',
   100, 'CS 100 cohort', 'CS-100', 60);

insert into public.course_offerings (
  id, institution_id, course_id, session_id, semester_id, expected_size
) values
  ('bce00000-0000-4000-8000-0000000000e2', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000d1', 'bce00000-0000-4000-8000-0000000000b5',
   'bce00000-0000-4000-8000-0000000000b6', 60),
  ('bce00000-0000-4000-8000-0000000000e3', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000d2', 'bce00000-0000-4000-8000-0000000000b5',
   'bce00000-0000-4000-8000-0000000000b6', 30),
  ('bce00000-0000-4000-8000-0000000000e4', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000d4', 'bce00000-0000-4000-8000-0000000000b5',
   'bce00000-0000-4000-8000-0000000000b6', 50),
  -- Only CSC101 is offered again in the second semester, so duplication has
  -- one row to copy and one to report as skipped.
  ('bce00000-0000-4000-8000-0000000000e5', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-0000000000d1', 'bce00000-0000-4000-8000-0000000000b5',
   'bce00000-0000-4000-8000-0000000000b7', 60);

insert into public.institution_memberships (
  institution_id, user_id, role, status, faculty_id, department_id, accepted_at
) values
  ('bce00000-0000-4000-8000-000000000001', 'bce00000-0000-4000-8000-0000000000a1',
   'institution_admin', 'active', null, null, now()),
  ('bce00000-0000-4000-8000-000000000001', 'bce00000-0000-4000-8000-0000000000a2',
   'department_admin', 'active', null, 'bce00000-0000-4000-8000-0000000000b3', now()),
  ('bce00000-0000-4000-8000-000000000001', 'bce00000-0000-4000-8000-0000000000a3',
   'lecturer', 'active', null, null, now()),
  ('bce00000-0000-4000-8000-000000000002', 'bce00000-0000-4000-8000-0000000000a4',
   'institution_admin', 'active', null, null, now());

-- ---------------------------------------------------------------------------
-- Institution administrator: drafts, entries and their rules
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"bce00000-0000-4000-8000-0000000000a1","role":"authenticated"}',
  false
);
set role authenticated;

insert into public.timetable_drafts (
  id, institution_id, semester_id, department_id, title, created_by
) values (
  'bce00000-0000-4000-8000-000000000010', 'bce00000-0000-4000-8000-000000000001',
  'bce00000-0000-4000-8000-0000000000b6', 'bce00000-0000-4000-8000-0000000000b3',
  'CSC first semester', 'bce00000-0000-4000-8000-0000000000a1'
);

select test.assert(
  (select count(*) from public.timetable_drafts) = 1,
  'institution admin creates a department draft'
);

insert into public.timetable_entries (
  id, institution_id, draft_id, offering_id, lecturer_id, room_id, group_id,
  day_of_week, starts_at, ends_at
) values
  ('bce00000-0000-4000-8000-000000000011', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-000000000010', 'bce00000-0000-4000-8000-0000000000e2',
   'bce00000-0000-4000-8000-0000000000e1', 'bce00000-0000-4000-8000-0000000000c2',
   'bce00000-0000-4000-8000-0000000000f1', 1, '09:00', '11:00'),
  ('bce00000-0000-4000-8000-000000000012', 'bce00000-0000-4000-8000-000000000001',
   'bce00000-0000-4000-8000-000000000010', 'bce00000-0000-4000-8000-0000000000e3',
   'bce00000-0000-4000-8000-0000000000e1', 'bce00000-0000-4000-8000-0000000000c3',
   'bce00000-0000-4000-8000-0000000000f1', 1, '11:00', '13:00');

select test.assert(
  (select department_id from public.timetable_entries
    where id = 'bce00000-0000-4000-8000-000000000011') = 'bce00000-0000-4000-8000-0000000000b3',
  'the entry department follows the offering course'
);

select test.expect_error(
  $sql$insert into public.timetable_entries (
         institution_id, draft_id, offering_id, room_id, day_of_week, starts_at, ends_at)
       values ('bce00000-0000-4000-8000-000000000001',
               'bce00000-0000-4000-8000-000000000010', 'bce00000-0000-4000-8000-0000000000e2',
               'bce00000-0000-4000-8000-0000000000c2', 1, '10:00', '10:30')$sql$,
  '23P01',
  'three lectures cannot share one room at the same time'
);

select test.expect_error(
  $sql$insert into public.timetable_entries (
         institution_id, draft_id, offering_id, lecturer_id, day_of_week, starts_at, ends_at)
       values ('bce00000-0000-4000-8000-000000000001',
               'bce00000-0000-4000-8000-000000000010', 'bce00000-0000-4000-8000-0000000000e2',
               'bce00000-0000-4000-8000-0000000000e1', 1, '10:00', '12:00')$sql$,
  '23P01',
  'a lecturer cannot teach two entries at once'
);

select test.expect_error(
  $sql$insert into public.timetable_entries (
         institution_id, draft_id, offering_id, group_id, day_of_week, starts_at, ends_at)
       values ('bce00000-0000-4000-8000-000000000001',
               'bce00000-0000-4000-8000-000000000010', 'bce00000-0000-4000-8000-0000000000e2',
               'bce00000-0000-4000-8000-0000000000f1', 1, '09:30', '10:30')$sql$,
  '23P01',
  'a student group cannot be in two places at once'
);

select test.expect_error(
  $sql$insert into public.timetable_entries (
         institution_id, draft_id, offering_id, day_of_week, starts_at, ends_at)
       values ('bce00000-0000-4000-8000-000000000001',
               'bce00000-0000-4000-8000-000000000010', 'bce00000-0000-4000-8000-0000000000e5',
               2, '09:00', '10:00')$sql$,
  'P0001',
  'an offering from another semester is refused'
);

select test.expect_error(
  $sql$insert into public.timetable_entries (
         institution_id, draft_id, offering_id, day_of_week, starts_at, ends_at)
       values ('bce00000-0000-4000-8000-000000000001',
               'bce00000-0000-4000-8000-000000000010', 'bce00000-0000-4000-8000-0000000000e4',
               2, '09:00', '10:00')$sql$,
  'P0001',
  'a department draft refuses another department''s offering'
);

-- ---------------------------------------------------------------------------
-- Publishing
-- ---------------------------------------------------------------------------
select public.publish_timetable_draft(
  'bce00000-0000-4000-8000-000000000010', 'First release', '{}'::jsonb
);

select test.assert(
  (select count(*) from public.timetable_versions
    where semester_id = 'bce00000-0000-4000-8000-0000000000b6' and status = 'published') = 1,
  'publishing creates one live version per semester'
);

select test.assert(
  (select count(*) from public.timetable_entries e
     join public.timetable_versions v on v.id = e.version_id
    where v.status = 'published') = 2,
  'the published version carries the draft entries'
);

select test.assert(
  (select version_no from public.timetable_versions
    where semester_id = 'bce00000-0000-4000-8000-0000000000b6' and status = 'published') = 1,
  'the first version is numbered 1'
);

-- Published entries are immutable: the update policy only accepts draft rows,
-- so this changes nothing.
with changed as (
  update public.timetable_entries set starts_at = '08:00'
  where id in (select e.id from public.timetable_entries e
                 join public.timetable_versions v on v.id = e.version_id
                where v.status = 'published')
  returning 1
)
select test.assert(
  (select count(*) from changed) = 0,
  'published entries cannot be edited in place'
);

select test.expect_error(
  $sql$delete from public.timetable_versions$sql$,
  '42501',
  'authenticated holds no DELETE on timetable versions'
);

-- ---------------------------------------------------------------------------
-- Duplication: matched by code, unmatched rows reported
-- ---------------------------------------------------------------------------
select public.duplicate_timetable_draft(
  'bce00000-0000-4000-8000-000000000010',
  'bce00000-0000-4000-8000-0000000000b7',
  'CSC second semester (copy)'
);

select test.assert(
  (select count(*) from public.timetable_drafts
    where title = 'CSC second semester (copy)') = 1,
  'duplicating a draft creates a new one for the target semester'
);

select test.assert(
  (select count(*) from public.timetable_entries e
     join public.timetable_drafts d on d.id = e.draft_id
    where d.title = 'CSC second semester (copy)') = 1,
  'duplication copies the entry whose course is offered again and skips the other'
);

-- ---------------------------------------------------------------------------
-- Cross-department union: one live version, clashes still rejected
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;

insert into public.timetable_drafts (
  id, institution_id, semester_id, department_id, title, created_by
) values (
  'bce00000-0000-4000-8000-000000000020', 'bce00000-0000-4000-8000-000000000001',
  'bce00000-0000-4000-8000-0000000000b6', 'bce00000-0000-4000-8000-0000000000b4',
  'MTH first semester', 'bce00000-0000-4000-8000-0000000000a1'
);

insert into public.timetable_entries (
  id, institution_id, draft_id, offering_id, room_id, day_of_week, starts_at, ends_at
) values (
  'bce00000-0000-4000-8000-000000000021', 'bce00000-0000-4000-8000-000000000001',
  'bce00000-0000-4000-8000-000000000020', 'bce00000-0000-4000-8000-0000000000e4',
  'bce00000-0000-4000-8000-0000000000c2', 1, '09:00', '11:00'
);

select test.expect_error(
  $sql$select public.publish_timetable_draft('bce00000-0000-4000-8000-000000000020')$sql$,
  '23P01',
  'publishing rejects a room clash with another department''s entry'
);

update public.timetable_entries set starts_at = '14:00', ends_at = '16:00'
 where id = 'bce00000-0000-4000-8000-000000000021';

select public.publish_timetable_draft(
  'bce00000-0000-4000-8000-000000000020', 'Mathematics added', '{}'::jsonb
);

select test.assert(
  (select count(*) from public.timetable_entries e
     join public.timetable_versions v on v.id = e.version_id
    where v.status = 'published') = 3,
  'the new version carries both departments, not only the publishing scope'
);

select test.assert(
  (select count(*) from public.timetable_versions
    where semester_id = 'bce00000-0000-4000-8000-0000000000b6' and status = 'superseded') = 1,
  'the previous version is superseded, never overwritten'
);

select test.assert(
  (select count(*) from public.timetable_versions
    where semester_id = 'bce00000-0000-4000-8000-0000000000b6' and status = 'published') = 1,
  'exactly one live version remains'
);

-- ---------------------------------------------------------------------------
-- Archiving
-- ---------------------------------------------------------------------------
select public.archive_timetable_version(
  (select id from public.timetable_versions where status = 'superseded'
    and semester_id = 'bce00000-0000-4000-8000-0000000000b6')
);

select test.assert(
  (select count(*) from public.timetable_versions
    where semester_id = 'bce00000-0000-4000-8000-0000000000b6' and status = 'archived') = 1,
  'a superseded version can be archived'
);

select test.expect_error(
  $sql$select public.archive_timetable_version(
        (select id from public.timetable_versions where status = 'published'
          and semester_id = 'bce00000-0000-4000-8000-0000000000b6'))$sql$,
  'P0001',
  'the live version cannot be archived before a replacement is published'
);

-- ---------------------------------------------------------------------------
-- Change requests: lecturer submits, department admin approves, republish
-- ---------------------------------------------------------------------------
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"bce00000-0000-4000-8000-0000000000a3","role":"authenticated"}',
  false
);
set role authenticated;

select public.submit_timetable_change_request(
  (select e.id from public.timetable_entries e
     join public.timetable_versions v on v.id = e.version_id
    where v.status = 'published'
      and e.offering_id = 'bce00000-0000-4000-8000-0000000000e2'),
  '{"day_of_week":2,"starts_at":"09:00","ends_at":"11:00"}'::jsonb,
  'Monday clashes with a laboratory session'
);

select test.assert(
  (select count(*) from public.timetable_change_requests where status = 'pending') = 1,
  'the lecturer sees and submits a request for their own entry'
);

select test.expect_error(
  $sql$select public.submit_timetable_change_request(
        (select e.id from public.timetable_entries e
           join public.timetable_versions v on v.id = e.version_id
          where v.status = 'published'
            and e.offering_id = 'bce00000-0000-4000-8000-0000000000e2'),
        '{"day_of_week":3}'::jsonb,
        'Second request for the same entry')$sql$,
  '23505',
  'one entry has at most one open request'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"bce00000-0000-4000-8000-0000000000a2","role":"authenticated"}',
  false
);
set role authenticated;

select public.review_timetable_change_request(
  (select id from public.timetable_change_requests where status = 'pending'),
  true,
  'Moved to Tuesday to clear the lab clash.'
);

select test.assert(
  (select count(*) from public.timetable_change_requests
    where status = 'approved' and created_version_id is not null) = 1,
  'approval records the version it produced'
);

select test.assert(
  (select count(*) from public.timetable_versions
    where semester_id = 'bce00000-0000-4000-8000-0000000000b6' and status = 'published') = 1,
  'approval publishes a new live version and supersedes the old one'
);

select test.assert(
  (select e.day_of_week from public.timetable_entries e
     join public.timetable_versions v on v.id = e.version_id
    where v.status = 'published'
      and e.offering_id = 'bce00000-0000-4000-8000-0000000000e2') = 2,
  'the approved change moved the entry to the requested day'
);

select test.assert(
  (select count(*) from public.timetable_entries e
     join public.timetable_versions v on v.id = e.version_id
    where v.status = 'published') = 3,
  'the approved version still carries every department'
);

-- ---------------------------------------------------------------------------
-- Role boundaries
-- ---------------------------------------------------------------------------
select test.expect_error(
  $sql$insert into public.timetable_drafts (institution_id, semester_id, department_id, title)
       values ('bce00000-0000-4000-8000-000000000001',
               'bce00000-0000-4000-8000-0000000000b6',
               'bce00000-0000-4000-8000-0000000000b4', 'MTH draft by CSC admin')$sql$,
  '42501',
  'a department admin cannot create a draft for another department'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"bce00000-0000-4000-8000-0000000000a3","role":"authenticated"}',
  false
);
set role authenticated;

select test.assert(
  (select count(*) from public.timetable_drafts) = 0,
  'a lecturer cannot read drafts'
);

select test.assert(
  (select count(*) from public.timetable_entries) = 3,
  'a lecturer reads the published entries of the live version'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"bce00000-0000-4000-8000-0000000000a4","role":"authenticated"}',
  false
);
set role authenticated;

select test.assert(
  (select count(*) from public.timetable_versions) = 0,
  'the neighbouring tenant sees no versions'
);

select test.assert(
  (select count(*) from public.timetable_entries) = 0,
  'the neighbouring tenant sees no entries'
);

reset role;
set role anon;

select test.expect_error(
  $sql$select count(*) from public.timetable_versions$sql$,
  '42501',
  'anonymous callers cannot read timetables'
);

reset role;

-- ---------------------------------------------------------------------------
-- Activity trail
-- ---------------------------------------------------------------------------
select test.assert(
  exists (
    select 1 from public.institution_activity
    where institution_id = 'bce00000-0000-4000-8000-000000000001'
      and action = 'timetable.version.published'
  ),
  'publishing is recorded in the institution activity trail'
);

select test.assert(
  exists (
    select 1 from public.institution_activity
    where institution_id = 'bce00000-0000-4000-8000-000000000001'
      and action = 'timetable.change_request.approved'
  ),
  'approving a change request is recorded'
);

\echo 'timetable tests passed'
