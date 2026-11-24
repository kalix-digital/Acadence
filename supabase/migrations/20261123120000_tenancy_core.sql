-- Acadence · Phase 2 · Tenancy core
-- Institutions, profiles, memberships and the tenant helper functions used by RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerated types (idempotent: safe to re-run in development)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'institution_status') then
    create type public.institution_status as enum ('pending', 'active', 'suspended', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type public.membership_role as enum (
      'platform_admin', 'support_operator', 'institution_admin',
      'faculty_admin', 'department_admin', 'lecturer', 'student'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('invited', 'active', 'suspended', 'revoked');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Institutions
-- ---------------------------------------------------------------------------
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
  type text not null default 'university',
  status public.institution_status not null default 'pending',
  logo_url text,
  brand_primary text,
  brand_accent text,
  timezone text not null default 'Africa/Lagos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_slug_key unique (slug)
);

create trigger institutions_set_updated_at
  before update on public.institutions
  for each row execute function public.set_updated_at();

-- Phase 3 owns the full settings surface; these defaults are required now so
-- scheduling behaviour is never hardcoded later.
create table if not exists public.institution_settings (
  institution_id uuid primary key references public.institutions (id) on delete cascade,
  working_days smallint[] not null default '{1,2,3,4,5}',
  slot_minutes smallint not null default 60 check (slot_minutes between 30 and 180),
  day_starts_at time not null default '08:00',
  day_ends_at time not null default '18:00',
  default_max_contact_hours smallint not null default 20 check (default_max_contact_hours > 0),
  allow_teaching_in_exams boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settings_day_range check (day_ends_at > day_starts_at),
  constraint settings_working_days check (
    working_days <@ array[1,2,3,4,5,6,7]::smallint[] and array_length(working_days, 1) between 1 and 7
  )
);

create trigger institution_settings_set_updated_at
  before update on public.institution_settings
  for each row execute function public.set_updated_at();

create or replace function public.create_institution_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.institution_settings (institution_id)
  values (new.id)
  on conflict (institution_id) do nothing;
  return new;
end;
$$;

create trigger institutions_create_settings
  after insert on public.institutions
  for each row execute function public.create_institution_settings();

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user; roles live in memberships, never here)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Institution memberships (the authoritative role record)
-- ---------------------------------------------------------------------------
create table if not exists public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null,
  faculty_id uuid,
  department_id uuid,
  status public.membership_status not null default 'invited',
  invited_email text,
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_single_scope check (faculty_id is null or department_id is null),
  constraint memberships_institution_required check (
    (role = 'platform_admin' and institution_id is null and faculty_id is null and department_id is null)
    or (role <> 'platform_admin' and institution_id is not null)
  ),
  constraint memberships_unique_member unique (institution_id, user_id)
);

-- Exactly one platform membership per user; partial index because NULL
-- institution_id would not participate in the unique constraint above.
create unique index if not exists memberships_one_platform_role
  on public.institution_memberships (user_id)
  where role = 'platform_admin';

create index if not exists memberships_user_idx
  on public.institution_memberships (user_id);
create index if not exists memberships_institution_role_idx
  on public.institution_memberships (institution_id, role);
create index if not exists memberships_invited_email_idx
  on public.institution_memberships (lower(invited_email))
  where status = 'invited';

create trigger institution_memberships_set_updated_at
  before update on public.institution_memberships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tenant helpers (SECURITY DEFINER so policies never recurse through RLS)
-- ---------------------------------------------------------------------------
create or replace function public.auth_institution_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select institution_id
  from public.institution_memberships
  where user_id = (select auth.uid())
    and status = 'active'
    and institution_id is not null;
$$;

create or replace function public.auth_role(p_institution uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.institution_memberships
  where user_id = (select auth.uid())
    and institution_id = p_institution
    and status = 'active'
  limit 1;
$$;

create or replace function public.auth_department_ids(p_institution uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id
  from public.institution_memberships
  where user_id = (select auth.uid())
    and institution_id = p_institution
    and status = 'active'
    and department_id is not null;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.institution_memberships
    where user_id = (select auth.uid())
      and role = 'platform_admin'
      and status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges (RLS decides row access; grants decide table access)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.institutions to authenticated;
grant select, insert, update, delete on public.institution_settings to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.institution_memberships to authenticated;
grant all on public.institutions, public.institution_settings, public.profiles,
  public.institution_memberships to service_role;

revoke all on public.institutions, public.institution_settings, public.profiles,
  public.institution_memberships from anon;
