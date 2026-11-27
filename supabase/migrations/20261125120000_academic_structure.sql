-- Acadence · Phase 4 · Academic structure
-- Campuses → faculties → departments, plus academic sessions, semesters,
-- programmes, courses and the programme→course curriculum link.
--
-- Design notes
--   * Hierarchy is enforced with composite foreign keys on (institution_id, …)
--     so a department can never point at another tenant's faculty, even for a
--     platform administrator writing with RLS bypassed by service_role.
--   * Records are archived, never deleted: authenticated has no DELETE grant on
--     these tables, so an archive is the only removal the application can do.
--   * Writes are scoped by role through public.can_manage_academic_unit(), a
--     definer helper. Policies never read the table they protect, so none of
--     the Phase 2 recursion class of bug is possible here.
--   * Everything is logged to institution_activity by definer triggers.

-- ---------------------------------------------------------------------------
-- Academic period status
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'academic_period_status') then
    create type public.academic_period_status as enum ('planned', 'active', 'closed');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tenant helpers for academic scoping
-- ---------------------------------------------------------------------------
create or replace function public.auth_faculty_ids(p_institution uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select faculty_id
  from public.institution_memberships
  where user_id = (select auth.uid())
    and institution_id = p_institution
    and status = 'active'
    and faculty_id is not null;
$$;

-- True when the caller may write an academic record at this unit:
--   institution_admin   → whole institution
--   faculty_admin       → their own faculty and its departments/programmes
--   department_admin    → their own department and its programmes/courses
-- Passing NULL for a level simply means "this level is not in scope".
create or replace function public.can_manage_academic_unit(
  p_institution uuid,
  p_faculty uuid default null,
  p_department uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.membership_role := public.auth_role(p_institution);
begin
  if v_role is null then
    return false;
  end if;

  if v_role = 'institution_admin' then
    return true;
  end if;

  if v_role = 'faculty_admin'
     and p_faculty is not null
     and p_faculty in (select public.auth_faculty_ids(p_institution)) then
    return true;
  end if;

  if v_role = 'department_admin'
     and p_department is not null
     and p_department in (select public.auth_department_ids(p_institution)) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.can_manage_academic_unit(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_academic_unit(uuid, uuid, uuid)
  to authenticated, service_role;

revoke all on function public.auth_faculty_ids(uuid) from public, anon;
grant execute on function public.auth_faculty_ids(uuid) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- Campuses
--   Optional: a single-site institution never has to create one.
-- ---------------------------------------------------------------------------
create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$'),
  address text check (address is null or char_length(address) <= 300),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campuses_code_unique unique (institution_id, code),
  constraint campuses_tenant_key unique (institution_id, id)
);

-- ---------------------------------------------------------------------------
-- Faculties
--   Campus is optional (Phase 4 decision): faculties sit at institution level
--   unless the institution actually runs several sites.
-- ---------------------------------------------------------------------------
create table if not exists public.faculties (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  campus_id uuid,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faculties_code_unique unique (institution_id, code),
  constraint faculties_tenant_key unique (institution_id, id),
  constraint faculties_campus_same_tenant
    foreign key (institution_id, campus_id)
    references public.campuses (institution_id, id)
);

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  faculty_id uuid not null,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_code_unique unique (institution_id, code),
  constraint departments_tenant_key unique (institution_id, id),
  constraint departments_faculty_same_tenant
    foreign key (institution_id, faculty_id)
    references public.faculties (institution_id, id)
);

-- ---------------------------------------------------------------------------
-- Academic sessions and semesters
-- ---------------------------------------------------------------------------
create table if not exists public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 4 and 40),
  starts_on date not null,
  ends_on date not null,
  status public.academic_period_status not null default 'planned',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_sessions_name_unique unique (institution_id, name),
  constraint academic_sessions_tenant_key unique (institution_id, id),
  constraint academic_sessions_dates check (ends_on > starts_on)
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  session_id uuid not null,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  sequence smallint not null check (sequence between 1 and 4),
  teaching_starts_on date not null,
  teaching_ends_on date not null,
  exam_starts_on date not null,
  exam_ends_on date not null,
  status public.academic_period_status not null default 'planned',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint semesters_sequence_unique unique (session_id, sequence),
  constraint semesters_tenant_key unique (institution_id, id),
  constraint semesters_session_same_tenant
    foreign key (institution_id, session_id)
    references public.academic_sessions (institution_id, id) on delete cascade,
  constraint semesters_dates check (
    teaching_ends_on >= teaching_starts_on
    and exam_starts_on >= teaching_ends_on
    and exam_ends_on >= exam_starts_on
  )
);

-- ---------------------------------------------------------------------------
-- Programmes
-- ---------------------------------------------------------------------------
create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  department_id uuid not null,
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$'),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  level text not null default 'undergraduate'
    check (level in ('undergraduate', 'postgraduate', 'diploma', 'certificate')),
  duration_years smallint not null default 4 check (duration_years between 1 and 8),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programmes_code_unique unique (institution_id, code),
  constraint programmes_tenant_key unique (institution_id, id),
  constraint programmes_department_same_tenant
    foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
);

-- ---------------------------------------------------------------------------
-- Courses
--   A course belongs to a department; which programmes require it (and at what
--   level) lives in programme_courses, so shared courses are never duplicated.
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  department_id uuid not null,
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$'),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  units smallint not null default 3 check (units between 1 and 12),
  level smallint not null default 100 check (level between 100 and 900 and level % 100 = 0),
  required_room_type text not null default 'classroom'
    check (required_room_type in ('classroom', 'lecture_hall', 'laboratory', 'studio', 'seminar')),
  required_features text[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_code_unique unique (institution_id, code),
  constraint courses_tenant_key unique (institution_id, id),
  constraint courses_department_same_tenant
    foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
);

create table if not exists public.programme_courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  programme_id uuid not null,
  course_id uuid not null,
  level smallint not null check (level between 100 and 900 and level % 100 = 0),
  requirement text not null default 'required' check (requirement in ('required', 'elective')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programme_courses_unique unique (programme_id, course_id),
  constraint programme_courses_programme_same_tenant
    foreign key (institution_id, programme_id)
    references public.programmes (institution_id, id) on delete cascade,
  constraint programme_courses_course_same_tenant
    foreign key (institution_id, course_id)
    references public.courses (institution_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists campuses_institution_idx
  on public.campuses (institution_id, name);
create index if not exists faculties_institution_idx
  on public.faculties (institution_id, name);
create index if not exists faculties_campus_idx
  on public.faculties (campus_id) where campus_id is not null;
create index if not exists departments_institution_idx
  on public.departments (institution_id, name);
create index if not exists departments_faculty_idx
  on public.departments (faculty_id);
create index if not exists academic_sessions_institution_idx
  on public.academic_sessions (institution_id, starts_on desc);
create index if not exists semesters_institution_idx
  on public.semesters (institution_id, teaching_starts_on desc);
create index if not exists programmes_institution_idx
  on public.programmes (institution_id, name);
create index if not exists programmes_department_idx
  on public.programmes (department_id);
create index if not exists courses_institution_idx
  on public.courses (institution_id, title);
create index if not exists courses_department_idx
  on public.courses (department_id);
create index if not exists programme_courses_programme_idx
  on public.programme_courses (programme_id);
create index if not exists programme_courses_course_idx
  on public.programme_courses (course_id);

-- ---------------------------------------------------------------------------
-- Hierarchy resolvers
--   Defined after the tables because SQL function bodies are validated at
--   creation time. They read through RLS as the definer, so a policy can ask
--   "does this department_admin administer this department?" in one step.
-- ---------------------------------------------------------------------------
create or replace function public.department_faculty(p_department uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select faculty_id from public.departments where id = p_department;
$$;

create or replace function public.programme_department(p_programme uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from public.programmes where id = p_programme;
$$;

revoke all on function public.department_faculty(uuid) from public, anon;
grant execute on function public.department_faculty(uuid) to authenticated, service_role;

revoke all on function public.programme_department(uuid) from public, anon;
grant execute on function public.programme_department(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists campuses_set_updated_at on public.campuses;
create trigger campuses_set_updated_at
  before update on public.campuses
  for each row execute function public.set_updated_at();

drop trigger if exists faculties_set_updated_at on public.faculties;
create trigger faculties_set_updated_at
  before update on public.faculties
  for each row execute function public.set_updated_at();

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

drop trigger if exists academic_sessions_set_updated_at on public.academic_sessions;
create trigger academic_sessions_set_updated_at
  before update on public.academic_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists semesters_set_updated_at on public.semesters;
create trigger semesters_set_updated_at
  before update on public.semesters
  for each row execute function public.set_updated_at();

drop trigger if exists programmes_set_updated_at on public.programmes;
create trigger programmes_set_updated_at
  before update on public.programmes
  for each row execute function public.set_updated_at();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists programme_courses_set_updated_at on public.programme_courses;
create trigger programme_courses_set_updated_at
  before update on public.programme_courses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Activity logging
--   One definer trigger function for the whole hierarchy. Archived records are
--   reported as archived rather than updated.
-- ---------------------------------------------------------------------------
create or replace function public.log_academic_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity text;
  v_institution uuid;
  v_name text;
  v_action text;
begin
  v_entity := case tg_table_name
    when 'campuses' then 'campus'
    when 'faculties' then 'faculty'
    when 'departments' then 'department'
    when 'academic_sessions' then 'session'
    when 'semesters' then 'semester'
    when 'programmes' then 'programme'
    when 'courses' then 'course'
    when 'programme_courses' then 'curriculum'
    else tg_table_name
  end;

  -- jsonb access is used because a composite record raises on a field the
  -- table does not have (campuses and courses name their label differently).
  if tg_op = 'DELETE' then
    v_institution := old.institution_id;
    v_name := coalesce(
      to_jsonb(old) ->> 'name', to_jsonb(old) ->> 'code', to_jsonb(old) ->> 'title', 'record'
    );
  else
    v_institution := new.institution_id;
    v_name := coalesce(
      to_jsonb(new) ->> 'name', to_jsonb(new) ->> 'code', to_jsonb(new) ->> 'title', 'record'
    );
  end if;

  v_action := case
    when tg_op = 'INSERT' then 'academic.' || v_entity || '.created'
    when tg_op = 'DELETE' then 'academic.' || v_entity || '.deleted'
    when new.archived_at is not null and old.archived_at is null
      then 'academic.' || v_entity || '.archived'
    when new.archived_at is null and old.archived_at is not null
      then 'academic.' || v_entity || '.restored'
    else 'academic.' || v_entity || '.updated'
  end;

  perform public.log_institution_activity(
    v_institution,
    v_action,
    format('%s %s %s', initcap(v_entity), v_name, split_part(v_action, '.', 3)),
    jsonb_build_object('entity', v_entity, 'name', v_name)
  );

  return null;
end;
$$;

drop trigger if exists campuses_log_event on public.campuses;
create trigger campuses_log_event
  after insert or update or delete on public.campuses
  for each row execute function public.log_academic_event();

drop trigger if exists faculties_log_event on public.faculties;
create trigger faculties_log_event
  after insert or update or delete on public.faculties
  for each row execute function public.log_academic_event();

drop trigger if exists departments_log_event on public.departments;
create trigger departments_log_event
  after insert or update or delete on public.departments
  for each row execute function public.log_academic_event();

drop trigger if exists academic_sessions_log_event on public.academic_sessions;
create trigger academic_sessions_log_event
  after insert or update or delete on public.academic_sessions
  for each row execute function public.log_academic_event();

drop trigger if exists semesters_log_event on public.semesters;
create trigger semesters_log_event
  after insert or update or delete on public.semesters
  for each row execute function public.log_academic_event();

drop trigger if exists programmes_log_event on public.programmes;
create trigger programmes_log_event
  after insert or update or delete on public.programmes
  for each row execute function public.log_academic_event();

drop trigger if exists courses_log_event on public.courses;
create trigger courses_log_event
  after insert or update or delete on public.courses
  for each row execute function public.log_academic_event();

drop trigger if exists programme_courses_log_event on public.programme_courses;
create trigger programme_courses_log_event
  after insert or update or delete on public.programme_courses
  for each row execute function public.log_academic_event();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Read: anyone with an active membership of the institution.
--   Write: scoped by can_manage_academic_unit(); no DELETE policy anywhere, and
--   no DELETE grant, so archiving is the only removal available.
-- ---------------------------------------------------------------------------
alter table public.campuses enable row level security;
alter table public.faculties enable row level security;
alter table public.departments enable row level security;
alter table public.academic_sessions enable row level security;
alter table public.semesters enable row level security;
alter table public.programmes enable row level security;
alter table public.courses enable row level security;
alter table public.programme_courses enable row level security;

-- campuses
drop policy if exists campuses_select on public.campuses;
create policy campuses_select on public.campuses
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists campuses_insert on public.campuses;
create policy campuses_insert on public.campuses
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

drop policy if exists campuses_update on public.campuses;
create policy campuses_update on public.campuses
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

-- faculties
drop policy if exists faculties_select on public.faculties;
create policy faculties_select on public.faculties
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists faculties_insert on public.faculties;
create policy faculties_insert on public.faculties
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

drop policy if exists faculties_update on public.faculties;
create policy faculties_update on public.faculties
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id, id)
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id, id)
  );

-- departments
drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists departments_insert on public.departments;
create policy departments_insert on public.departments
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id, faculty_id)
  );

drop policy if exists departments_update on public.departments;
create policy departments_update on public.departments
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id, faculty_id, id)
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id, faculty_id, id)
  );

-- academic_sessions (institution-level)
drop policy if exists academic_sessions_select on public.academic_sessions;
create policy academic_sessions_select on public.academic_sessions
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists academic_sessions_insert on public.academic_sessions;
create policy academic_sessions_insert on public.academic_sessions
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

drop policy if exists academic_sessions_update on public.academic_sessions;
create policy academic_sessions_update on public.academic_sessions
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

-- semesters (institution-level, like their session)
drop policy if exists semesters_select on public.semesters;
create policy semesters_select on public.semesters
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists semesters_insert on public.semesters;
create policy semesters_insert on public.semesters
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

drop policy if exists semesters_update on public.semesters;
create policy semesters_update on public.semesters
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  )
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(institution_id)
  );

-- programmes
drop policy if exists programmes_select on public.programmes;
create policy programmes_select on public.programmes
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists programmes_insert on public.programmes;
create policy programmes_insert on public.programmes
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(department_id),
      department_id
    )
  );

drop policy if exists programmes_update on public.programmes;
create policy programmes_update on public.programmes
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

-- courses
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists courses_insert on public.courses;
create policy courses_insert on public.courses
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(department_id),
      department_id
    )
  );

drop policy if exists courses_update on public.courses;
create policy courses_update on public.courses
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

-- programme_courses
drop policy if exists programme_courses_select on public.programme_courses;
create policy programme_courses_select on public.programme_courses
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists programme_courses_insert on public.programme_courses;
create policy programme_courses_insert on public.programme_courses
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.can_manage_academic_unit(
      institution_id,
      public.department_faculty(public.programme_department(programme_id)),
      public.programme_department(programme_id)
    )
  );

drop policy if exists programme_courses_update on public.programme_courses;
create policy programme_courses_update on public.programme_courses
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

-- ---------------------------------------------------------------------------
-- Privileges
--   No DELETE for authenticated: archive, never destroy.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.campuses, public.faculties,
  public.departments, public.academic_sessions, public.semesters,
  public.programmes, public.courses, public.programme_courses
  to authenticated;

grant all on public.campuses, public.faculties, public.departments,
  public.academic_sessions, public.semesters, public.programmes,
  public.courses, public.programme_courses
  to service_role;

revoke all on public.campuses, public.faculties, public.departments,
  public.academic_sessions, public.semesters, public.programmes,
  public.courses, public.programme_courses
  from anon;
