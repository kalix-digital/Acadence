-- Acadence · Phase 5 · Classrooms and facilities
--
-- Decisions this migration implements (ASSUMPTIONS_REGISTER OQ-014, OQ-026 … OQ-030)
--   * Bookings are auto-approved within scope: a caller with facilities rights
--     confirms a slot immediately, and the only hard rule is that two confirmed
--     bookings never overlap in one room.
--   * Classrooms, lecture halls, laboratories, studios and seminar rooms share
--     one `rooms` table with a `room_type` enum. The vocabulary is identical to
--     `courses.required_room_type`, so suitability checks need no mapping.
--   * A building always belongs to a campus. The application creates a "Main
--     campus" the first time an institution adds a building without one.
--   * Features and equipment live in an institution-managed catalogue linked to
--     rooms through `room_feature_links`, optionally with a quantity.
--   * Availability is a set of weekly windows per room per semester. A booking
--     must fit inside one of them; a room with no window in a semester is not
--     bookable, which is what makes the utilisation denominator meaningful.
--   * One row per booking. A weekly series is expanded by the caller into
--     individual rows, so overlap, cancellation and reporting all see plain
--     intervals. Booking times are institution wall-clock timestamps.
--
-- Same invariants as Phases 4 and 4b: composite (institution_id, id) foreign
-- keys, archive instead of delete, definer scope helpers, activity logging.

-- Needed for the room + time exclusion constraint on bookings.
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Status vocabularies
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'room_type') then
    create type public.room_type as enum (
      'classroom', 'lecture_hall', 'laboratory', 'studio', 'seminar'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum ('confirmed', 'cancelled');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Buildings
--   A building always sits on a campus. The application creates a default
--   "Main campus" when an institution has none yet, so single-site tenants are
--   never blocked by a setup step they did not ask for.
-- ---------------------------------------------------------------------------
create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  campus_id uuid not null,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$'),
  address text check (address is null or char_length(address) <= 300),
  notes text check (notes is null or char_length(notes) <= 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildings_code_unique unique (institution_id, code),
  constraint buildings_tenant_key unique (institution_id, id),
  constraint buildings_campus_same_tenant
    foreign key (institution_id, campus_id)
    references public.campuses (institution_id, id)
);

-- ---------------------------------------------------------------------------
-- Rooms
--   One table for every room type; `room_type` uses the same vocabulary as
--   courses.required_room_type.
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  building_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$'),
  room_type public.room_type not null default 'classroom',
  capacity smallint not null check (capacity between 1 and 5000),
  floor text check (floor is null or char_length(floor) <= 40),
  accessibility_notes text check (accessibility_notes is null or char_length(accessibility_notes) <= 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_code_unique unique (institution_id, code),
  constraint rooms_tenant_key unique (institution_id, id),
  constraint rooms_building_same_tenant
    foreign key (institution_id, building_id)
    references public.buildings (institution_id, id)
);

-- ---------------------------------------------------------------------------
-- Feature catalogue
--   Institutions name their own features ("Projector", "Lab benches") so the
--   list is queryable for suitability checks instead of a free-text note.
-- ---------------------------------------------------------------------------
create table if not exists public.room_features (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  category text not null default 'equipment'
    check (category in ('equipment', 'accessibility', 'layout', 'other')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_features_tenant_key unique (institution_id, id)
);

-- One feature name per institution, ignoring case; an archived feature frees
-- its name so it can be re-created later.
create unique index if not exists room_features_name_unique
  on public.room_features (institution_id, lower(name))
  where archived_at is null;

create table if not exists public.room_feature_links (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  room_id uuid not null,
  feature_id uuid not null,
  quantity smallint check (quantity is null or quantity between 1 and 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_feature_links_tenant_key unique (institution_id, id),
  constraint room_feature_links_room_same_tenant
    foreign key (institution_id, room_id)
    references public.rooms (institution_id, id) on delete cascade,
  constraint room_feature_links_feature_same_tenant
    foreign key (institution_id, feature_id)
    references public.room_features (institution_id, id) on delete cascade
);

create unique index if not exists room_feature_links_unique
  on public.room_feature_links (room_id, feature_id)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Availability
--   Weekly windows per room per semester. day_of_week follows ISO-8601
--   (1 = Monday … 7 = Sunday). Windows of one room may not overlap on the same
--   day, so "is this room open then?" has exactly one answer.
-- ---------------------------------------------------------------------------
create table if not exists public.room_availability (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  room_id uuid not null,
  semester_id uuid not null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_availability_tenant_key unique (institution_id, id),
  constraint room_availability_window check (closes_at > opens_at),
  constraint room_availability_room_same_tenant
    foreign key (institution_id, room_id)
    references public.rooms (institution_id, id) on delete cascade,
  constraint room_availability_semester_same_tenant
    foreign key (institution_id, semester_id)
    references public.semesters (institution_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Bookings
--   Ad-hoc room use, recorded separately from published timetable entries
--   (which arrive in Phase 6). Auto-approved within scope (OQ-014).
--
--   `starts_at`/`ends_at` are institution wall-clock timestamps: a 09:00 class
--   stays 09:00 whatever the server's timezone is.
--
--   The exclusion constraint is the hard rule for FR-ROOM-004: two confirmed
--   bookings can never overlap in one room, including under concurrency, and a
--   cancelled booking stops reserving its slot.
-- ---------------------------------------------------------------------------
create table if not exists public.room_bookings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  room_id uuid not null,
  semester_id uuid not null,
  department_id uuid,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  purpose text check (purpose is null or char_length(purpose) <= 300),
  starts_at timestamp not null,
  ends_at timestamp not null,
  expected_attendees smallint not null check (expected_attendees between 1 and 5000),
  status public.booking_status not null default 'confirmed',
  booked_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_bookings_tenant_key unique (institution_id, id),
  constraint room_bookings_window check (ends_at > starts_at),
  constraint room_bookings_room_same_tenant
    foreign key (institution_id, room_id)
    references public.rooms (institution_id, id),
  constraint room_bookings_semester_same_tenant
    foreign key (institution_id, semester_id)
    references public.semesters (institution_id, id),
  constraint room_bookings_department_same_tenant
    foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'room_bookings_no_overlap'
  ) then
    alter table public.room_bookings
      add constraint room_bookings_no_overlap
      exclude using gist (
        room_id with =,
        tsrange(starts_at, ends_at, '[)') with &&
      ) where (status = 'confirmed');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists buildings_institution_idx
  on public.buildings (institution_id, name);
create index if not exists buildings_campus_idx
  on public.buildings (campus_id);
create index if not exists rooms_institution_idx
  on public.rooms (institution_id, name);
create index if not exists rooms_building_idx
  on public.rooms (building_id);
create index if not exists room_features_institution_idx
  on public.room_features (institution_id, category, name);
create index if not exists room_feature_links_feature_idx
  on public.room_feature_links (feature_id);
create index if not exists room_availability_room_idx
  on public.room_availability (room_id, semester_id, day_of_week);
create index if not exists room_availability_semester_idx
  on public.room_availability (semester_id);
create index if not exists room_bookings_room_idx
  on public.room_bookings (room_id, starts_at);
create index if not exists room_bookings_semester_idx
  on public.room_bookings (semester_id, starts_at);
create index if not exists room_bookings_department_idx
  on public.room_bookings (department_id) where department_id is not null;

-- ---------------------------------------------------------------------------
-- Scope helpers
--   Facilities are institution-wide, so faculty administrators manage them
--   alongside institution administrators (both already hold manage_facilities in
--   src/lib/auth/capabilities.ts). Department administrators do not manage
--   rooms, but they may book them for their own department.
-- ---------------------------------------------------------------------------
create or replace function public.auth_can_manage_facilities(p_institution uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role(p_institution) in ('institution_admin', 'faculty_admin');
$$;

revoke all on function public.auth_can_manage_facilities(uuid) from public, anon;
grant execute on function public.auth_can_manage_facilities(uuid)
  to authenticated, service_role;

create or replace function public.room_capacity(p_room uuid)
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select capacity from public.rooms where id = p_room;
$$;

revoke all on function public.room_capacity(uuid) from public, anon;
grant execute on function public.room_capacity(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Domain rules enforced in the database
-- ---------------------------------------------------------------------------

-- Availability windows of one room may not overlap on the same day.
create or replace function public.check_room_availability_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is not null then
    return new;
  end if;

  if exists (
    select 1
    from public.room_availability a
    where a.room_id = new.room_id
      and a.semester_id = new.semester_id
      and a.day_of_week = new.day_of_week
      and a.archived_at is null
      and a.id <> new.id
      and a.opens_at < new.closes_at
      and a.closes_at > new.opens_at
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'This room already has an availability window that overlaps that time.';
  end if;

  return new;
end;
$$;

-- A confirmed booking must fit the room, the semester and an availability
-- window. Overlap between bookings is handled by the exclusion constraint, not
-- here, so it also holds under concurrency.
create or replace function public.validate_room_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity smallint;
  v_archived timestamptz;
  v_teaching_start date;
  v_exam_end date;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select capacity, archived_at
    into v_capacity, v_archived
    from public.rooms
   where id = new.room_id
     and institution_id = new.institution_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'That room does not belong to this institution.';
  end if;

  if v_archived is not null then
    raise exception using
      errcode = 'P0001',
      message = 'That room is archived and cannot be booked.';
  end if;

  if new.expected_attendees > v_capacity then
    raise exception using
      errcode = 'P0001',
      message = format(
        'Room capacity is %s seats, but this booking expects %s attendees.',
        v_capacity, new.expected_attendees
      );
  end if;

  if new.starts_at::date <> new.ends_at::date then
    raise exception using
      errcode = 'P0001',
      message = 'A booking must start and end on the same day.';
  end if;

  select teaching_starts_on, exam_ends_on
    into v_teaching_start, v_exam_end
    from public.semesters
   where id = new.semester_id
     and institution_id = new.institution_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'That semester does not belong to this institution.';
  end if;

  if new.starts_at::date < v_teaching_start or new.ends_at::date > v_exam_end then
    raise exception using
      errcode = 'P0001',
      message = 'The booking must fall inside the semester.';
  end if;

  if not exists (
    select 1
    from public.room_availability a
    where a.room_id = new.room_id
      and a.semester_id = new.semester_id
      and a.archived_at is null
      and a.day_of_week = extract(isodow from new.starts_at)::smallint
      and a.opens_at <= new.starts_at::time
      and a.closes_at >= new.ends_at::time
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'The room is not available at that time. Add an availability window first.';
  end if;

  return new;
end;
$$;

-- Retiring a room with upcoming bookings, or shrinking it below a booking that
-- is already confirmed, would leave the data contradicting itself.
create or replace function public.guard_room_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    if exists (
      select 1
      from public.room_bookings b
      where b.room_id = new.id
        and b.status = 'confirmed'
        and b.ends_at > (now() at time zone 'UTC')
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'Cancel the upcoming bookings for this room before archiving it.';
    end if;
  end if;

  if new.capacity < old.capacity then
    if exists (
      select 1
      from public.room_bookings b
      where b.room_id = new.id
        and b.status = 'confirmed'
        and b.expected_attendees > new.capacity
    ) then
      raise exception using
        errcode = 'P0001',
        message = format(
          'An existing booking expects more than %s attendees. Cancel it before shrinking the room.',
          new.capacity
        );
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists buildings_set_updated_at on public.buildings;
create trigger buildings_set_updated_at
  before update on public.buildings
  for each row execute function public.set_updated_at();

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

drop trigger if exists room_features_set_updated_at on public.room_features;
create trigger room_features_set_updated_at
  before update on public.room_features
  for each row execute function public.set_updated_at();

drop trigger if exists room_feature_links_set_updated_at on public.room_feature_links;
create trigger room_feature_links_set_updated_at
  before update on public.room_feature_links
  for each row execute function public.set_updated_at();

drop trigger if exists room_availability_set_updated_at on public.room_availability;
create trigger room_availability_set_updated_at
  before update on public.room_availability
  for each row execute function public.set_updated_at();

drop trigger if exists room_bookings_set_updated_at on public.room_bookings;
create trigger room_bookings_set_updated_at
  before update on public.room_bookings
  for each row execute function public.set_updated_at();

drop trigger if exists room_availability_check_window on public.room_availability;
create trigger room_availability_check_window
  before insert or update on public.room_availability
  for each row execute function public.check_room_availability_window();

drop trigger if exists room_bookings_validate on public.room_bookings;
create trigger room_bookings_validate
  before insert or update on public.room_bookings
  for each row execute function public.validate_room_booking();

drop trigger if exists rooms_guard_changes on public.rooms;
create trigger rooms_guard_changes
  before update on public.rooms
  for each row execute function public.guard_room_changes();

-- ---------------------------------------------------------------------------
-- Activity logging
-- ---------------------------------------------------------------------------
create or replace function public.log_facilities_event()
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
  v_before jsonb;
begin
  v_entity := case tg_table_name
    when 'buildings' then 'building'
    when 'rooms' then 'room'
    when 'room_features' then 'room_feature'
    when 'room_feature_links' then 'room_feature_link'
    when 'room_availability' then 'room_availability'
    when 'room_bookings' then 'booking'
    else tg_table_name
  end;

  v_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_before := case when tg_op = 'DELETE' then null else to_jsonb(old) end;
  v_institution := (v_record ->> 'institution_id')::uuid;
  v_label := coalesce(
    v_record ->> 'name',
    v_record ->> 'code',
    v_record ->> 'title',
    'record'
  );

  v_action := case
    when tg_op = 'INSERT' then 'facilities.' || v_entity || '.created'
    when tg_op = 'DELETE' then 'facilities.' || v_entity || '.deleted'
    when v_entity = 'booking' and (v_record ->> 'status') = 'cancelled'
         and coalesce(v_before ->> 'status', 'confirmed') <> 'cancelled'
      then 'facilities.booking.cancelled'
    when (v_record ->> 'archived_at') is not null
         and (v_before ->> 'archived_at') is null
      then 'facilities.' || v_entity || '.archived'
    when (v_record ->> 'archived_at') is null
         and (v_before ->> 'archived_at') is not null
      then 'facilities.' || v_entity || '.restored'
    else 'facilities.' || v_entity || '.updated'
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

drop trigger if exists buildings_log_event on public.buildings;
create trigger buildings_log_event
  after insert or update or delete on public.buildings
  for each row execute function public.log_facilities_event();

drop trigger if exists rooms_log_event on public.rooms;
create trigger rooms_log_event
  after insert or update or delete on public.rooms
  for each row execute function public.log_facilities_event();

drop trigger if exists room_features_log_event on public.room_features;
create trigger room_features_log_event
  after insert or update or delete on public.room_features
  for each row execute function public.log_facilities_event();

drop trigger if exists room_feature_links_log_event on public.room_feature_links;
create trigger room_feature_links_log_event
  after insert or update or delete on public.room_feature_links
  for each row execute function public.log_facilities_event();

drop trigger if exists room_availability_log_event on public.room_availability;
create trigger room_availability_log_event
  after insert or update or delete on public.room_availability
  for each row execute function public.log_facilities_event();

drop trigger if exists room_bookings_log_event on public.room_bookings;
create trigger room_bookings_log_event
  after insert or update or delete on public.room_bookings
  for each row execute function public.log_facilities_event();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Read: any active member of the institution.
--   Manage buildings, rooms, features and availability: institution and faculty
--   administrators (auth_can_manage_facilities).
--   Bookings: the same, plus department administrators for their own department.
--   No DELETE policy and no DELETE grant anywhere.
-- ---------------------------------------------------------------------------
alter table public.buildings enable row level security;
alter table public.rooms enable row level security;
alter table public.room_features enable row level security;
alter table public.room_feature_links enable row level security;
alter table public.room_availability enable row level security;
alter table public.room_bookings enable row level security;

-- buildings
drop policy if exists buildings_select on public.buildings;
create policy buildings_select on public.buildings
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists buildings_insert on public.buildings;
create policy buildings_insert on public.buildings
  for insert to authenticated
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

drop policy if exists buildings_update on public.buildings;
create policy buildings_update on public.buildings
  for update to authenticated
  using (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id))
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

-- rooms
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms
  for insert to authenticated
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

drop policy if exists rooms_update on public.rooms;
create policy rooms_update on public.rooms
  for update to authenticated
  using (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id))
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

-- room_features
drop policy if exists room_features_select on public.room_features;
create policy room_features_select on public.room_features
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists room_features_insert on public.room_features;
create policy room_features_insert on public.room_features
  for insert to authenticated
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

drop policy if exists room_features_update on public.room_features;
create policy room_features_update on public.room_features
  for update to authenticated
  using (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id))
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

-- room_feature_links
drop policy if exists room_feature_links_select on public.room_feature_links;
create policy room_feature_links_select on public.room_feature_links
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists room_feature_links_insert on public.room_feature_links;
create policy room_feature_links_insert on public.room_feature_links
  for insert to authenticated
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

drop policy if exists room_feature_links_update on public.room_feature_links;
create policy room_feature_links_update on public.room_feature_links
  for update to authenticated
  using (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id))
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

-- room_availability
drop policy if exists room_availability_select on public.room_availability;
create policy room_availability_select on public.room_availability
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists room_availability_insert on public.room_availability;
create policy room_availability_insert on public.room_availability
  for insert to authenticated
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

drop policy if exists room_availability_update on public.room_availability;
create policy room_availability_update on public.room_availability
  for update to authenticated
  using (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id))
  with check (public.is_platform_admin() or public.auth_can_manage_facilities(institution_id));

-- room_bookings
drop policy if exists room_bookings_select on public.room_bookings;
create policy room_bookings_select on public.room_bookings
  for select to authenticated
  using (public.is_platform_admin() or institution_id in (select public.auth_institution_ids()));

drop policy if exists room_bookings_insert on public.room_bookings;
create policy room_bookings_insert on public.room_bookings
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.auth_can_manage_facilities(institution_id)
    or (
      department_id is not null
      and department_id in (select public.auth_department_ids(institution_id))
    )
  );

drop policy if exists room_bookings_update on public.room_bookings;
create policy room_bookings_update on public.room_bookings
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.auth_can_manage_facilities(institution_id)
    or (
      department_id is not null
      and department_id in (select public.auth_department_ids(institution_id))
    )
  )
  with check (
    public.is_platform_admin()
    or public.auth_can_manage_facilities(institution_id)
    or (
      department_id is not null
      and department_id in (select public.auth_department_ids(institution_id))
    )
  );

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant select, insert, update on public.buildings, public.rooms,
  public.room_features, public.room_feature_links, public.room_availability,
  public.room_bookings
  to authenticated;

grant all on public.buildings, public.rooms,
  public.room_features, public.room_feature_links, public.room_availability,
  public.room_bookings
  to service_role;

revoke all on public.buildings, public.rooms,
  public.room_features, public.room_feature_links, public.room_availability,
  public.room_bookings
  from anon;
