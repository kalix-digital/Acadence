-- Acadence · Phase 5 · Facilities tests
--
-- Runs on the disposable cluster created by scripts/db-test.sh, after the
-- harness and every migration. Assertions run as `authenticated` with a JWT
-- subject, so RLS and the definer scope helpers decide every outcome.
--
-- Institutions: Phi (active, one campus, two departments) and Psi (active) as
-- the neighbouring tenant. Booking times are institution wall-clock timestamps,
-- and every booking below falls in the 2027/2028 semester so the "upcoming
-- booking" guards see a future date.

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Seed (as the cluster owner, before switching to authenticated)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-0000-0000-0000-000000000001', 'admin.p@phi.test',      '{"full_name":"Pia Phi"}'),
  ('ffffffff-0000-0000-0000-000000000002', 'department.p@phi.test', '{"full_name":"Dami Phi"}'),
  ('ffffffff-0000-0000-0000-000000000003', 'lecturer.p@phi.test',   '{"full_name":"Leke Phi"}'),
  ('ffffffff-0000-0000-0000-000000000004', 'admin.q@psi.test',      '{"full_name":"Qade Psi"}');

insert into public.institutions (id, name, slug, status) values
  ('ace00000-0000-4000-8000-000000000001', 'Phi Polytechnic', 'phi-polytechnic', 'active'),
  ('ace00000-0000-4000-8000-000000000002', 'Psi Institute',   'psi-institute',   'active');

insert into public.campuses (id, institution_id, name, code) values
  ('70000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001', 'Main campus', 'MAIN'),
  ('60000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000002', 'Psi campus',  'PSI');

insert into public.faculties (id, institution_id, name, code) values
  ('77000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
   'Faculty of Engineering', 'ENG');

insert into public.departments (id, institution_id, faculty_id, name, code) values
  ('76000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
   '77000000-0000-0000-0000-000000000001', 'Computer Engineering', 'CPE'),
  ('76000000-0000-0000-0000-000000000002', 'ace00000-0000-4000-8000-000000000001',
   '77000000-0000-0000-0000-000000000001', 'Electrical Engineering', 'EEE');

insert into public.academic_sessions (id, institution_id, name, starts_on, ends_on) values
  ('75000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
   '2027/2028', '2027-09-01', '2028-07-31');

insert into public.semesters (
  id, institution_id, session_id, name, sequence,
  teaching_starts_on, teaching_ends_on, exam_starts_on, exam_ends_on
) values (
  '74000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
  '75000000-0000-0000-0000-000000000001', 'First Semester', 1,
  '2027-09-13', '2027-12-17', '2028-01-10', '2028-01-28'
);

insert into public.buildings (id, institution_id, campus_id, name, code) values
  ('71000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
   '70000000-0000-0000-0000-000000000001', 'Engineering Block', 'EB'),
  ('61000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000002',
   '60000000-0000-0000-0000-000000000001', 'Psi Block', 'PB');

insert into public.rooms (
  id, institution_id, building_id, name, code, room_type, capacity
) values
  ('72000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
   '71000000-0000-0000-0000-000000000001', 'Hall A', 'HALL-A', 'lecture_hall', 40),
  ('72000000-0000-0000-0000-000000000002', 'ace00000-0000-4000-8000-000000000001',
   '71000000-0000-0000-0000-000000000001', 'Lab 1', 'LAB-1', 'laboratory', 20),
  ('72000000-0000-0000-0000-000000000003', 'ace00000-0000-4000-8000-000000000001',
   '71000000-0000-0000-0000-000000000001', 'Seminar 3', 'SEM-3', 'seminar', 15),
  ('62000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000002',
   '61000000-0000-0000-0000-000000000001', 'Psi Room', 'PSI-1', 'classroom', 30);

insert into public.room_features (id, institution_id, name, category) values
  ('73000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001', 'Projector', 'equipment'),
  ('73000000-0000-0000-0000-000000000002', 'ace00000-0000-4000-8000-000000000001', 'Lab benches', 'layout');

insert into public.room_feature_links (id, institution_id, room_id, feature_id, quantity) values
  ('8c000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
   '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 1);

insert into public.room_availability (
  id, institution_id, room_id, semester_id, day_of_week, opens_at, closes_at
) values
  ('8d000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
   '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 1, '08:00', '18:00'),
  ('8d000000-0000-0000-0000-000000000003', 'ace00000-0000-4000-8000-000000000001',
   '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 2, '08:00', '12:00'),
  ('8d000000-0000-0000-0000-000000000004', 'ace00000-0000-4000-8000-000000000001',
   '72000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000001', 1, '08:00', '18:00');

insert into public.institution_memberships (
  institution_id, user_id, role, status, faculty_id, department_id, accepted_at
) values
  ('ace00000-0000-4000-8000-000000000001', 'ffffffff-0000-0000-0000-000000000001',
   'institution_admin', 'active', null, null, now()),
  ('ace00000-0000-4000-8000-000000000001', 'ffffffff-0000-0000-0000-000000000002',
   'department_admin', 'active', null, '76000000-0000-0000-0000-000000000001', now()),
  ('ace00000-0000-4000-8000-000000000001', 'ffffffff-0000-0000-0000-000000000003',
   'lecturer', 'active', null, null, now()),
  ('ace00000-0000-4000-8000-000000000002', 'ffffffff-0000-0000-0000-000000000004',
   'institution_admin', 'active', null, null, now());

-- ---------------------------------------------------------------------------
-- Institution administrator: buildings, rooms, features and availability
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'institution admin: creates a building and a room'
insert into public.buildings (id, institution_id, campus_id, name, code, address)
values ('71000000-0000-0000-0000-000000000002', 'ace00000-0000-4000-8000-000000000001',
        '70000000-0000-0000-0000-000000000001', 'Science Block', 'SB', '12 Campus Road');

insert into public.rooms (id, institution_id, building_id, name, code, room_type, capacity, floor)
values ('72000000-0000-0000-0000-000000000004', 'ace00000-0000-4000-8000-000000000001',
        '71000000-0000-0000-0000-000000000002', 'Studio 1', 'STU-1', 'studio', 25, 'Ground');

select test.assert(
  (select count(*) from public.buildings
    where institution_id = 'ace00000-0000-4000-8000-000000000001') = 2,
  'institution admin created a building'
);
select test.assert(
  (select room_type::text from public.rooms
    where id = '72000000-0000-0000-0000-000000000004') = 'studio',
  'a room keeps its room type'
);

\echo 'rooms: codes are unique per institution and capacity must be positive'
select test.expect_error(
  $sql$insert into public.rooms (institution_id, building_id, name, code, capacity)
       values ('ace00000-0000-4000-8000-000000000001',
               '71000000-0000-0000-0000-000000000001', 'Hall B', 'HALL-A', 30)$sql$,
  '23505',
  'a duplicate room code is rejected'
);

select test.expect_error(
  $sql$insert into public.rooms (institution_id, building_id, name, code, capacity)
       values ('ace00000-0000-4000-8000-000000000001',
               '71000000-0000-0000-0000-000000000001', 'Empty room', 'EMPTY', 0)$sql$,
  '23514',
  'a room with no seats is rejected'
);

\echo 'availability: windows of one room may not overlap on the same day'
select test.expect_error(
  $sql$insert into public.room_availability (institution_id, room_id, semester_id, day_of_week, opens_at, closes_at)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
               1, '12:00', '20:00')$sql$,
  'P0001',
  'an overlapping availability window is rejected'
);

insert into public.room_availability (institution_id, room_id, semester_id, day_of_week, opens_at, closes_at)
values ('ace00000-0000-4000-8000-000000000001',
        '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
        1, '18:00', '20:00');

select test.assert(
  (select count(*) from public.room_availability
    where room_id = '72000000-0000-0000-0000-000000000001'
      and semester_id = '74000000-0000-0000-0000-000000000001'
      and day_of_week = 1) = 2,
  'a non-overlapping window is accepted'
);

\echo 'features: the catalogue is institution-scoped and links are unique'
select test.expect_error(
  $sql$insert into public.room_features (institution_id, name)
       values ('ace00000-0000-4000-8000-000000000001', 'projector')$sql$,
  '23505',
  'a duplicate feature name is rejected ignoring case'
);

select test.expect_error(
  $sql$insert into public.room_feature_links (institution_id, room_id, feature_id)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001')$sql$,
  '23505',
  'a feature cannot be linked to the same room twice'
);

-- ---------------------------------------------------------------------------
-- Bookings: capacity, availability and overlap
-- ---------------------------------------------------------------------------
\echo 'bookings: a valid booking inside an availability window is confirmed'
insert into public.room_bookings (
  id, institution_id, room_id, semester_id, department_id, title,
  starts_at, ends_at, expected_attendees, booked_by
) values (
  '8b000000-0000-0000-0000-000000000001', 'ace00000-0000-4000-8000-000000000001',
  '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
  '76000000-0000-0000-0000-000000000001', 'CPE 301 lecture',
  '2027-09-13 09:00:00', '2027-09-13 11:00:00', 30,
  'ffffffff-0000-0000-0000-000000000001'
);

select test.assert(
  (select status::text from public.room_bookings
    where id = '8b000000-0000-0000-0000-000000000001') = 'confirmed',
  'a booking is confirmed immediately (auto-approval, OQ-014)'
);

\echo 'bookings: two confirmed bookings cannot overlap in one room'
select test.expect_error(
  $sql$insert into public.room_bookings (institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
               'Overlapping lecture', '2027-09-13 10:00:00', '2027-09-13 12:00:00', 30)$sql$,
  '23P01',
  'an overlapping booking is rejected by the exclusion constraint'
);

insert into public.room_bookings (
  id, institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees
) values (
  '8b000000-0000-0000-0000-000000000003', 'ace00000-0000-4000-8000-000000000001',
  '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
  'Back-to-back lecture', '2027-09-13 11:00:00', '2027-09-13 12:00:00', 30
);

select test.assert(
  (select count(*) from public.room_bookings
    where room_id = '72000000-0000-0000-0000-000000000001'
      and starts_at = '2027-09-13 11:00:00') = 1,
  'a booking that starts when another ends is accepted'
);

\echo 'bookings: capacity is a hard rule'
select test.expect_error(
  $sql$insert into public.room_bookings (institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000001',
               'Overfull lab', '2027-09-13 09:00:00', '2027-09-13 10:00:00', 25)$sql$,
  'P0001',
  'a booking above room capacity is rejected'
);

\echo 'bookings: the room must be available at that time'
select test.expect_error(
  $sql$insert into public.room_bookings (institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000001',
               'Wednesday lab', '2027-09-15 09:00:00', '2027-09-15 10:00:00', 10)$sql$,
  'P0001',
  'a booking on a day with no availability window is rejected'
);

select test.expect_error(
  $sql$insert into public.room_bookings (institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
               'Evening lecture', '2027-09-13 19:00:00', '2027-09-13 21:00:00', 10)$sql$,
  'P0001',
  'a booking outside the availability window is rejected'
);

\echo 'bookings: the booking must fall inside the semester and one day'
select test.expect_error(
  $sql$insert into public.room_bookings (institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
               'Long after exams', '2028-03-01 09:00:00', '2028-03-01 10:00:00', 10)$sql$,
  'P0001',
  'a booking outside the semester is rejected'
);

select test.expect_error(
  $sql$insert into public.room_bookings (institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
               'Overnight lecture', '2027-09-13 23:00:00', '2027-09-14 01:00:00', 10)$sql$,
  'P0001',
  'a booking that crosses midnight is rejected'
);

\echo 'bookings: cancelling frees the slot'
update public.room_bookings
   set status = 'cancelled', cancelled_at = now(), cancelled_by = 'ffffffff-0000-0000-0000-000000000001'
 where id = '8b000000-0000-0000-0000-000000000001';

insert into public.room_bookings (
  id, institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees
) values (
  '8b000000-0000-0000-0000-000000000007', 'ace00000-0000-4000-8000-000000000001',
  '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
  'Rescheduled lecture', '2027-09-13 09:00:00', '2027-09-13 11:00:00', 30
);

select test.assert(
  (select count(*) from public.room_bookings
    where room_id = '72000000-0000-0000-0000-000000000001'
      and status = 'confirmed'
      and starts_at = '2027-09-13 09:00:00') = 1,
  'a cancelled booking no longer blocks its slot'
);

-- ---------------------------------------------------------------------------
-- Department administrators: book for their own department only
-- ---------------------------------------------------------------------------
\echo 'department admin: books a room for their own department'
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000002","role":"authenticated"}', false);

insert into public.room_bookings (
  id, institution_id, room_id, semester_id, department_id, title, starts_at, ends_at, expected_attendees
) values (
  '8b000000-0000-0000-0000-000000000004', 'ace00000-0000-4000-8000-000000000001',
  '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
  '76000000-0000-0000-0000-000000000001', 'CPE tutorial',
  '2027-09-13 13:00:00', '2027-09-13 14:00:00', 20
);

select test.assert(
  (select department_id from public.room_bookings
    where id = '8b000000-0000-0000-0000-000000000004') = '76000000-0000-0000-0000-000000000001',
  'a department admin books for their own department'
);

\echo 'department admin: cannot book for another department or manage rooms'
select test.expect_error(
  $sql$insert into public.room_bookings (institution_id, room_id, semester_id, department_id, title, starts_at, ends_at, expected_attendees)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
               '76000000-0000-0000-0000-000000000002', 'EEE tutorial',
               '2027-09-13 15:00:00', '2027-09-13 16:00:00', 20)$sql$,
  '42501',
  'a department admin cannot book on behalf of another department'
);

select test.expect_error(
  $sql$insert into public.rooms (institution_id, building_id, name, code, capacity)
       values ('ace00000-0000-4000-8000-000000000001',
               '71000000-0000-0000-0000-000000000001', 'Sneaky room', 'SNEAK', 10)$sql$,
  '42501',
  'a department admin cannot create rooms'
);

-- The administrator books the electrical department in; the CPE administrator
-- must not be able to cancel it.
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000001","role":"authenticated"}', false);

insert into public.room_bookings (
  id, institution_id, room_id, semester_id, department_id, title, starts_at, ends_at, expected_attendees
) values (
  '8b000000-0000-0000-0000-000000000005', 'ace00000-0000-4000-8000-000000000001',
  '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
  '76000000-0000-0000-0000-000000000002', 'EEE seminar',
  '2027-09-13 14:00:00', '2027-09-13 15:00:00', 20
);

select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000002","role":"authenticated"}', false);

with changed as (
  update public.room_bookings
     set status = 'cancelled', cancelled_at = now()
   where id = '8b000000-0000-0000-0000-000000000005'
   returning id
)
select test.assert(
  (select count(*) from changed) = 0,
  'a department admin cannot cancel another department''s booking'
);

select test.assert(
  (select status::text from public.room_bookings
    where id = '8b000000-0000-0000-0000-000000000005') = 'confirmed',
  'the other department''s booking is still confirmed'
);

-- ---------------------------------------------------------------------------
-- Lecturers and neighbouring tenants are read-only outsiders
-- ---------------------------------------------------------------------------
\echo 'lecturer: cannot create rooms or bookings'
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000003","role":"authenticated"}', false);

select test.expect_error(
  $sql$insert into public.room_bookings (institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees)
       values ('ace00000-0000-4000-8000-000000000001',
               '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001',
               'Lecturer booking', '2027-09-13 16:00:00', '2027-09-13 17:00:00', 5)$sql$,
  '42501',
  'a lecturer cannot create a booking'
);

select test.expect_error(
  $sql$insert into public.buildings (institution_id, campus_id, name, code)
       values ('ace00000-0000-4000-8000-000000000001',
               '70000000-0000-0000-0000-000000000001', 'Lecturer block', 'LB')$sql$,
  '42501',
  'a lecturer cannot create a building'
);

select test.assert(
  (select count(*) from public.rooms
    where institution_id = 'ace00000-0000-4000-8000-000000000001') >= 4,
  'a lecturer can read the room list'
);

\echo 'neighbouring tenant: rooms and bookings are invisible'
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000004","role":"authenticated"}', false);

select test.assert(
  (select count(*) from public.rooms
    where institution_id = 'ace00000-0000-4000-8000-000000000001') = 0,
  'a neighbouring institution cannot see Phi rooms'
);

select test.assert(
  (select count(*) from public.room_bookings
    where institution_id = 'ace00000-0000-4000-8000-000000000001') = 0,
  'a neighbouring institution cannot see Phi bookings'
);

select test.expect_error(
  $sql$insert into public.rooms (institution_id, building_id, name, code, capacity)
       values ('ace00000-0000-4000-8000-000000000001',
               '71000000-0000-0000-0000-000000000001', 'Foreign room', 'FOREIGN', 10)$sql$,
  '42501',
  'a neighbouring institution cannot create a room in Phi'
);

-- ---------------------------------------------------------------------------
-- Room retirement guards and privileges
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'rooms: a room with upcoming bookings cannot be archived'
select test.expect_error(
  $sql$update public.rooms
          set archived_at = now()
        where id = '72000000-0000-0000-0000-000000000001'$sql$,
  'P0001',
  'archiving a room with upcoming bookings is rejected'
);

\echo 'rooms: capacity cannot shrink below a confirmed booking'
insert into public.room_bookings (
  id, institution_id, room_id, semester_id, title, starts_at, ends_at, expected_attendees
) values (
  '8b000000-0000-0000-0000-000000000006', 'ace00000-0000-4000-8000-000000000001',
  '72000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000001',
  'Lab session', '2027-09-13 09:00:00', '2027-09-13 10:00:00', 15
);

select test.expect_error(
  $sql$update public.rooms
          set capacity = 10
        where id = '72000000-0000-0000-0000-000000000002'$sql$,
  'P0001',
  'shrinking a room below a confirmed booking is rejected'
);

\echo 'rooms: an unused room can be archived and restored'
update public.rooms
   set archived_at = now()
 where id = '72000000-0000-0000-0000-000000000003';

select test.assert(
  (select archived_at from public.rooms
    where id = '72000000-0000-0000-0000-000000000003') is not null,
  'an unused room is archived'
);

update public.rooms
   set archived_at = null
 where id = '72000000-0000-0000-0000-000000000003';

select test.assert(
  (select archived_at from public.rooms
    where id = '72000000-0000-0000-0000-000000000003') is null,
  'an archived room is restored'
);

\echo 'privileges: no DELETE for authenticated, activity is recorded'
select test.expect_error(
  $sql$delete from public.rooms where id = '72000000-0000-0000-0000-000000000003'$sql$,
  '42501',
  'authenticated cannot delete a room'
);

select test.expect_error(
  $sql$delete from public.room_bookings where id = '8b000000-0000-0000-0000-000000000004'$sql$,
  '42501',
  'authenticated cannot delete a booking'
);

reset role;

select test.assert(
  (select count(*) from public.institution_activity
    where institution_id = 'ace00000-0000-4000-8000-000000000001'
      and action like 'facilities.%') > 0,
  'facilities changes are written to the activity log'
);

select test.assert(
  (select count(*) from public.institution_activity
    where institution_id = 'ace00000-0000-4000-8000-000000000001'
      and action = 'facilities.booking.cancelled') = 1,
  'cancelling a booking is logged as a cancellation'
);

\echo 'facilities tests passed'
