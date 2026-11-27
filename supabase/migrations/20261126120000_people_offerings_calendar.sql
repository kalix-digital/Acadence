-- Acadence · Phase 4b · People, groups, offerings and the academic calendar
--
-- Decisions this migration implements (ASSUMPTIONS_REGISTER OQ-020 … OQ-025)
--   * A student or lecturer record exists before any account does. user_id is
--     optional and unique per institution, so a roster can be imported first
--     and linked to an account when the person accepts an invitation.
--   * Matriculation and staff numbers are unique across the institution; an
--     email address is optional but unique (case-insensitively) when present.
--   * A student group is a cohort: programme + level + session, with
--     many-to-many membership, so one student can sit in a cohort group and a
--     tutorial/lab group at the same time.
--   * A course offering is course + session + semester + coordinator, with
--     separate lecturer assignments and linked student groups.
--   * Calendar events belong to a session, optionally narrowed to a semester.
--     Teaching weeks are derived from the semester's teaching window and the
--     holiday events covering it; they are never stored.
--
-- Same invariants as Phase 4: composite (institution_id, id) foreign keys,
-- archive instead of delete, definer scope helpers, activity logging.

-- ---------------------------------------------------------------------------
-- Status vocabularies
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'student_status') then
    create type public.student_status as enum ('active', 'graduated', 'withdrawn', 'suspended');
  end if;
  if not exists (select 1 from pg_type where typname = 'lecturer_status') then
    create type public.lecturer_status as enum ('active', 'on_leave', 'retired');
  end if;
  if not exists (select 1 from pg_type where typname = 'offering_status') then
    create type public.offering_status as enum ('planned', 'open', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'calendar_event_kind') then
    create type public.calendar_event_kind as enum (
      'holiday', 'registration', 'teaching', 'examination', 'deadline', 'event'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Students
--   user_id is nullable: the roster comes first, the account later. A student
--   may only be linked to one account per institution, and the account may
--   belong to only one student record in that institution.
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  matric_number text not null
    check (matric_number ~ '^[A-Za-z0-9][A-Za-z0-9/._-]{1,29}$'),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  email text check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text check (phone is null or char_length(phone) <= 32),
  programme_id uuid not null,
  level smallint not null default 100
    check (level between 100 and 900 and level % 100 = 0),
  entry_session_id uuid,
  status public.student_status not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_matric_unique unique (institution_id, matric_number),
  constraint students_user_unique unique (institution_id, user_id),
  constraint students_tenant_key unique (institution_id, id),
  constraint students_programme_same_tenant
    foreign key (institution_id, programme_id)
    references public.programmes (institution_id, id),
  constraint students_session_same_tenant
    foreign key (institution_id, entry_session_id)
    references public.academic_sessions (institution_id, id)
);

-- Emails are optional, but two students of one institution never share one.
create unique index if not exists students_email_unique
  on public.students (institution_id, lower(email))
  where email is not null;

-- ---------------------------------------------------------------------------
-- Lecturers
-- ---------------------------------------------------------------------------
create table if not exists public.lecturers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  staff_number text not null
    check (staff_number ~ '^[A-Za-z0-9][A-Za-z0-9/._-]{1,29}$'),
  title text check (title is null or char_length(title) <= 40),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  email text check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text check (phone is null or char_length(phone) <= 32),
  department_id uuid not null,
  status public.lecturer_status not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lecturers_staff_unique unique (institution_id, staff_number),
  constraint lecturers_user_unique unique (institution_id, user_id),
  constraint lecturers_tenant_key unique (institution_id, id),
  constraint lecturers_department_same_tenant
    foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
);

create unique index if not exists lecturers_email_unique
  on public.lecturers (institution_id, lower(email))
  where email is not null;

-- ---------------------------------------------------------------------------
-- Student groups
--   A cohort group is programme + level + session. Several groups may exist for
--   the same cohort (Group A / Group B), so only the code is unique.
-- ---------------------------------------------------------------------------
create table if not exists public.student_groups (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  programme_id uuid not null,
  session_id uuid not null,
  level smallint not null check (level between 100 and 900 and level % 100 = 0),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$'),
  expected_size smallint check (expected_size is null or expected_size between 1 and 2000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_groups_code_unique unique (institution_id, code),
  constraint student_groups_tenant_key unique (institution_id, id),
  constraint student_groups_programme_same_tenant
    foreign key (institution_id, programme_id)
    references public.programmes (institution_id, id),
  constraint student_groups_session_same_tenant
    foreign key (institution_id, session_id)
    references public.academic_sessions (institution_id, id)
);

-- ---------------------------------------------------------------------------
-- Group membership (many-to-many)
--   A student can belong to several groups at once. The partial unique index
--   allows a membership to be archived and later restored.
-- ---------------------------------------------------------------------------
create table if not exists public.student_group_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  group_id uuid not null,
  student_id uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_group_members_group_same_tenant
    foreign key (institution_id, group_id)
    references public.student_groups (institution_id, id) on delete cascade,
  constraint student_group_members_student_same_tenant
    foreign key (institution_id, student_id)
    references public.students (institution_id, id) on delete cascade
);

create unique index if not exists student_group_members_unique
  on public.student_group_members (group_id, student_id)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Course offerings
--   One offering per course per semester. The semester is pinned to its session
--   by a composite foreign key, so an offering can never sit in a semester of a
--   different academic year.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'semesters_tenant_session_key'
  ) then
    alter table public.semesters
      add constraint semesters_tenant_session_key
      unique (institution_id, id, session_id);
  end if;
end
$$;

create table if not exists public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  course_id uuid not null,
  session_id uuid not null,
  semester_id uuid not null,
  coordinator_lecturer_id uuid,
  expected_size smallint check (expected_size is null or expected_size between 1 and 2000),
  status public.offering_status not null default 'planned',
  notes text check (notes is null or char_length(notes) <= 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offerings_semester_course_unique unique (semester_id, course_id),
  constraint course_offerings_tenant_key unique (institution_id, id),
  constraint course_offerings_course_same_tenant
    foreign key (institution_id, course_id)
    references public.courses (institution_id, id),
  constraint course_offerings_semester_same_tenant
    foreign key (institution_id, semester_id, session_id)
    references public.semesters (institution_id, id, session_id),
  constraint course_offerings_coordinator_same_tenant
    foreign key (institution_id, coordinator_lecturer_id)
    references public.lecturers (institution_id, id)
);

-- ---------------------------------------------------------------------------
-- Offering lecturer assignments
-- ---------------------------------------------------------------------------
create table if not exists public.course_offering_lecturers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  offering_id uuid not null,
  lecturer_id uuid not null,
  role text not null default 'lead' check (role in ('lead', 'assistant')),
  contact_hours numeric(5, 2) check (contact_hours is null or contact_hours >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offering_lecturers_offering_same_tenant
    foreign key (institution_id, offering_id)
    references public.course_offerings (institution_id, id) on delete cascade,
  constraint course_offering_lecturers_lecturer_same_tenant
    foreign key (institution_id, lecturer_id)
    references public.lecturers (institution_id, id) on delete cascade
);

create unique index if not exists course_offering_lecturers_unique
  on public.course_offering_lecturers (offering_id, lecturer_id)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Offering student groups
-- ---------------------------------------------------------------------------
create table if not exists public.course_offering_groups (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  offering_id uuid not null,
  group_id uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offering_groups_offering_same_tenant
    foreign key (institution_id, offering_id)
    references public.course_offerings (institution_id, id) on delete cascade,
  constraint course_offering_groups_group_same_tenant
    foreign key (institution_id, group_id)
    references public.student_groups (institution_id, id) on delete cascade
);

create unique index if not exists course_offering_groups_unique
  on public.course_offering_groups (offering_id, group_id)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Academic calendar
--   Events belong to a session and may be narrowed to one of its semesters.
--   Teaching weeks are derived (see src/lib/academics/calendar.ts), never stored.
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  session_id uuid not null,
  semester_id uuid,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text check (description is null or char_length(description) <= 500),
  kind public.calendar_event_kind not null default 'event',
  starts_on date not null,
  ends_on date not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_tenant_key unique (institution_id, id),
  constraint calendar_events_dates check (ends_on >= starts_on),
  constraint calendar_events_session_same_tenant
    foreign key (institution_id, session_id)
    references public.academic_sessions (institution_id, id) on delete cascade,
  constraint calendar_events_semester_same_tenant
    foreign key (institution_id, semester_id, session_id)
    references public.semesters (institution_id, id, session_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists students_institution_idx
  on public.students (institution_id, last_name, first_name);
create index if not exists students_programme_idx
  on public.students (programme_id, level);
create index if not exists students_user_idx
  on public.students (user_id) where user_id is not null;
create index if not exists lecturers_institution_idx
  on public.lecturers (institution_id, last_name, first_name);
create index if not exists lecturers_department_idx
  on public.lecturers (department_id);
create index if not exists student_groups_institution_idx
  on public.student_groups (institution_id, name);
create index if not exists student_groups_cohort_idx
  on public.student_groups (programme_id, level, session_id);
create index if not exists student_group_members_group_idx
  on public.student_group_members (group_id);
create index if not exists student_group_members_student_idx
  on public.student_group_members (student_id);
create index if not exists course_offerings_semester_idx
  on public.course_offerings (semester_id, course_id);
create index if not exists course_offerings_course_idx
  on public.course_offerings (course_id);
create index if not exists course_offering_lecturers_lecturer_idx
  on public.course_offering_lecturers (lecturer_id);
create index if not exists course_offering_groups_group_idx
  on public.course_offering_groups (group_id);
create index if not exists calendar_events_session_idx
  on public.calendar_events (session_id, starts_on);
create index if not exists calendar_events_semester_idx
  on public.calendar_events (semester_id) where semester_id is not null;

-- ---------------------------------------------------------------------------
-- Hierarchy resolvers
--   Defined after the tables because SQL function bodies are validated when the
--   function is created. Each walks one step up the hierarchy so a policy can
--   ask "may this caller write this student?" without reading the table it
--   protects.
-- ---------------------------------------------------------------------------
create or replace function public.student_group_programme(p_group uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select programme_id from public.student_groups where id = p_group;
$$;

create or replace function public.course_department(p_course uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from public.courses where id = p_course;
$$;

create or replace function public.offering_course(p_offering uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select course_id from public.course_offerings where id = p_offering;
$$;

revoke all on function public.student_group_programme(uuid) from public, anon;
grant execute on function public.student_group_programme(uuid) to authenticated, service_role;

revoke all on function public.course_department(uuid) from public, anon;
grant execute on function public.course_department(uuid) to authenticated, service_role;

revoke all on function public.offering_course(uuid) from public, anon;
grant execute on function public.offering_course(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

drop trigger if exists lecturers_set_updated_at on public.lecturers;
create trigger lecturers_set_updated_at
  before update on public.lecturers
  for each row execute function public.set_updated_at();

drop trigger if exists student_groups_set_updated_at on public.student_groups;
create trigger student_groups_set_updated_at
  before update on public.student_groups
  for each row execute function public.set_updated_at();

drop trigger if exists student_group_members_set_updated_at on public.student_group_members;
create trigger student_group_members_set_updated_at
  before update on public.student_group_members
  for each row execute function public.set_updated_at();

drop trigger if exists course_offerings_set_updated_at on public.course_offerings;
create trigger course_offerings_set_updated_at
  before update on public.course_offerings
  for each row execute function public.set_updated_at();

drop trigger if exists course_offering_lecturers_set_updated_at on public.course_offering_lecturers;
create trigger course_offering_lecturers_set_updated_at
  before update on public.course_offering_lecturers
  for each row execute function public.set_updated_at();

drop trigger if exists course_offering_groups_set_updated_at on public.course_offering_groups;
create trigger course_offering_groups_set_updated_at
  before update on public.course_offering_groups
  for each row execute function public.set_updated_at();

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Activity logging
--   One definer trigger for the phase. jsonb access is used because the tables
--   name their label differently (name, code, title, or a person's names).
-- ---------------------------------------------------------------------------
create or replace function public.log_people_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity text;
  v_institution uuid;
  v_label text;
  v_action text;
  v_record jsonb;
begin
  v_entity := case tg_table_name
    when 'students' then 'student'
    when 'lecturers' then 'lecturer'
    when 'student_groups' then 'group'
    when 'student_group_members' then 'group_member'
    when 'course_offerings' then 'offering'
    when 'course_offering_lecturers' then 'offering_lecturer'
    when 'course_offering_groups' then 'offering_group'
    when 'calendar_events' then 'calendar_event'
    else tg_table_name
  end;

  v_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_institution := (v_record ->> 'institution_id')::uuid;
  v_label := coalesce(
    v_record ->> 'name',
    v_record ->> 'code',
    v_record ->> 'title',
    nullif(
      concat_ws(' ', v_record ->> 'first_name', v_record ->> 'last_name'),
      ''
    ),
    'record'
  );

  v_action := case
    when tg_op = 'INSERT' then 'academic.' || v_entity || '.created'
    when tg_op = 'DELETE' then 'academic.' || v_entity || '.deleted'
    when (v_record ->> 'archived_at') is not null
         and (to_jsonb(old) ->> 'archived_at') is null
      then 'academic.' || v_entity || '.archived'
    when (v_record ->> 'archived_at') is null
         and (to_jsonb(old) ->> 'archived_at') is not null
      then 'academic.' || v_entity || '.restored'
    else 'academic.' || v_entity || '.updated'
  end;

  perform public.log_institution_activity(
    v_institution,
    v_action,
    format('%s %s %s', initcap(replace(v_entity, '_', ' ')), v_label, split_part(v_action, '.', 3)),
    jsonb_build_object('entity', v_entity, 'name', v_label)
  );

  return null;
end;
$$;

drop trigger if exists students_log_event on public.students;
create trigger students_log_event
  after insert or update or delete on public.students
  for each row execute function public.log_people_event();

drop trigger if exists lecturers_log_event on public.lecturers;
create trigger lecturers_log_event
  after insert or update or delete on public.lecturers
  for each row execute function public.log_people_event();

drop trigger if exists student_groups_log_event on public.student_groups;
create trigger student_groups_log_event
  after insert or update or delete on public.student_groups
  for each row execute function public.log_people_event();

drop trigger if exists student_group_members_log_event on public.student_group_members;
create trigger student_group_members_log_event
  after insert or update or delete on public.student_group_members
  for each row execute function public.log_people_event();

drop trigger if exists course_offerings_log_event on public.course_offerings;
create trigger course_offerings_log_event
  after insert or update or delete on public.course_offerings
  for each row execute function public.log_people_event();

drop trigger if exists course_offering_lecturers_log_event on public.course_offering_lecturers;
create trigger course_offering_lecturers_log_event
  after insert or update or delete on public.course_offering_lecturers
  for each row execute function public.log_people_event();

drop trigger if exists course_offering_groups_log_event on public.course_offering_groups;
create trigger course_offering_groups_log_event
  after insert or update or delete on public.course_offering_groups
  for each row execute function public.log_people_event();

drop trigger if exists calendar_events_log_event on public.calendar_events;
create trigger calendar_events_log_event
  after insert or update or delete on public.calendar_events
  for each row execute function public.log_people_event();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Read: any active member of the institution.
--   Write: can_manage_academic_unit() resolved through the record's programme,
--   department or course. No DELETE policy and no DELETE grant anywhere.
-- ---------------------------------------------------------------------------
alter table public.students enable row level security;
alter table public.lecturers enable row level security;
alter table public.student_groups enable row level security;
alter table public.student_group_members enable row level security;
alter table public.course_offerings enable row level security;
alter table public.course_offering_lecturers enable row level security;
alter table public.course_offering_groups enable row level security;
alter table public.calendar_events enable row level security;

-- students (scoped by the programme's department)
drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists students_insert on public.students;
create policy students_insert on public.students
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(programme_id)),
      public.programme_department(programme_id)
    )
  );

drop policy if exists students_update on public.students;
create policy students_update on public.students
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(programme_id)),
      public.programme_department(programme_id)
    )
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(programme_id)),
      public.programme_department(programme_id)
    )
  );

-- lecturers (scoped by their department)
drop policy if exists lecturers_select on public.lecturers;
create policy lecturers_select on public.lecturers
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists lecturers_insert on public.lecturers;
create policy lecturers_insert on public.lecturers
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(department_id),
      department_id
    )
  );

drop policy if exists lecturers_update on public.lecturers;
create policy lecturers_update on public.lecturers
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(department_id),
      department_id
    )
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(department_id),
      department_id
    )
  );

-- student_groups (scoped by the programme's department)
drop policy if exists student_groups_select on public.student_groups;
create policy student_groups_select on public.student_groups
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists student_groups_insert on public.student_groups;
create policy student_groups_insert on public.student_groups
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(programme_id)),
      public.programme_department(programme_id)
    )
  );

drop policy if exists student_groups_update on public.student_groups;
create policy student_groups_update on public.student_groups
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(programme_id)),
      public.programme_department(programme_id)
    )
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(programme_id)),
      public.programme_department(programme_id)
    )
  );

-- student_group_members (scoped by the group's programme)
drop policy if exists student_group_members_select on public.student_group_members;
create policy student_group_members_select on public.student_group_members
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists student_group_members_insert on public.student_group_members;
create policy student_group_members_insert on public.student_group_members
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(public.student_group_programme(group_id))),
      public.programme_department(public.student_group_programme(group_id))
    )
  );

drop policy if exists student_group_members_update on public.student_group_members;
create policy student_group_members_update on public.student_group_members
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(public.student_group_programme(group_id))),
      public.programme_department(public.student_group_programme(group_id))
    )
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(public.student_group_programme(group_id))),
      public.programme_department(public.student_group_programme(group_id))
    )
  );

-- course_offerings (scoped by the course's department)
drop policy if exists course_offerings_select on public.course_offerings;
create policy course_offerings_select on public.course_offerings
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists course_offerings_insert on public.course_offerings;
create policy course_offerings_insert on public.course_offerings
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(course_id)),
      public.course_department(course_id)
    )
  );

drop policy if exists course_offerings_update on public.course_offerings;
create policy course_offerings_update on public.course_offerings
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(course_id)),
      public.course_department(course_id)
    )
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(course_id)),
      public.course_department(course_id)
    )
  );

-- course_offering_lecturers (scoped through the offering's course)
drop policy if exists course_offering_lecturers_select on public.course_offering_lecturers;
create policy course_offering_lecturers_select on public.course_offering_lecturers
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists course_offering_lecturers_insert on public.course_offering_lecturers;
create policy course_offering_lecturers_insert on public.course_offering_lecturers
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(public.offering_course(offering_id))),
      public.course_department(public.offering_course(offering_id))
    )
  );

drop policy if exists course_offering_lecturers_update on public.course_offering_lecturers;
create policy course_offering_lecturers_update on public.course_offering_lecturers
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(public.offering_course(offering_id))),
      public.course_department(public.offering_course(offering_id))
    )
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(public.offering_course(offering_id))),
      public.course_department(public.offering_course(offering_id))
    )
  );

-- course_offering_groups (scoped through the offering's course)
drop policy if exists course_offering_groups_select on public.course_offering_groups;
create policy course_offering_groups_select on public.course_offering_groups
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists course_offering_groups_insert on public.course_offering_groups;
create policy course_offering_groups_insert on public.course_offering_groups
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(public.offering_course(offering_id))),
      public.course_department(public.offering_course(offering_id))
    )
  );

drop policy if exists course_offering_groups_update on public.course_offering_groups;
create policy course_offering_groups_update on public.course_offering_groups
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(public.offering_course(offering_id))),
      public.course_department(public.offering_course(offering_id))
    )
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.course_department(public.offering_course(offering_id))),
      public.course_department(public.offering_course(offering_id))
    )
  );

-- calendar_events (institution level)
drop policy if exists calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists calendar_events_insert on public.calendar_events;
create policy calendar_events_insert on public.calendar_events
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

drop policy if exists calendar_events_update on public.calendar_events;
create policy calendar_events_update on public.calendar_events
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

-- ---------------------------------------------------------------------------
-- Privileges
--   No DELETE for authenticated: archive, never destroy.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.students, public.lecturers,
  public.student_groups, public.student_group_members,
  public.course_offerings, public.course_offering_lecturers,
  public.course_offering_groups, public.calendar_events
  to authenticated;

grant all on public.students, public.lecturers,
  public.student_groups, public.student_group_members,
  public.course_offerings, public.course_offering_lecturers,
  public.course_offering_groups, public.calendar_events
  to service_role;

revoke all on public.students, public.lecturers,
  public.student_groups, public.student_group_members,
  public.course_offerings, public.course_offering_lecturers,
  public.course_offering_groups, public.calendar_events
  from anon;
