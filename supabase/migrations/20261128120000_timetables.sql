-- ===========================================================================
-- Phase 6 — Timetable management
--
--   Drafts are working documents scoped to a department, a faculty or the
--   whole institution. Publishing snapshots a draft into an immutable version
--   (OQ-033): the new version carries the draft's entries plus the previous
--   live version's entries outside the draft's scope, then the previous
--   version becomes `superseded`. Exactly one version per semester is
--   `published`, enforced by a partial unique index.
--
--   Entries are weekly patterns (OQ-032): day of week plus start and end
--   time. Holiday and exam weeks are derived from the academic calendar, so a
--   weekly entry covers the semester without duplicating rows per date.
--
--   Hard overlap rules are enforced per container by exclusion constraints:
--   no two entries in the same draft (or version) may share a room, a
--   lecturer or a student group at the same time. Because publishing copies
--   both sides into one version, a cross-department clash is rejected too.
-- ===========================================================================

create extension if not exists btree_gist;

do $$
begin
  create type public.timetable_status as enum
    ('draft', 'validated', 'published', 'superseded', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.change_request_status as enum
    ('pending', 'approved', 'rejected', 'withdrawn');
exception
  when duplicate_object then null;
end $$;

-- A range over `time`, so exclusion constraints can compare two slots on the
-- same weekday. Postgres ships GiST support for range types.
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'timerange' and n.nspname = 'public'
  ) then
    create type public.timerange as range (subtype = time);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Drafts
-- ---------------------------------------------------------------------------
create table if not exists public.timetable_drafts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  semester_id uuid not null,
  department_id uuid,
  faculty_id uuid,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  status public.timetable_status not null default 'draft'
    check (status in ('draft', 'validated', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_drafts_tenant_key unique (institution_id, id),
  -- At most one scope. Both null means an institution-wide draft; the scope
  -- decides which entries a publish replaces.
  constraint timetable_drafts_scope check (not (department_id is not null and faculty_id is not null)),
  constraint timetable_drafts_semester_same_tenant
    foreign key (institution_id, semester_id)
    references public.semesters (institution_id, id) on delete cascade,
  constraint timetable_drafts_department_same_tenant
    foreign key (institution_id, department_id)
    references public.departments (institution_id, id),
  constraint timetable_drafts_faculty_same_tenant
    foreign key (institution_id, faculty_id)
    references public.faculties (institution_id, id)
);

create unique index if not exists timetable_drafts_title_unique
  on public.timetable_drafts (institution_id, semester_id, lower(title))
  where archived_at is null;

create index if not exists timetable_drafts_institution_idx
  on public.timetable_drafts (institution_id, semester_id);

-- ---------------------------------------------------------------------------
-- Versions
--   One live (`published`) version per semester. Superseded versions are kept
--   forever; archiving only hides them from the default history view.
-- ---------------------------------------------------------------------------
create table if not exists public.timetable_versions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  semester_id uuid not null,
  draft_id uuid,
  version_no integer not null check (version_no > 0),
  status public.timetable_status not null default 'published'
    check (status in ('published', 'superseded', 'archived')),
  change_summary text not null default 'Published timetable'
    check (char_length(change_summary) <= 300),
  validation_report jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_versions_tenant_key unique (institution_id, id),
  constraint timetable_versions_number unique (semester_id, version_no),
  constraint timetable_versions_semester_same_tenant
    foreign key (institution_id, semester_id)
    references public.semesters (institution_id, id) on delete cascade,
  constraint timetable_versions_draft_same_tenant
    foreign key (institution_id, draft_id)
    references public.timetable_drafts (institution_id, id)
);

create unique index if not exists timetable_versions_live
  on public.timetable_versions (semester_id)
  where status = 'published';

-- ---------------------------------------------------------------------------
-- Entries
--   An entry belongs to exactly one draft or one version, never both.
--   `department_id` is derived from the offering (or set explicitly for fixed
--   entries) and decides which publish scope replaces the entry.
-- ---------------------------------------------------------------------------
create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  draft_id uuid,
  version_id uuid,
  department_id uuid,
  offering_id uuid,
  lecturer_id uuid,
  room_id uuid,
  group_id uuid,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  is_fixed boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_entries_tenant_key unique (institution_id, id),
  constraint timetable_entries_window check (ends_at > starts_at),
  constraint timetable_entries_container check (num_nonnulls(draft_id, version_id) = 1),
  -- A fixed entry (faculty board, exam briefing) may stand without an
  -- offering; everything else schedules one.
  constraint timetable_entries_offering check (is_fixed or offering_id is not null),
  constraint timetable_entries_draft_same_tenant
    foreign key (institution_id, draft_id)
    references public.timetable_drafts (institution_id, id) on delete cascade,
  constraint timetable_entries_version_same_tenant
    foreign key (institution_id, version_id)
    references public.timetable_versions (institution_id, id) on delete cascade,
  constraint timetable_entries_department_same_tenant
    foreign key (institution_id, department_id)
    references public.departments (institution_id, id),
  constraint timetable_entries_offering_same_tenant
    foreign key (institution_id, offering_id)
    references public.course_offerings (institution_id, id),
  constraint timetable_entries_lecturer_same_tenant
    foreign key (institution_id, lecturer_id)
    references public.lecturers (institution_id, id),
  constraint timetable_entries_room_same_tenant
    foreign key (institution_id, room_id)
    references public.rooms (institution_id, id),
  constraint timetable_entries_group_same_tenant
    foreign key (institution_id, group_id)
    references public.student_groups (institution_id, id)
);

alter table public.timetable_entries
  drop constraint if exists timetable_entries_draft_room_no_overlap,
  drop constraint if exists timetable_entries_draft_lecturer_no_overlap,
  drop constraint if exists timetable_entries_draft_group_no_overlap,
  drop constraint if exists timetable_entries_version_room_no_overlap,
  drop constraint if exists timetable_entries_version_lecturer_no_overlap,
  drop constraint if exists timetable_entries_version_group_no_overlap;

alter table public.timetable_entries
  add constraint timetable_entries_draft_room_no_overlap
  exclude using gist (
    draft_id with =,
    room_id with =,
    day_of_week with =,
    public.timerange(starts_at, ends_at) with &&
  ) where (draft_id is not null and room_id is not null);

alter table public.timetable_entries
  add constraint timetable_entries_draft_lecturer_no_overlap
  exclude using gist (
    draft_id with =,
    lecturer_id with =,
    day_of_week with =,
    public.timerange(starts_at, ends_at) with &&
  ) where (draft_id is not null and lecturer_id is not null);

alter table public.timetable_entries
  add constraint timetable_entries_draft_group_no_overlap
  exclude using gist (
    draft_id with =,
    group_id with =,
    day_of_week with =,
    public.timerange(starts_at, ends_at) with &&
  ) where (draft_id is not null and group_id is not null);

alter table public.timetable_entries
  add constraint timetable_entries_version_room_no_overlap
  exclude using gist (
    version_id with =,
    room_id with =,
    day_of_week with =,
    public.timerange(starts_at, ends_at) with &&
  ) where (version_id is not null and room_id is not null);

alter table public.timetable_entries
  add constraint timetable_entries_version_lecturer_no_overlap
  exclude using gist (
    version_id with =,
    lecturer_id with =,
    day_of_week with =,
    public.timerange(starts_at, ends_at) with &&
  ) where (version_id is not null and lecturer_id is not null);

alter table public.timetable_entries
  add constraint timetable_entries_version_group_no_overlap
  exclude using gist (
    version_id with =,
    group_id with =,
    day_of_week with =,
    public.timerange(starts_at, ends_at) with &&
  ) where (version_id is not null and group_id is not null);

create index if not exists timetable_entries_draft_idx
  on public.timetable_entries (draft_id) where draft_id is not null;
create index if not exists timetable_entries_version_idx
  on public.timetable_entries (version_id) where version_id is not null;
create index if not exists timetable_entries_offering_idx
  on public.timetable_entries (offering_id) where offering_id is not null;
create index if not exists timetable_entries_room_idx
  on public.timetable_entries (room_id, day_of_week) where room_id is not null;

-- ---------------------------------------------------------------------------
-- Change requests
--   A lecturer asks for one published entry to move; an administrator reviews
--   it. Approval republishes a new version in the same transaction (OQ-036).
-- ---------------------------------------------------------------------------
create table if not exists public.timetable_change_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  entry_id uuid not null,
  requested_by uuid references auth.users (id) on delete set null,
  proposed jsonb not null,
  reason text not null check (char_length(btrim(reason)) between 4 and 300),
  status public.change_request_status not null default 'pending',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 300),
  created_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_change_requests_tenant_key unique (institution_id, id),
  constraint timetable_change_requests_entry_same_tenant
    foreign key (institution_id, entry_id)
    references public.timetable_entries (institution_id, id) on delete cascade,
  constraint timetable_change_requests_version_same_tenant
    foreign key (institution_id, created_version_id)
    references public.timetable_versions (institution_id, id)
);

-- One open request per entry; decided requests stay as history.
create unique index if not exists timetable_change_requests_one_open
  on public.timetable_change_requests (entry_id)
  where status = 'pending';

create index if not exists timetable_change_requests_status_idx
  on public.timetable_change_requests (institution_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Review and publish rights follow the academic scope helper: institution
-- administrators anywhere, faculty administrators inside their faculty,
-- department administrators inside their departments.
create or replace function public.auth_can_manage_timetables(
  p_institution uuid,
  p_department uuid default null,
  p_faculty uuid default null
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

  if p_department is not null then
    return public.can_manage_academic_unit(p_institution, null, p_department);
  end if;

  if p_faculty is not null then
    return public.can_manage_academic_unit(p_institution, p_faculty, null);
  end if;

  return v_role in ('institution_admin', 'faculty_admin');
end;
$$;

-- Entries are validated on write: the offering must belong to the container's
-- semester, the department follows the offering, and a scoped draft only
-- accepts entries inside its scope. Capacity, availability and calendar rules
-- are checked when publishing, because a draft is allowed to be incomplete.
create or replace function public.validate_timetable_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_semester uuid;
  v_draft_department uuid;
  v_draft_faculty uuid;
  v_offering_semester uuid;
  v_course_department uuid;
begin
  if tg_op = 'UPDATE' and old.version_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Published timetable entries are immutable. Publish a new version instead.';
  end if;

  if tg_op = 'DELETE' and old.version_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Published timetable entries are immutable. Publish a new version instead.';
  end if;

  if new.offering_id is not null then
    select o.semester_id, c.department_id
      into v_offering_semester, v_course_department
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where o.id = new.offering_id;

    if v_offering_semester is null then
      raise exception using
        errcode = 'P0001',
        message = 'Choose a course offering from this institution.';
    end if;

    new.department_id := v_course_department;
  end if;

  if new.draft_id is not null then
    select semester_id, department_id, faculty_id
      into v_semester, v_draft_department, v_draft_faculty
      from public.timetable_drafts
     where id = new.draft_id;

    if v_semester is null then
      raise exception using errcode = 'P0001', message = 'That draft no longer exists.';
    end if;

    -- A fixed entry in a department draft belongs to that department, so the
    -- publish scope can replace it instead of keeping a duplicate copy.
    if new.department_id is null and new.is_fixed and v_draft_department is not null then
      new.department_id := v_draft_department;
    end if;

    if v_draft_department is not null and new.department_id is distinct from v_draft_department then
      raise exception using
        errcode = 'P0001',
        message = 'This draft belongs to one department; choose one of its offerings.';
    end if;

    if v_draft_faculty is not null then
      if new.department_id is null then
        raise exception using
          errcode = 'P0001',
          message = 'A faculty draft needs an entry that belongs to one of its departments.';
      end if;
      if not exists (
        select 1 from public.departments d
        where d.id = new.department_id and d.faculty_id = v_draft_faculty
      ) then
        raise exception using
          errcode = 'P0001',
          message = 'This draft belongs to another faculty.';
      end if;
    end if;
  else
    select semester_id into v_semester
      from public.timetable_versions
     where id = new.version_id;
  end if;

  if v_offering_semester is not null and v_offering_semester <> v_semester then
    raise exception using
      errcode = 'P0001',
      message = 'That course offering belongs to a different semester.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_timetable_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Publishing
-- ---------------------------------------------------------------------------

-- The shared body, callable by the public wrappers and by change approval.
-- The previous live version's rows outside the draft's scope are copied into
-- the new version together with the draft's rows, so one transaction produces
-- a complete, internally consistent snapshot. The exclusion constraints over
-- version entries reject a cross-scope clash here.
create or replace function public.publish_timetable_draft_internal(
  p_draft_id uuid,
  p_publisher uuid,
  p_change_summary text,
  p_report jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.timetable_drafts;
  v_previous public.timetable_versions;
  v_version_id uuid;
  v_number integer;
  v_summary text;
begin
  select * into v_draft
    from public.timetable_drafts
   where id = p_draft_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'That timetable draft no longer exists.';
  end if;

  if v_draft.archived_at is not null or v_draft.status = 'archived' then
    raise exception using
      errcode = 'P0001',
      message = 'An archived draft cannot be published.';
  end if;

  select * into v_previous
    from public.timetable_versions
   where semester_id = v_draft.semester_id
     and status = 'published'
   for update;

  select coalesce(max(version_no), 0) + 1
    into v_number
    from public.timetable_versions
   where semester_id = v_draft.semester_id;

  v_summary := left(coalesce(nullif(btrim(p_change_summary), ''), 'Published timetable'), 300);

  -- The live-version index allows one `published` row per semester, so the
  -- outgoing version is retired inside the same transaction. A failure below
  -- rolls this update back with everything else.
  if v_previous.id is not null then
    update public.timetable_versions
       set status = 'superseded', updated_at = now()
     where id = v_previous.id;
  end if;

  insert into public.timetable_versions (
    institution_id, semester_id, draft_id, version_no, status,
    change_summary, validation_report, published_at, published_by
  ) values (
    v_draft.institution_id, v_draft.semester_id, v_draft.id, v_number, 'published',
    v_summary, coalesce(p_report, '{}'::jsonb), now(), p_publisher
  )
  returning id into v_version_id;

  if v_previous.id is not null then
    insert into public.timetable_entries (
      institution_id, version_id, department_id, offering_id, lecturer_id,
      room_id, group_id, day_of_week, starts_at, ends_at, is_fixed, notes
    )
    select
      e.institution_id, v_version_id, e.department_id, e.offering_id, e.lecturer_id,
      e.room_id, e.group_id, e.day_of_week, e.starts_at, e.ends_at, e.is_fixed, e.notes
    from public.timetable_entries e
    where e.version_id = v_previous.id
      and (
        case
          when v_draft.department_id is not null
            then e.department_id is distinct from v_draft.department_id
          when v_draft.faculty_id is not null
            then not exists (
              select 1 from public.departments d
              where d.id = e.department_id and d.faculty_id = v_draft.faculty_id
            )
          else false
        end
      );
  end if;

  insert into public.timetable_entries (
    institution_id, version_id, department_id, offering_id, lecturer_id,
    room_id, group_id, day_of_week, starts_at, ends_at, is_fixed, notes
  )
  select
    e.institution_id, v_version_id, e.department_id, e.offering_id, e.lecturer_id,
    e.room_id, e.group_id, e.day_of_week, e.starts_at, e.ends_at, e.is_fixed, e.notes
  from public.timetable_entries e
  where e.draft_id = v_draft.id;

  return v_version_id;
end;
$$;

create or replace function public.publish_timetable_draft(
  p_draft_id uuid,
  p_change_summary text default null,
  p_report jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.timetable_drafts;
begin
  select * into v_draft from public.timetable_drafts where id = p_draft_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'That timetable draft no longer exists.';
  end if;

  if not public.auth_can_manage_timetables(
    v_draft.institution_id, v_draft.department_id, v_draft.faculty_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'Your role cannot publish this timetable.';
  end if;

  return public.publish_timetable_draft_internal(
    p_draft_id, auth.uid(), p_change_summary, p_report
  );
end;
$$;

-- Archiving keeps the snapshot but marks it as retired history. The live
-- version cannot be archived: publish a replacement first.
create or replace function public.archive_timetable_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version public.timetable_versions;
begin
  select * into v_version from public.timetable_versions where id = p_version_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'That version no longer exists.';
  end if;

  if not public.auth_can_manage_timetables(v_version.institution_id, null, null)
     and not public.can_manage_academic_unit(v_version.institution_id, null, null)
     and public.auth_role(v_version.institution_id)
         not in ('institution_admin', 'faculty_admin', 'department_admin') then
    raise exception using errcode = '42501', message = 'Your role cannot archive a version.';
  end if;

  if v_version.status = 'published' then
    raise exception using
      errcode = 'P0001',
      message = 'Publish a replacement before archiving the current timetable.';
  end if;

  update public.timetable_versions
     set status = 'archived', archived_at = now(), updated_at = now()
   where id = p_version_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Duplicating a draft into another semester (FR-TT-004)
--   Records are re-matched by code, never by id: an offering by course,
--   lecturers by staff number, rooms and groups by code. Rows that cannot be
--   matched are reported and skipped rather than guessed (OQ-037).
-- ---------------------------------------------------------------------------
create or replace function public.duplicate_timetable_draft(
  p_draft_id uuid,
  p_semester_id uuid,
  p_title text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.timetable_drafts;
  v_semester public.semesters;
  v_new_draft uuid;
  v_entry public.timetable_entries;
  v_offering uuid;
  v_lecturer uuid;
  v_room uuid;
  v_group uuid;
  v_copied integer := 0;
  v_skipped jsonb := '[]'::jsonb;
begin
  select * into v_draft from public.timetable_drafts where id = p_draft_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'That timetable draft no longer exists.';
  end if;

  if not public.auth_can_manage_timetables(
    v_draft.institution_id, v_draft.department_id, v_draft.faculty_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'Your role cannot copy this timetable.';
  end if;

  select * into v_semester
    from public.semesters
   where id = p_semester_id and institution_id = v_draft.institution_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'Choose a semester in this institution.';
  end if;

  insert into public.timetable_drafts (
    institution_id, semester_id, department_id, faculty_id, title, status, created_by
  ) values (
    v_draft.institution_id, v_semester.id, v_draft.department_id, v_draft.faculty_id,
    left(coalesce(nullif(btrim(p_title), ''), v_draft.title || ' (copy)'), 120),
    'draft', auth.uid()
  )
  returning id into v_new_draft;

  for v_entry in
    select * from public.timetable_entries where draft_id = v_draft.id order by day_of_week, starts_at
  loop
    v_offering := null;
    v_lecturer := null;
    v_room := null;
    v_group := null;

    if v_entry.offering_id is not null then
      select o.id into v_offering
        from public.course_offerings o
        join public.course_offerings old on old.id = v_entry.offering_id
       where o.institution_id = v_draft.institution_id
         and o.semester_id = v_semester.id
         and o.course_id = old.course_id
         and o.archived_at is null
       limit 1;

      if v_offering is null then
        v_skipped := v_skipped || jsonb_build_object(
          'entry', v_entry.id,
          'reason', 'No offering for that course in the target semester.'
        );
        continue;
      end if;
    end if;

    if v_entry.lecturer_id is not null then
      select l.id into v_lecturer
        from public.lecturers l
        join public.lecturers old on old.id = v_entry.lecturer_id
       where l.institution_id = v_draft.institution_id
         and l.staff_number = old.staff_number
         and l.archived_at is null
       limit 1;

      if v_lecturer is null then
        v_skipped := v_skipped || jsonb_build_object(
          'entry', v_entry.id,
          'reason', 'The lecturer no longer exists.'
        );
        continue;
      end if;
    end if;

    if v_entry.room_id is not null then
      select r.id into v_room
        from public.rooms r
        join public.rooms old on old.id = v_entry.room_id
       where r.institution_id = v_draft.institution_id
         and r.code = old.code
         and r.archived_at is null
       limit 1;

      if v_room is null then
        v_skipped := v_skipped || jsonb_build_object(
          'entry', v_entry.id,
          'reason', 'The room no longer exists.'
        );
        continue;
      end if;
    end if;

    if v_entry.group_id is not null then
      select g.id into v_group
        from public.student_groups g
        join public.student_groups old on old.id = v_entry.group_id
       where g.institution_id = v_draft.institution_id
         and g.code = old.code
         and g.session_id = v_semester.session_id
         and g.archived_at is null
       limit 1;

      if v_group is null then
        v_skipped := v_skipped || jsonb_build_object(
          'entry', v_entry.id,
          'reason', 'The student group no longer exists in that session.'
        );
        continue;
      end if;
    end if;

    insert into public.timetable_entries (
      institution_id, draft_id, department_id, offering_id, lecturer_id,
      room_id, group_id, day_of_week, starts_at, ends_at, is_fixed, notes
    ) values (
      v_draft.institution_id, v_new_draft, v_entry.department_id, v_offering,
      v_lecturer, v_room, v_group, v_entry.day_of_week, v_entry.starts_at,
      v_entry.ends_at, v_entry.is_fixed, v_entry.notes
    );

    v_copied := v_copied + 1;
  end loop;

  return jsonb_build_object(
    'draft_id', v_new_draft,
    'copied', v_copied,
    'skipped', v_skipped
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Change requests
-- ---------------------------------------------------------------------------
create or replace function public.submit_timetable_change_request(
  p_entry_id uuid,
  p_proposed jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.timetable_entries;
  v_version public.timetable_versions;
  v_is_lecturer boolean;
  v_request uuid;
begin
  select * into v_entry from public.timetable_entries where id = p_entry_id;

  if not found or v_entry.version_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Only published timetable entries can be changed this way.';
  end if;

  select * into v_version from public.timetable_versions where id = v_entry.version_id;

  if v_version.status <> 'published' then
    raise exception using
      errcode = 'P0001',
      message = 'That entry belongs to a superseded version. Ask about the current timetable.';
  end if;

  select exists (
    select 1 from public.lecturers l
    where l.id = v_entry.lecturer_id and l.user_id = auth.uid()
  ) into v_is_lecturer;

  if not v_is_lecturer
     and not public.auth_can_manage_timetables(v_entry.institution_id, v_entry.department_id, null) then
    raise exception using
      errcode = '42501',
      message = 'You can only request changes to your own timetable.';
  end if;

  if v_entry.department_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Institution-wide entries are changed directly by an administrator.';
  end if;

  if coalesce(p_proposed, '{}'::jsonb) = '{}'::jsonb then
    raise exception using errcode = 'P0001', message = 'Propose at least one change.';
  end if;

  insert into public.timetable_change_requests (
    institution_id, entry_id, requested_by, proposed, reason
  ) values (
    v_entry.institution_id, v_entry.id, auth.uid(), p_proposed,
    left(btrim(coalesce(p_reason, '')), 300)
  )
  returning id into v_request;

  return v_request;
end;
$$;

-- Approving applies the proposal to a fresh department draft of the current
-- live version and publishes it in one transaction (OQ-036). Rejecting keeps
-- the request as history with the reviewer's note.
create or replace function public.review_timetable_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.timetable_change_requests;
  v_entry public.timetable_entries;
  v_live public.timetable_versions;
  v_draft uuid;
  v_version uuid;
  v_day smallint;
  v_start time;
  v_end time;
  v_room uuid;
  v_lecturer uuid;
begin
  select * into v_request
    from public.timetable_change_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'That change request no longer exists.';
  end if;

  if v_request.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'That change request has already been reviewed.';
  end if;

  select * into v_entry from public.timetable_entries where id = v_request.entry_id;
  select * into v_live from public.timetable_versions where id = v_entry.version_id;

  if v_live.status <> 'published' then
    raise exception using
      errcode = 'P0001',
      message = 'The timetable changed since this request was made. Ask for a new request.';
  end if;

  if not public.auth_can_manage_timetables(v_entry.institution_id, v_entry.department_id, null) then
    raise exception using
      errcode = '42501',
      message = 'Your role cannot review this change request.';
  end if;

  if not coalesce(p_approve, false) then
    update public.timetable_change_requests
       set status = 'rejected',
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           review_note = left(nullif(btrim(coalesce(p_note, '')), ''), 300),
           updated_at = now()
     where id = p_request_id;
    return null;
  end if;

  v_day := coalesce((v_request.proposed ->> 'day_of_week')::smallint, v_entry.day_of_week);
  v_start := coalesce((v_request.proposed ->> 'starts_at')::time, v_entry.starts_at);
  v_end := coalesce((v_request.proposed ->> 'ends_at')::time, v_entry.ends_at);
  v_room := coalesce(nullif(v_request.proposed ->> 'room_id', '')::uuid, v_entry.room_id);
  v_lecturer := coalesce(nullif(v_request.proposed ->> 'lecturer_id', '')::uuid, v_entry.lecturer_id);

  insert into public.timetable_drafts (
    institution_id, semester_id, department_id, title, status, created_by
  ) values (
    v_entry.institution_id, v_live.semester_id, v_entry.department_id,
    'Change ' || left(v_request.id::text, 8), 'draft', auth.uid()
  )
  returning id into v_draft;

  insert into public.timetable_entries (
    institution_id, draft_id, department_id, offering_id, lecturer_id,
    room_id, group_id, day_of_week, starts_at, ends_at, is_fixed, notes
  )
  select
    e.institution_id, v_draft, e.department_id, e.offering_id,
    case when e.id = v_entry.id then v_lecturer else e.lecturer_id end,
    case when e.id = v_entry.id then v_room else e.room_id end,
    e.group_id,
    case when e.id = v_entry.id then v_day else e.day_of_week end,
    case when e.id = v_entry.id then v_start else e.starts_at end,
    case when e.id = v_entry.id then v_end else e.ends_at end,
    e.is_fixed, e.notes
  from public.timetable_entries e
  where e.version_id = v_live.id
    and e.department_id = v_entry.department_id;

  v_version := public.publish_timetable_draft_internal(
    v_draft,
    auth.uid(),
    'Change request: ' || left(v_request.reason, 250),
    jsonb_build_object('change_request', v_request.id)
  );

  -- The internal draft is a record of the change, not an active workspace.
  update public.timetable_drafts
     set status = 'archived', archived_at = now(), updated_at = now()
   where id = v_draft;

  update public.timetable_change_requests
     set status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = left(nullif(btrim(coalesce(p_note, '')), ''), 300),
         created_version_id = v_version,
         updated_at = now()
   where id = p_request_id;

  return v_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity logging
-- ---------------------------------------------------------------------------
create or replace function public.log_timetable_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity text := tg_table_name;
  v_action text;
  v_summary text;
begin
  if tg_op = 'INSERT' then
    v_action := 'created';
  elsif tg_op = 'UPDATE' then
    v_action := 'updated';
  else
    v_action := 'deleted';
  end if;

  if tg_table_name = 'timetable_versions' and tg_op = 'INSERT' then
    v_action := 'published';
  elsif tg_table_name = 'timetable_change_requests' then
    v_action := coalesce((to_jsonb(new) ->> 'status'), 'updated');
  end if;

  v_summary := case tg_table_name
    when 'timetable_drafts' then 'Timetable draft ' || v_action
    when 'timetable_versions' then 'Timetable version ' || v_action
    when 'timetable_change_requests' then 'Timetable change request ' || v_action
    else 'Timetable entry ' || v_action
  end;

  insert into public.institution_activity (institution_id, actor_id, action, summary, metadata)
  values (
    (to_jsonb(new) ->> 'institution_id')::uuid,
    auth.uid(),
    'timetable.'
      || trim(trailing 's' from replace(v_entity, 'timetable_', ''))
      || '.' || v_action,
    v_summary,
    jsonb_build_object('entity', v_entity, 'id', to_jsonb(new) ->> 'id')
  );

  return new;
end;
$$;

drop trigger if exists timetable_drafts_log_event on public.timetable_drafts;
create trigger timetable_drafts_log_event
  after insert or update on public.timetable_drafts
  for each row execute function public.log_timetable_event();

drop trigger if exists timetable_versions_log_event on public.timetable_versions;
create trigger timetable_versions_log_event
  after insert or update on public.timetable_versions
  for each row execute function public.log_timetable_event();

drop trigger if exists timetable_change_requests_log_event on public.timetable_change_requests;
create trigger timetable_change_requests_log_event
  after insert or update on public.timetable_change_requests
  for each row execute function public.log_timetable_event();

drop trigger if exists timetable_entries_validate on public.timetable_entries;
create trigger timetable_entries_validate
  before insert or update on public.timetable_entries
  for each row execute function public.validate_timetable_entry();

drop trigger if exists timetable_versions_set_updated_at on public.timetable_versions;
create trigger timetable_versions_set_updated_at
  before update on public.timetable_versions
  for each row execute function public.set_timetable_updated_at();

drop trigger if exists timetable_change_requests_set_updated_at on public.timetable_change_requests;
create trigger timetable_change_requests_set_updated_at
  before update on public.timetable_change_requests
  for each row execute function public.set_timetable_updated_at();

drop trigger if exists timetable_drafts_set_updated_at on public.timetable_drafts;
create trigger timetable_drafts_set_updated_at
  before update on public.timetable_drafts
  for each row execute function public.set_timetable_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.timetable_drafts enable row level security;
alter table public.timetable_versions enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.timetable_change_requests enable row level security;

drop policy if exists timetable_drafts_select on public.timetable_drafts;
drop policy if exists timetable_drafts_insert on public.timetable_drafts;
drop policy if exists timetable_drafts_update on public.timetable_drafts;

-- Drafts are working documents: only people who may manage timetables in the
-- draft's scope see them.
create policy timetable_drafts_select on public.timetable_drafts
  for select using (
    institution_id in (select * from public.auth_institution_ids())
    and public.auth_can_manage_timetables(institution_id, department_id, faculty_id)
  );

create policy timetable_drafts_insert on public.timetable_drafts
  for insert with check (
    institution_id in (select * from public.auth_institution_ids())
    and public.auth_can_manage_timetables(institution_id, department_id, faculty_id)
  );

create policy timetable_drafts_update on public.timetable_drafts
  for update
  using (
    institution_id in (select * from public.auth_institution_ids())
    and public.auth_can_manage_timetables(institution_id, department_id, faculty_id)
  )
  with check (
    institution_id in (select * from public.auth_institution_ids())
    and public.auth_can_manage_timetables(institution_id, department_id, faculty_id)
  );

drop policy if exists timetable_versions_select on public.timetable_versions;

-- Everyone in the tenant reads the live version. History is for the people
-- who manage timetables (FR-TT-007, FR-TT-011).
create policy timetable_versions_select on public.timetable_versions
  for select using (
    institution_id in (select * from public.auth_institution_ids())
    and (
      status = 'published'
      or public.auth_role(institution_id)
         in ('institution_admin', 'faculty_admin', 'department_admin')
    )
  );

drop policy if exists timetable_entries_select on public.timetable_entries;
drop policy if exists timetable_entries_insert on public.timetable_entries;
drop policy if exists timetable_entries_update on public.timetable_entries;
drop policy if exists timetable_entries_delete on public.timetable_entries;

create policy timetable_entries_select on public.timetable_entries
  for select using (
    institution_id in (select * from public.auth_institution_ids())
    and (
      (
        version_id is not null
        and exists (
          select 1 from public.timetable_versions v
          where v.id = version_id
            and (
              v.status = 'published'
              or public.auth_role(v.institution_id)
                 in ('institution_admin', 'faculty_admin', 'department_admin')
            )
        )
      )
      or (
        draft_id is not null
        and exists (
          select 1 from public.timetable_drafts d
          where d.id = draft_id
            and public.auth_can_manage_timetables(d.institution_id, d.department_id, d.faculty_id)
        )
      )
    )
  );

create policy timetable_entries_insert on public.timetable_entries
  for insert with check (
    draft_id is not null
    and institution_id in (select * from public.auth_institution_ids())
    and exists (
      select 1 from public.timetable_drafts d
      where d.id = draft_id
        and d.status <> 'archived'
        and d.archived_at is null
        and public.auth_can_manage_timetables(d.institution_id, d.department_id, d.faculty_id)
    )
  );

create policy timetable_entries_update on public.timetable_entries
  for update
  using (
    draft_id is not null
    and exists (
      select 1 from public.timetable_drafts d
      where d.id = draft_id
        and d.status <> 'archived'
        and public.auth_can_manage_timetables(d.institution_id, d.department_id, d.faculty_id)
    )
  )
  with check (
    draft_id is not null
    and exists (
      select 1 from public.timetable_drafts d
      where d.id = draft_id
        and d.status <> 'archived'
        and public.auth_can_manage_timetables(d.institution_id, d.department_id, d.faculty_id)
    )
  );

create policy timetable_entries_delete on public.timetable_entries
  for delete using (
    draft_id is not null
    and exists (
      select 1 from public.timetable_drafts d
      where d.id = draft_id
        and d.status <> 'archived'
        and public.auth_can_manage_timetables(d.institution_id, d.department_id, d.faculty_id)
    )
  );

drop policy if exists timetable_change_requests_select on public.timetable_change_requests;

create policy timetable_change_requests_select on public.timetable_change_requests
  for select using (
    institution_id in (select * from public.auth_institution_ids())
    and (
      requested_by = auth.uid()
      or exists (
        select 1 from public.timetable_entries e
        where e.id = entry_id
          and public.auth_can_manage_timetables(e.institution_id, e.department_id, null)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
--   Versions and change requests are written only through the definer
--   functions above; authenticated users get SELECT and function EXECUTE.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.timetable_drafts to authenticated;
grant select on public.timetable_versions to authenticated;
grant select, insert, update, delete on public.timetable_entries to authenticated;
grant select on public.timetable_change_requests to authenticated;

revoke all on function public.auth_can_manage_timetables(uuid, uuid, uuid) from public;
revoke all on function public.publish_timetable_draft(uuid, text, jsonb) from public;
revoke all on function public.publish_timetable_draft_internal(uuid, uuid, text, jsonb) from public;
revoke all on function public.archive_timetable_version(uuid) from public;
revoke all on function public.duplicate_timetable_draft(uuid, uuid, text) from public;
revoke all on function public.submit_timetable_change_request(uuid, jsonb, text) from public;
revoke all on function public.review_timetable_change_request(uuid, boolean, text) from public;

grant execute on function public.auth_can_manage_timetables(uuid, uuid, uuid) to authenticated;
grant execute on function public.publish_timetable_draft(uuid, text, jsonb) to authenticated;
grant execute on function public.archive_timetable_version(uuid) to authenticated;
grant execute on function public.duplicate_timetable_draft(uuid, uuid, text) to authenticated;
grant execute on function public.submit_timetable_change_request(uuid, jsonb, text) to authenticated;
grant execute on function public.review_timetable_change_request(uuid, boolean, text) to authenticated;
