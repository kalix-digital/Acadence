-- Acadence · Phase 4b · People, groups, offerings and calendar tests
--
-- Runs on the disposable cluster created by scripts/db-test.sh, after the
-- harness and every migration. Assertions run as `authenticated` with a JWT
-- subject, so RLS and the definer scope helpers decide every outcome.
--
-- Institutions: Theta (active) with two faculties and three departments, and
-- Iota (active) as the neighbouring tenant.

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Seed (as the cluster owner, before switching to authenticated)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-0000-0000-000000000001', 'admin.t@theta.test',      '{"full_name":"Tola Theta"}'),
  ('dddddddd-0000-0000-0000-000000000002', 'faculty.t@theta.test',    '{"full_name":"Fola Faculty"}'),
  ('dddddddd-0000-0000-0000-000000000003', 'department.t@theta.test', '{"full_name":"Dayo Department"}'),
  ('dddddddd-0000-0000-0000-000000000004', 'lecturer.t@theta.test',   '{"full_name":"Lara Lecturer"}'),
  ('dddddddd-0000-0000-0000-000000000005', 'admin.i@iota.test',       '{"full_name":"Ife Iota"}'),
  ('dddddddd-0000-0000-0000-000000000006', 'platform4b@acadence.test','{"full_name":"Pascal Platform"}');

insert into public.institutions (id, name, slug, status) values
  ('88888888-8888-8888-8888-888888888888', 'Theta University', 'theta-university', 'active'),
  ('99999999-9999-9999-9999-999999999999', 'Iota College',     'iota-college',     'active');

insert into public.faculties (id, institution_id, name, code) values
  ('f1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'Faculty of Science', 'SCI'),
  ('f1000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888', 'Faculty of Arts', 'ART'),
  ('f2000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 'Iota Faculty', 'IOT');

insert into public.departments (id, institution_id, faculty_id, name, code) values
  ('d1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
   'f1000000-0000-0000-0000-000000000001', 'Computer Science', 'CSC'),
  ('d1000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
   'f1000000-0000-0000-0000-000000000001', 'Mathematics', 'MTH'),
  ('d1000000-0000-0000-0000-000000000003', '88888888-8888-8888-8888-888888888888',
   'f1000000-0000-0000-0000-000000000002', 'History', 'HIS'),
  ('d2000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999',
   'f2000000-0000-0000-0000-000000000001', 'Iota Computing', 'IOT-CSC');

insert into public.academic_sessions (id, institution_id, name, starts_on, ends_on) values
  ('e1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
   '2026/2027', '2026-09-01', '2027-07-31'),
  ('e1000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
   '2027/2028', '2027-09-01', '2028-07-31');

insert into public.semesters (
  id, institution_id, session_id, name, sequence,
  teaching_starts_on, teaching_ends_on, exam_starts_on, exam_ends_on
) values
  ('ee000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
   'e1000000-0000-0000-0000-000000000001', 'First Semester', 1,
   '2026-09-14', '2026-12-18', '2027-01-11', '2027-01-29'),
  ('ee000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
   'e1000000-0000-0000-0000-000000000002', 'First Semester', 1,
   '2027-09-13', '2027-12-17', '2028-01-10', '2028-01-28');

insert into public.programmes (id, institution_id, department_id, code, name) values
  ('a1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
   'd1000000-0000-0000-0000-000000000001', 'BSC-CS', 'BSc Computer Science'),
  ('a1000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
   'd1000000-0000-0000-0000-000000000002', 'BSC-MTH', 'BSc Mathematics'),
  ('a1000000-0000-0000-0000-000000000003', '88888888-8888-8888-8888-888888888888',
   'd1000000-0000-0000-0000-000000000003', 'BA-HIS', 'BA History'),
  ('a2000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999',
   'd2000000-0000-0000-0000-000000000001', 'IOT-CS', 'Iota Computer Science');

insert into public.courses (id, institution_id, department_id, code, title) values
  ('b1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
   'd1000000-0000-0000-0000-000000000001', 'CSC101', 'Introduction to Computing'),
  ('b1000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
   'd1000000-0000-0000-0000-000000000002', 'MTH101', 'Elementary Mathematics'),
  ('b2000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999',
   'd2000000-0000-0000-0000-000000000001', 'IOT101', 'Iota Computing');

-- Iota already has a student, so the cross-tenant membership test below fails
-- on the tenant composite key rather than on an unknown id.
insert into public.students (id, institution_id, matric_number, first_name, last_name, programme_id, level)
values ('c2000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999',
        'IO/2026/001', 'Iota', 'Student', 'a2000000-0000-0000-0000-000000000001', 100);

insert into public.institution_memberships (institution_id, user_id, role, status, faculty_id, department_id, accepted_at) values
  ('88888888-8888-8888-8888-888888888888', 'dddddddd-0000-0000-0000-000000000001',
   'institution_admin', 'active', null, null, now()),
  ('88888888-8888-8888-8888-888888888888', 'dddddddd-0000-0000-0000-000000000002',
   'faculty_admin', 'active', 'f1000000-0000-0000-0000-000000000001', null, now()),
  ('88888888-8888-8888-8888-888888888888', 'dddddddd-0000-0000-0000-000000000003',
   'department_admin', 'active', null, 'd1000000-0000-0000-0000-000000000001', now()),
  ('88888888-8888-8888-8888-888888888888', 'dddddddd-0000-0000-0000-000000000004',
   'lecturer', 'active', null, null, now()),
  ('99999999-9999-9999-9999-999999999999', 'dddddddd-0000-0000-0000-000000000005',
   'institution_admin', 'active', null, null, now()),
  (null, 'dddddddd-0000-0000-0000-000000000006', 'platform_admin', 'active', null, null, now());

-- ---------------------------------------------------------------------------
-- Institution administrator: roster records before accounts exist
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'institution admin: creates a student with no account and a lecturer'
insert into public.students (
  id, institution_id, matric_number, first_name, last_name, email, phone,
  programme_id, level, entry_session_id
) values (
  'c1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
  'TH/2026/001', 'Ada', 'Okafor', 'Ada@Theta.test', '+2348000000001',
  'a1000000-0000-0000-0000-000000000001', 100, 'e1000000-0000-0000-0000-000000000001'
);

select test.assert(
  (select count(*) from public.students
    where institution_id = '88888888-8888-8888-8888-888888888888') = 1,
  'institution admin created a student record'
);
select test.assert(
  (select user_id from public.students
    where id = 'c1000000-0000-0000-0000-000000000001') is null,
  'a student record exists before any account is linked'
);

insert into public.lecturers (
  id, institution_id, staff_number, title, first_name, last_name, email, department_id
) values (
  '1e000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
  'TH/STAFF/001', 'Dr', 'Lara', 'Lecturer', 'lara@theta.test',
  'd1000000-0000-0000-0000-000000000001'
);

select test.assert(
  (select count(*) from public.lecturers
    where institution_id = '88888888-8888-8888-8888-888888888888') = 1,
  'institution admin created a lecturer record'
);

\echo 'identifiers: matric numbers and emails are unique across the institution'
select test.expect_error(
  $sql$insert into public.students (institution_id, matric_number, first_name, last_name, programme_id, level)
       values ('88888888-8888-8888-8888-888888888888', 'TH/2026/001', 'Bea', 'Adeyemi',
               'a1000000-0000-0000-0000-000000000001', 100)$sql$,
  '23505',
  'a duplicate matric number is rejected'
);

select test.expect_error(
  $sql$insert into public.students (institution_id, matric_number, first_name, last_name, email, programme_id, level)
       values ('88888888-8888-8888-8888-888888888888', 'TH/2026/002', 'Bea', 'Adeyemi',
               'ADA@THETA.TEST', 'a1000000-0000-0000-0000-000000000001', 100)$sql$,
  '23505',
  'a duplicate email is rejected regardless of case'
);

select test.expect_error(
  $sql$insert into public.lecturers (institution_id, staff_number, first_name, last_name, department_id)
       values ('88888888-8888-8888-8888-888888888888', 'TH/STAFF/001', 'Kunle', 'Bello',
               'd1000000-0000-0000-0000-000000000001')$sql$,
  '23505',
  'a duplicate staff number is rejected'
);

select test.expect_error(
  $sql$insert into public.students (institution_id, matric_number, first_name, last_name, programme_id, level)
       values ('88888888-8888-8888-8888-888888888888', 'bad matric!', 'Bea', 'Adeyemi',
               'a1000000-0000-0000-0000-000000000001', 100)$sql$,
  '23514',
  'a malformed matric number is rejected'
);

\echo 'accounts: one account links to at most one student per institution'
update public.students
  set user_id = 'dddddddd-0000-0000-0000-000000000004'
  where id = 'c1000000-0000-0000-0000-000000000001';

select test.expect_error(
  $sql$insert into public.students (institution_id, user_id, matric_number, first_name, last_name, programme_id, level)
       values ('88888888-8888-8888-8888-888888888888',
               'dddddddd-0000-0000-0000-000000000004',
               'TH/2026/003', 'Bea', 'Adeyemi',
               'a1000000-0000-0000-0000-000000000001', 100)$sql$,
  '23505',
  'an account cannot be linked to two student records in one institution'
);

\echo 'tenant boundary: a student cannot point at another institution''s programme'
select test.expect_error(
  $sql$insert into public.students (institution_id, matric_number, first_name, last_name, programme_id, level)
       values ('88888888-8888-8888-8888-888888888888', 'TH/2026/004', 'Cross', 'Tenant',
               'a2000000-0000-0000-0000-000000000001', 100)$sql$,
  '23503',
  'a foreign programme is refused by the composite foreign key'
);

-- ---------------------------------------------------------------------------
-- Department and faculty scope
-- ---------------------------------------------------------------------------
\echo 'department admin: writes inside their department only'
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000003","role":"authenticated"}', false);

insert into public.students (id, institution_id, matric_number, first_name, last_name, programme_id, level)
values ('c1000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
        'TH/2026/005', 'Chidi', 'Eze', 'a1000000-0000-0000-0000-000000000001', 100);

select test.expect_error(
  $sql$insert into public.students (institution_id, matric_number, first_name, last_name, programme_id, level)
       values ('88888888-8888-8888-8888-888888888888', 'TH/2026/006', 'Wrong', 'Department',
               'a1000000-0000-0000-0000-000000000002', 100)$sql$,
  '42501',
  'a department admin cannot add a student to another department''s programme'
);

\echo 'faculty admin: writes anywhere in their faculty, nowhere else'
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000002","role":"authenticated"}', false);

insert into public.students (id, institution_id, matric_number, first_name, last_name, programme_id, level)
values ('c1000000-0000-0000-0000-000000000003', '88888888-8888-8888-8888-888888888888',
        'TH/2026/007', 'Femi', 'Ade', 'a1000000-0000-0000-0000-000000000002', 200);

select test.expect_error(
  $sql$insert into public.students (institution_id, matric_number, first_name, last_name, programme_id, level)
       values ('88888888-8888-8888-8888-888888888888', 'TH/2026/008', 'Outside', 'Faculty',
               'a1000000-0000-0000-0000-000000000003', 100)$sql$,
  '42501',
  'a faculty admin cannot write in another faculty'
);

\echo 'lecturer: reads the roster but cannot change it'
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', false);

select test.assert(
  (select count(*) from public.students) >= 3,
  'a lecturer can read the institution roster'
);
select test.expect_error(
  $sql$insert into public.lecturers (institution_id, staff_number, first_name, last_name, department_id)
       values ('88888888-8888-8888-8888-888888888888', 'TH/STAFF/999', 'Nope', 'Nope',
               'd1000000-0000-0000-0000-000000000001')$sql$,
  '42501',
  'a lecturer cannot add a lecturer'
);

-- ---------------------------------------------------------------------------
-- Student groups and many-to-many membership
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'groups: a cohort group plus a second group for the same cohort'
insert into public.student_groups (id, institution_id, programme_id, session_id, level, name, code, expected_size) values
  ('91000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
   'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
   100, 'BSc CS 100 — Group A', 'CS-100-A', 40),
  ('91000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
   'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
   100, 'BSc CS 100 — Lab Group 1', 'CS-100-LAB1', 20);

insert into public.student_group_members (institution_id, group_id, student_id) values
  ('88888888-8888-8888-8888-888888888888', '91000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001'),
  ('88888888-8888-8888-8888-888888888888', '91000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000001');

select test.assert(
  (select count(*) from public.student_group_members
    where student_id = 'c1000000-0000-0000-0000-000000000001') = 2,
  'one student can belong to several groups at once'
);

select test.expect_error(
  $sql$insert into public.student_group_members (institution_id, group_id, student_id)
       values ('88888888-8888-8888-8888-888888888888', '91000000-0000-0000-0000-000000000001',
               'c1000000-0000-0000-0000-000000000001')$sql$,
  '23505',
  'a duplicate live membership is rejected'
);

select test.expect_error(
  $sql$insert into public.student_groups (institution_id, programme_id, session_id, level, name, code)
       values ('88888888-8888-8888-8888-888888888888',
               'a2000000-0000-0000-0000-000000000001',
               'e1000000-0000-0000-0000-000000000001', 100, 'Cross tenant group', 'CS-X')$sql$,
  '23503',
  'a group cannot belong to another institution''s programme'
);

select test.expect_error(
  $sql$insert into public.student_group_members (institution_id, group_id, student_id)
       values ('88888888-8888-8888-8888-888888888888', '91000000-0000-0000-0000-000000000001',
               'c2000000-0000-0000-0000-000000000001')$sql$,
  '23503',
  'a membership cannot point at a student from another institution'
);

\echo 'groups: department scope applies to the group''s programme'
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000003","role":"authenticated"}', false);

insert into public.student_groups (id, institution_id, programme_id, session_id, level, name, code)
values ('91000000-0000-0000-0000-000000000003', '88888888-8888-8888-8888-888888888888',
        'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
        200, 'BSc CS 200 — Group A', 'CS-200-A');

select test.expect_error(
  $sql$insert into public.student_groups (institution_id, programme_id, session_id, level, name, code)
       values ('88888888-8888-8888-8888-888888888888',
               'a1000000-0000-0000-0000-000000000002',
               'e1000000-0000-0000-0000-000000000001', 100, 'Maths group', 'MTH-100-A')$sql$,
  '42501',
  'a department admin cannot create a group for another department'
);

-- ---------------------------------------------------------------------------
-- Course offerings
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'offerings: course + session + semester, one per course per semester'
insert into public.course_offerings (
  id, institution_id, course_id, session_id, semester_id,
  coordinator_lecturer_id, expected_size, status
) values (
  '92000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
  'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
  'ee000000-0000-0000-0000-000000000001',
  '1e000000-0000-0000-0000-000000000001', 80, 'open'
);

select test.expect_error(
  $sql$insert into public.course_offerings (institution_id, course_id, session_id, semester_id)
       values ('88888888-8888-8888-8888-888888888888',
               'b1000000-0000-0000-0000-000000000001',
               'e1000000-0000-0000-0000-000000000001',
               'ee000000-0000-0000-0000-000000000001')$sql$,
  '23505',
  'a course is offered once per semester'
);

select test.expect_error(
  $sql$insert into public.course_offerings (institution_id, course_id, session_id, semester_id)
       values ('88888888-8888-8888-8888-888888888888',
               'b1000000-0000-0000-0000-000000000002',
               'e1000000-0000-0000-0000-000000000001',
               'ee000000-0000-0000-0000-000000000002')$sql$,
  '23503',
  'an offering cannot sit in a semester of a different session'
);

\echo 'offerings: lecturer assignments and linked groups'
insert into public.lecturers (id, institution_id, staff_number, first_name, last_name, department_id)
values ('1e000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
        'TH/STAFF/002', 'Bisi', 'Akin', 'd1000000-0000-0000-0000-000000000001');

insert into public.course_offering_lecturers (institution_id, offering_id, lecturer_id, role, contact_hours) values
  ('88888888-8888-8888-8888-888888888888', '92000000-0000-0000-0000-000000000001',
   '1e000000-0000-0000-0000-000000000001', 'lead', 3),
  ('88888888-8888-8888-8888-888888888888', '92000000-0000-0000-0000-000000000001',
   '1e000000-0000-0000-0000-000000000002', 'assistant', 2);

insert into public.course_offering_groups (institution_id, offering_id, group_id) values
  ('88888888-8888-8888-8888-888888888888', '92000000-0000-0000-0000-000000000001',
   '91000000-0000-0000-0000-000000000001');

select test.assert(
  (select count(*) from public.course_offering_lecturers
    where offering_id = '92000000-0000-0000-0000-000000000001') = 2,
  'an offering can have several lecturers'
);
select test.assert(
  (select count(*) from public.course_offering_groups
    where offering_id = '92000000-0000-0000-0000-000000000001') = 1,
  'an offering can be linked to a student group'
);

select test.expect_error(
  $sql$insert into public.course_offering_lecturers (institution_id, offering_id, lecturer_id, role)
       values ('88888888-8888-8888-8888-888888888888', '92000000-0000-0000-0000-000000000001',
               '1e000000-0000-0000-0000-000000000001', 'assistant')$sql$,
  '23505',
  'a lecturer is assigned to an offering once'
);

select test.expect_error(
  $sql$insert into public.course_offering_lecturers (institution_id, offering_id, lecturer_id, role)
       values ('88888888-8888-8888-8888-888888888888', '92000000-0000-0000-0000-000000000001',
               '1e000000-0000-0000-0000-000000000099', 'lead')$sql$,
  '23503',
  'an unknown lecturer is refused'
);

\echo 'offerings: department scope follows the course'
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000003","role":"authenticated"}', false);

insert into public.course_offerings (id, institution_id, course_id, session_id, semester_id)
values ('92000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
        'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002',
        'ee000000-0000-0000-0000-000000000002');

select test.expect_error(
  $sql$insert into public.course_offerings (institution_id, course_id, session_id, semester_id)
       values ('88888888-8888-8888-8888-888888888888',
               'b1000000-0000-0000-0000-000000000002',
               'e1000000-0000-0000-0000-000000000001',
               'ee000000-0000-0000-0000-000000000001')$sql$,
  '42501',
  'a department admin cannot offer another department''s course'
);

-- ---------------------------------------------------------------------------
-- Academic calendar
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'calendar: events belong to a session and may narrow to a semester'
insert into public.calendar_events (
  id, institution_id, session_id, semester_id, title, kind, starts_on, ends_on, description
) values
  ('93000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
   'e1000000-0000-0000-0000-000000000001', 'ee000000-0000-0000-0000-000000000001',
   'Mid-semester break', 'holiday', '2026-10-26', '2026-10-30', 'One week without lectures.'),
  ('93000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
   'e1000000-0000-0000-0000-000000000001', null,
   'Matriculation', 'event', '2026-11-04', '2026-11-04', null);

select test.assert(
  (select count(*) from public.calendar_events
    where institution_id = '88888888-8888-8888-8888-888888888888') = 2,
  'institution admin created session-wide and semester events'
);

select test.expect_error(
  $sql$insert into public.calendar_events (institution_id, session_id, semester_id, title, kind, starts_on, ends_on)
       values ('88888888-8888-8888-8888-888888888888', 'e1000000-0000-0000-0000-000000000001',
               'ee000000-0000-0000-0000-000000000002', 'Wrong semester', 'event',
               '2026-11-01', '2026-11-02')$sql$,
  '23503',
  'an event cannot point at a semester of another session'
);

select test.expect_error(
  $sql$insert into public.calendar_events (institution_id, session_id, title, kind, starts_on, ends_on)
       values ('88888888-8888-8888-8888-888888888888', 'e1000000-0000-0000-0000-000000000001',
               'Backwards break', 'holiday', '2026-12-01', '2026-11-01')$sql$,
  '23514',
  'an event cannot end before it starts'
);

select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', false);
select test.expect_error(
  $sql$insert into public.calendar_events (institution_id, session_id, title, kind, starts_on, ends_on)
       values ('88888888-8888-8888-8888-888888888888', 'e1000000-0000-0000-0000-000000000001',
               'Lecturer event', 'event', '2026-11-10', '2026-11-10')$sql$,
  '42501',
  'a lecturer cannot add a calendar event'
);

-- ---------------------------------------------------------------------------
-- Archive, activity trail and privileges
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'archive: records are archived, never deleted'
update public.students
  set archived_at = now()
  where id = 'c1000000-0000-0000-0000-000000000002';

select test.assert(
  (select archived_at is not null from public.students
    where id = 'c1000000-0000-0000-0000-000000000002'),
  'the student is archived'
);

update public.students
  set archived_at = null
  where id = 'c1000000-0000-0000-0000-000000000002';

select test.assert(
  (select archived_at is null from public.students
    where id = 'c1000000-0000-0000-0000-000000000002'),
  'the student is restored'
);

select test.assert(
  exists (
    select 1 from public.institution_activity
    where action = 'academic.student.created'
      and institution_id = '88888888-8888-8888-8888-888888888888'
  ),
  'student creation is written to the activity trail'
);
select test.assert(
  exists (
    select 1 from public.institution_activity
    where action = 'academic.student.archived'
      and institution_id = '88888888-8888-8888-8888-888888888888'
  ),
  'archiving is written to the activity trail'
);
select test.assert(
  exists (
    select 1 from public.institution_activity
    where action = 'academic.offering.created'
      and institution_id = '88888888-8888-8888-8888-888888888888'
  ),
  'offering creation is written to the activity trail'
);

select test.expect_error(
  $sql$delete from public.students where id = 'c1000000-0000-0000-0000-000000000001'$sql$,
  '42501',
  'authenticated holds no DELETE privilege on students'
);

select test.expect_error(
  $sql$delete from public.calendar_events where id = '93000000-0000-0000-0000-000000000001'$sql$,
  '42501',
  'authenticated holds no DELETE privilege on calendar events'
);

-- ---------------------------------------------------------------------------
-- Tenant isolation
-- ---------------------------------------------------------------------------
\echo 'isolation: the neighbouring institution sees none of this'
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000005","role":"authenticated"}', false);

select test.assert(
  (select count(*) from public.students
    where institution_id = '88888888-8888-8888-8888-888888888888') = 0,
  'Iota cannot read Theta students'
);
select test.assert(
  (select count(*) from public.lecturers
    where institution_id = '88888888-8888-8888-8888-888888888888') = 0,
  'Iota cannot read Theta lecturers'
);
select test.assert(
  (select count(*) from public.course_offerings
    where institution_id = '88888888-8888-8888-8888-888888888888') = 0,
  'Iota cannot read Theta offerings'
);
select test.assert(
  (select count(*) from public.calendar_events
    where institution_id = '88888888-8888-8888-8888-888888888888') = 0,
  'Iota cannot read Theta calendar events'
);
select test.assert(
  (select count(*) from public.students) = 1,
  'Iota still reads its own student'
);
-- RLS filters the row instead of raising, so the assertion is on the row count.
with changed as (
  update public.students set level = 200
  where id = 'c1000000-0000-0000-0000-000000000001'
  returning id
)
select test.assert(
  (select count(*) from changed) = 0,
  'Iota cannot write a Theta student'
);

-- ---------------------------------------------------------------------------
-- Anonymous access
-- ---------------------------------------------------------------------------
\echo 'anon: no access to any Phase 4b table'
reset role;
set role anon;
select test.expect_error(
  'select count(*) from public.students',
  '42501',
  'anon cannot read students'
);
select test.expect_error(
  'select count(*) from public.course_offerings',
  '42501',
  'anon cannot read course offerings'
);
reset role;
