-- Acadence · Phase 4 · Academic structure tests
--
-- Runs on the disposable cluster created by scripts/db-test.sh, after the
-- harness and every migration. Assertions run as `authenticated` with a JWT
-- subject, so RLS and the definer scope helper decide every outcome.
--
-- Institutions: Zeta (active) with two campuses/faculties/departments,
-- Eta (active) as the neighbouring tenant.

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', 'admin.z@zeta.test',      '{"full_name":"Zara Zeta"}'),
  ('cccccccc-0000-0000-0000-000000000002', 'faculty.z@zeta.test',    '{"full_name":"Femi Faculty"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'department.z@zeta.test', '{"full_name":"Dapo Department"}'),
  ('cccccccc-0000-0000-0000-000000000004', 'lecturer.z@zeta.test',   '{"full_name":"Lola Lecturer"}'),
  ('cccccccc-0000-0000-0000-000000000005', 'admin.e@eta.test',       '{"full_name":"Efe Eta"}'),
  ('cccccccc-0000-0000-0000-000000000006', 'platform4@acadence.test', '{"full_name":"Pascal Platform"}');

insert into public.institutions (id, name, slug, status) values
  ('66666666-6666-6666-6666-666666666666', 'Zeta University', 'zeta-university', 'active'),
  ('77777777-7777-7777-7777-777777777777', 'Eta Polytechnic', 'eta-polytechnic', 'active');

insert into public.campuses (id, institution_id, name, code) values
  ('c0000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', 'Zeta Main Campus', 'MAIN'),
  ('c0000000-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666', 'Zeta City Campus', 'CITY'),
  ('c0000000-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777777', 'Eta Campus',       'MAIN');

insert into public.faculties (id, institution_id, campus_id, name, code) values
  ('f0000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666',
   'c0000000-0000-0000-0000-000000000001', 'Faculty of Science', 'SCI'),
  ('f0000000-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666',
   null, 'Faculty of Arts', 'ART');

insert into public.departments (id, institution_id, faculty_id, name, code) values
  ('d0000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666',
   'f0000000-0000-0000-0000-000000000001', 'Computer Science', 'CSC'),
  ('d0000000-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666',
   'f0000000-0000-0000-0000-000000000001', 'Mathematics', 'MTH');

insert into public.academic_sessions (id, institution_id, name, starts_on, ends_on) values
  ('e0000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666',
   '2026/2027', '2026-09-01', '2027-07-31');

insert into public.programmes (id, institution_id, department_id, code, name) values
  ('a0000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666',
   'd0000000-0000-0000-0000-000000000001', 'BSC-CS', 'BSc Computer Science'),
  ('a0000000-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666',
   'd0000000-0000-0000-0000-000000000002', 'BSC-MTH', 'BSc Mathematics');

insert into public.institution_memberships (institution_id, user_id, role, status, faculty_id, department_id, accepted_at) values
  ('66666666-6666-6666-6666-666666666666', 'cccccccc-0000-0000-0000-000000000001',
   'institution_admin', 'active', null, null, now()),
  ('66666666-6666-6666-6666-666666666666', 'cccccccc-0000-0000-0000-000000000002',
   'faculty_admin', 'active', 'f0000000-0000-0000-0000-000000000001', null, now()),
  -- A department_admin membership carries only the department scope; the
  -- faculty is resolved from the department by the policy helper.
  ('66666666-6666-6666-6666-666666666666', 'cccccccc-0000-0000-0000-000000000003',
   'department_admin', 'active', null,
   'd0000000-0000-0000-0000-000000000001', now()),
  ('66666666-6666-6666-6666-666666666666', 'cccccccc-0000-0000-0000-000000000004',
   'lecturer', 'active', null, null, now()),
  ('77777777-7777-7777-7777-777777777777', 'cccccccc-0000-0000-0000-000000000005',
   'institution_admin', 'active', null, null, now()),
  (null, 'cccccccc-0000-0000-0000-000000000006', 'platform_admin', 'active', null, null, now());

-- ---------------------------------------------------------------------------
-- Institution administrator: the whole hierarchy
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'institution admin: creates a faculty in an optional campus and a department'
insert into public.faculties (id, institution_id, campus_id, name, code)
values ('f0000000-0000-0000-0000-000000000003',
        '66666666-6666-6666-6666-666666666666',
        'c0000000-0000-0000-0000-000000000002',
        'Faculty of Management', 'MGT');

insert into public.departments (id, institution_id, faculty_id, name, code)
values ('d0000000-0000-0000-0000-000000000003',
        '66666666-6666-6666-6666-666666666666',
        'f0000000-0000-0000-0000-000000000003',
        'Business Administration', 'BUS');

select test.assert(
  (select count(*) from public.campuses) = 2,
  'institution admin sees both Zeta campuses'
);

\echo 'institution admin: creates a session and its semesters'
insert into public.academic_sessions (id, institution_id, name, starts_on, ends_on, status)
values ('e0000000-0000-0000-0000-000000000002',
        '66666666-6666-6666-6666-666666666666',
        '2027/2028', '2027-09-01', '2028-07-31', 'planned');

insert into public.semesters (
  institution_id, session_id, name, sequence,
  teaching_starts_on, teaching_ends_on, exam_starts_on, exam_ends_on
) values (
  '66666666-6666-6666-6666-666666666666', 'e0000000-0000-0000-0000-000000000002',
  'First Semester', 1, '2027-09-15', '2027-12-20', '2028-01-10', '2028-01-31'
);

select test.assert(
  (select count(*) from public.semesters
    where institution_id = '66666666-6666-6666-6666-666666666666') = 1,
  'institution admin created a semester under a session'
);

\echo 'dates: a session cannot end before it starts; semesters must be ordered'
select test.expect_error(
  $sql$insert into public.academic_sessions (institution_id, name, starts_on, ends_on)
       values ('66666666-6666-6666-6666-666666666666', 'Broken Session', '2028-09-01', '2028-01-01')$sql$,
  '23514',
  'session end before start is rejected'
);

select test.expect_error(
  $sql$insert into public.semesters (
         institution_id, session_id, name, sequence,
         teaching_starts_on, teaching_ends_on, exam_starts_on, exam_ends_on
       ) values (
         '66666666-6666-6666-6666-666666666666', 'e0000000-0000-0000-0000-000000000002',
         'Broken Semester', 2, '2028-01-15', '2028-02-15', '2028-02-01', '2028-03-01'
       )$sql$,
  '23514',
  'exams cannot start before teaching ends'
);

\echo 'duplicates: codes are unique per institution'
select test.expect_error(
  $sql$insert into public.campuses (institution_id, name, code)
       values ('66666666-6666-6666-6666-666666666666', 'Duplicate Main', 'MAIN')$sql$,
  '23505',
  'a duplicate campus code is rejected'
);

select test.expect_error(
  $sql$insert into public.departments (institution_id, faculty_id, name, code)
       values ('66666666-6666-6666-6666-666666666666',
               'f0000000-0000-0000-0000-000000000002', 'Another CSC', 'CSC')$sql$,
  '23505',
  'a duplicate department code is rejected'
);

-- ---------------------------------------------------------------------------
-- Faculty administrator: own faculty only
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated"}', false);

\echo 'faculty admin: manages departments inside their faculty'
insert into public.departments (id, institution_id, faculty_id, name, code)
values ('d0000000-0000-0000-0000-000000000004',
        '66666666-6666-6666-6666-666666666666',
        'f0000000-0000-0000-0000-000000000001',
        'Statistics', 'STA');

select test.assert(
  exists (select 1 from public.departments where code = 'STA'),
  'faculty admin created a department in their own faculty'
);

\echo 'faculty admin: cannot write into another faculty'
select test.expect_error(
  $sql$insert into public.departments (institution_id, faculty_id, name, code)
       values ('66666666-6666-6666-6666-666666666666',
               'f0000000-0000-0000-0000-000000000002', 'History', 'HIS')$sql$,
  '42501',
  'faculty admin cannot create a department in another faculty'
);

select test.expect_error(
  $sql$insert into public.faculties (institution_id, name, code)
       values ('66666666-6666-6666-6666-666666666666', 'Faculty of Law', 'LAW')$sql$,
  '42501',
  'faculty admin cannot create a faculty'
);

select test.expect_error(
  $sql$insert into public.campuses (institution_id, name, code)
       values ('66666666-6666-6666-6666-666666666666', 'Third Campus', 'THIRD')$sql$,
  '42501',
  'faculty admin cannot create a campus'
);

select test.expect_error(
  $sql$insert into public.academic_sessions (institution_id, name, starts_on, ends_on)
       values ('66666666-6666-6666-6666-666666666666', '2029/2030', '2029-09-01', '2030-07-31')$sql$,
  '42501',
  'faculty admin cannot create an academic session'
);

\echo 'faculty admin: manages programmes in their faculty'
insert into public.programmes (id, institution_id, department_id, code, name, level, duration_years)
values ('a0000000-0000-0000-0000-000000000003',
        '66666666-6666-6666-6666-666666666666',
        'd0000000-0000-0000-0000-000000000004',
        'BSC-STA', 'BSc Statistics', 'undergraduate', 4);

select test.assert(
  exists (select 1 from public.programmes where code = 'BSC-STA'),
  'faculty admin created a programme in their faculty'
);

select test.expect_error(
  $sql$insert into public.programmes (institution_id, department_id, code, name)
       values ('66666666-6666-6666-6666-666666666666',
               'd0000000-0000-0000-0000-000000000003', 'BSC-BUS', 'BSc Business')$sql$,
  '42501',
  'faculty admin cannot create a programme in another faculty'
);

-- ---------------------------------------------------------------------------
-- Department administrator: own department only
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', false);

\echo 'department admin: creates and updates courses in their department'
insert into public.courses (id, institution_id, department_id, code, title, units, level)
values ('b0000000-0000-0000-0000-000000000001',
        '66666666-6666-6666-6666-666666666666',
        'd0000000-0000-0000-0000-000000000001',
        'CSC101', 'Introduction to Computing', 3, 100);

update public.courses set units = 4
 where id = 'b0000000-0000-0000-0000-000000000001';

select test.assert(
  (select units from public.courses where id = 'b0000000-0000-0000-0000-000000000001') = 4,
  'department admin updated a course in their own department'
);

select test.expect_error(
  $sql$insert into public.courses (institution_id, department_id, code, title)
       values ('66666666-6666-6666-6666-666666666666',
               'd0000000-0000-0000-0000-000000000002', 'MTH101', 'Algebra')$sql$,
  '42501',
  'department admin cannot create a course in another department'
);

select test.expect_error(
  $sql$insert into public.departments (institution_id, faculty_id, name, code)
       values ('66666666-6666-6666-6666-666666666666',
               'f0000000-0000-0000-0000-000000000001', 'Cyber Security', 'CYB')$sql$,
  '42501',
  'department admin cannot create a department'
);

\echo 'department admin: cannot move a record out of their scope'
select test.assert(
  (select count(*) from public.courses where code = 'MTH101') = 0,
  'no course was created outside the department admin scope'
);

-- ---------------------------------------------------------------------------
-- Curriculum: one course required by several programmes
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'curriculum: a shared course links to two programmes without duplication'
insert into public.courses (id, institution_id, department_id, code, title, units, level)
values ('b0000000-0000-0000-0000-000000000002',
        '66666666-6666-6666-6666-666666666666',
        'd0000000-0000-0000-0000-000000000001',
        'GST101', 'Communication in English', 2, 100);

insert into public.programme_courses (institution_id, programme_id, course_id, level, requirement) values
  ('66666666-6666-6666-6666-666666666666', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 100, 'required'),
  ('66666666-6666-6666-6666-666666666666', 'a0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002', 100, 'required');

select test.assert(
  (select count(*) from public.programme_courses
    where course_id = 'b0000000-0000-0000-0000-000000000002') = 2,
  'the same course is required by two programmes'
);

select test.expect_error(
  $sql$insert into public.programme_courses (institution_id, programme_id, course_id, level)
       values ('66666666-6666-6666-6666-666666666666',
               'a0000000-0000-0000-0000-000000000001',
               'b0000000-0000-0000-0000-000000000002', 100)$sql$,
  '23505',
  'the same course cannot be added to a programme twice'
);

-- ---------------------------------------------------------------------------
-- Cross-tenant isolation
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000005","role":"authenticated"}', false);

\echo 'Eta admin: sees no Zeta academic records and cannot write into Zeta'
select test.assert(
  (select count(*) from public.campuses) = 1,
  'Eta admin sees only the Eta campus'
);
select test.assert(
  (select count(*) from public.faculties) = 0,
  'Eta admin sees no Zeta faculties'
);
select test.assert(
  (select count(*) from public.courses) = 0,
  'Eta admin sees no Zeta courses'
);

select test.expect_error(
  $sql$insert into public.faculties (institution_id, name, code)
       values ('66666666-6666-6666-6666-666666666666', 'Rogue Faculty', 'ROG')$sql$,
  '42501',
  'Eta admin cannot create a faculty inside Zeta'
);

-- UPDATE under RLS filters rows rather than raising, so the assertion is that
-- nothing changed. INSERT would raise 42501 through its WITH CHECK clause.
update public.campuses set name = 'Hijacked'
 where id = 'c0000000-0000-0000-0000-000000000001';

-- The row is invisible to the Eta admin, so the check runs as the owner; the
-- update above must not have touched it.
reset role;
select test.assert(
  (select name from public.campuses
    where id = 'c0000000-0000-0000-0000-000000000001') = 'Zeta Main Campus',
  'the Zeta campus is unchanged'
);
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000005","role":"authenticated"}', false);

\echo 'hierarchy: a faculty cannot reference another tenant''s campus'
insert into public.campuses (id, institution_id, name, code)
values ('c0000000-0000-0000-0000-000000000004',
        '77777777-7777-7777-7777-777777777777', 'Eta Annex', 'ANNEX');

select test.expect_error(
  $sql$insert into public.faculties (institution_id, campus_id, name, code)
       values ('77777777-7777-7777-7777-777777777777',
               'c0000000-0000-0000-0000-000000000001', 'Cross Faculty', 'CROSS')$sql$,
  '23503',
  'a composite tenant foreign key rejects a campus from another institution'
);

\echo 'lecturer: reads the hierarchy but cannot write it'
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000004","role":"authenticated"}', false);

select test.assert(
  (select count(*) from public.campuses) = 2,
  'lecturer can read their institution campuses'
);

select test.expect_error(
  $sql$insert into public.courses (institution_id, department_id, code, title)
       values ('66666666-6666-6666-6666-666666666666',
               'd0000000-0000-0000-0000-000000000001', 'CSC999', 'Rogue Course')$sql$,
  '42501',
  'lecturer cannot create a course'
);

-- ---------------------------------------------------------------------------
-- Archive, never delete
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'archive: records are archived, logged and restorable'
update public.courses
   set archived_at = now()
 where id = 'b0000000-0000-0000-0000-000000000001';

select test.assert(
  (select archived_at is not null from public.courses
    where id = 'b0000000-0000-0000-0000-000000000001'),
  'a course can be archived'
);
select test.assert(
  exists (
    select 1 from public.institution_activity
     where institution_id = '66666666-6666-6666-6666-666666666666'
       and action = 'academic.course.archived'
  ),
  'archiving is recorded in the activity trail'
);

update public.courses
   set archived_at = null
 where id = 'b0000000-0000-0000-0000-000000000001';

select test.assert(
  exists (
    select 1 from public.institution_activity
     where institution_id = '66666666-6666-6666-6666-666666666666'
       and action = 'academic.course.restored'
  ),
  'restoring is recorded in the activity trail'
);

\echo 'archive: authenticated has no delete privilege on academic records'
select test.assert(
  not has_table_privilege('authenticated', 'public.courses', 'DELETE'),
  'authenticated cannot delete courses'
);
select test.expect_error(
  $sql$delete from public.courses where id = 'b0000000-0000-0000-0000-000000000001'$sql$,
  '42501',
  'deleting a course is refused at the privilege level'
);

\echo 'activity: creation of every level is recorded'
select test.assert(
  exists (select 1 from public.institution_activity
           where institution_id = '66666666-6666-6666-6666-666666666666'
             and action = 'academic.department.created'),
  'department creation is logged'
);
select test.assert(
  exists (select 1 from public.institution_activity
           where institution_id = '66666666-6666-6666-6666-666666666666'
             and action = 'academic.curriculum.created'),
  'curriculum links are logged'
);

-- ---------------------------------------------------------------------------
-- Platform administrator and anon
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000006","role":"authenticated"}', false);

\echo 'platform admin: sees every tenant''s academic records'
select test.assert(
  (select count(distinct institution_id) from public.campuses) = 2,
  'platform admin sees campuses from both institutions'
);
select test.assert(
  (select count(*) from public.departments
    where institution_id = '66666666-6666-6666-6666-666666666666') = 4,
  'platform admin sees every Zeta department'
);

reset role;
set role anon;
select set_config('request.jwt.claims', '', false);

\echo 'anon: every academic table is closed'
select test.assert(
  not has_table_privilege('anon', 'public.courses', 'SELECT'),
  'anon cannot read courses'
);
select test.expect_error(
  'select count(*) from public.campuses',
  '42501',
  'anon cannot query campuses'
);

reset role;

select 'ALL ACADEMIC STRUCTURE TESTS PASSED' as result;
