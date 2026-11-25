-- Acadence · Phase 3 · Institution management
-- Token invitations, an institution activity trail, and the guards that keep an
-- institution administrator inside their own tenant.
--
-- Design notes
--   * Invitations are single-use bearer tokens. Only a SHA-256 hash is stored;
--     the raw token is returned once, to the inviter, and travels by email/link.
--   * Acceptance runs in SECURITY DEFINER functions so no policy ever has to
--     read the table it protects (the Phase 2 recursion class of bug).
--   * Hashing uses core PostgreSQL sha256(), not pgcrypto, so the migration
--     behaves identically on a plain cluster and on hosted Supabase, where
--     extensions live in a different schema.

-- ---------------------------------------------------------------------------
-- Profile email
--   Members lists must show the address an invitation belonged to. profiles is
--   already tenant-readable by the right administrators; email is copied from
--   auth.users on signup and backfilled once here.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    nullif(lower(new.email), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles p
   set email = lower(u.email)
  from auth.users u
 where u.id = p.id
   and p.email is null;

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- Institutional activity trail
--   Append-only from the application's point of view: rows are written by
--   definer trigger functions, never by the authenticated role directly.
-- ---------------------------------------------------------------------------
create table if not exists public.institution_activity (
  id bigint generated always as identity primary key,
  institution_id uuid references public.institutions (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 3 and 64),
  summary text not null check (char_length(summary) between 3 and 300),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists institution_activity_recent_idx
  on public.institution_activity (institution_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Invitations
--   Separate from institution_memberships: the membership row is only created
--   when a real auth user accepts, so no placeholder accounts exist.
-- ---------------------------------------------------------------------------
create table if not exists public.institution_invitations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.membership_role not null,
  faculty_id uuid,
  department_id uuid,
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_role_allowed check (
    role in ('institution_admin', 'faculty_admin', 'department_admin', 'lecturer', 'student')
  ),
  constraint invitations_scope check (faculty_id is null or department_id is null)
);

create trigger institution_invitations_set_updated_at
  before update on public.institution_invitations
  for each row execute function public.set_updated_at();

-- At most one live invitation per address per institution.
create unique index if not exists invitations_pending_email
  on public.institution_invitations (institution_id, lower(email))
  where accepted_at is null and revoked_at is null;

create index if not exists invitations_institution_idx
  on public.institution_invitations (institution_id, created_at desc);
create index if not exists invitations_email_idx
  on public.institution_invitations (lower(email));

-- ---------------------------------------------------------------------------
-- Activity logging
-- ---------------------------------------------------------------------------
create or replace function public.log_institution_activity(
  p_institution uuid,
  p_action text,
  p_summary text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.institution_activity (institution_id, actor_id, action, summary, metadata)
  values (p_institution, (select auth.uid()), p_action, p_summary, p_metadata);
$$;

revoke all on function public.log_institution_activity(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.log_institution_activity(uuid, text, text, jsonb)
  to service_role;

create or replace function public.log_institution_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_institution_activity(
      new.id,
      'institution.created',
      format('Institution %s created', new.name),
      jsonb_build_object('status', new.status, 'slug', new.slug)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform public.log_institution_activity(
        new.id,
        'institution.status_changed',
        format('Institution status changed from %s to %s', old.status, new.status),
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    else
      perform public.log_institution_activity(
        new.id,
        'institution.updated',
        format('Institution profile for %s updated', new.name),
        '{}'::jsonb
      );
    end if;
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists institutions_log_event on public.institutions;
create trigger institutions_log_event
  after insert or update on public.institutions
  for each row execute function public.log_institution_event();

create or replace function public.log_membership_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_institution_activity(
      new.institution_id,
      case when new.status = 'invited' then 'member.invited' else 'member.added' end,
      format('Membership added with role %s', new.role),
      jsonb_build_object('role', new.role, 'status', new.status, 'user_id', new.user_id)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      perform public.log_institution_activity(
        new.institution_id,
        'member.role_changed',
        format('Membership role changed from %s to %s', old.role, new.role),
        jsonb_build_object('from', old.role, 'to', new.role, 'user_id', new.user_id)
      );
    elsif new.status is distinct from old.status then
      perform public.log_institution_activity(
        new.institution_id,
        'member.status_changed',
        format('Membership status changed from %s to %s', old.status, new.status),
        jsonb_build_object('from', old.status, 'to', new.status, 'user_id', new.user_id)
      );
    end if;
    return new;
  end if;

  perform public.log_institution_activity(
    old.institution_id,
    'member.removed',
    format('Membership with role %s removed', old.role),
    jsonb_build_object('role', old.role, 'user_id', old.user_id)
  );
  return old;
end;
$$;

drop trigger if exists institution_memberships_log_event on public.institution_memberships;
create trigger institution_memberships_log_event
  after insert or update or delete on public.institution_memberships
  for each row execute function public.log_membership_event();

create or replace function public.log_invitation_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_institution_activity(
      new.institution_id,
      'invitation.created',
      format('Invitation for %s with role %s created', new.email, new.role),
      jsonb_build_object('role', new.role, 'email', new.email, 'expires_at', new.expires_at)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.accepted_at is not null and old.accepted_at is null then
      perform public.log_institution_activity(
        new.institution_id,
        'invitation.accepted',
        format('Invitation for %s accepted', new.email),
        jsonb_build_object('role', new.role, 'email', new.email)
      );
    elsif new.revoked_at is not null and old.revoked_at is null then
      perform public.log_institution_activity(
        new.institution_id,
        'invitation.revoked',
        format('Invitation for %s revoked', new.email),
        jsonb_build_object('role', new.role, 'email', new.email)
      );
    end if;
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists institution_invitations_log_event on public.institution_invitations;
create trigger institution_invitations_log_event
  after insert or update on public.institution_invitations
  for each row execute function public.log_invitation_event();

create or replace function public.log_settings_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_institution_activity(
    new.institution_id,
    'settings.updated',
    'Institution academic defaults updated',
    jsonb_build_object(
      'slot_minutes', new.slot_minutes,
      'day_starts_at', new.day_starts_at,
      'day_ends_at', new.day_ends_at,
      'default_max_contact_hours', new.default_max_contact_hours
    )
  );
  return new;
end;
$$;

drop trigger if exists institution_settings_log_event on public.institution_settings;
create trigger institution_settings_log_event
  after update on public.institution_settings
  for each row execute function public.log_settings_event();

-- ---------------------------------------------------------------------------
-- Institution guards
--   RLS lets an institution admin update their own institution profile. Status
--   and slug are platform-level controls, so a trigger narrows that right at
--   column level rather than widening the policy.
-- ---------------------------------------------------------------------------
create or replace function public.guard_institution_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not public.is_platform_admin() then
    raise exception 'only a platform administrator can change institution status'
      using errcode = '42501';
  end if;

  if new.slug is distinct from old.slug and not public.is_platform_admin() then
    raise exception 'only a platform administrator can change the institution slug'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists institutions_guard_fields on public.institutions;
create trigger institutions_guard_fields
  before update on public.institutions
  for each row execute function public.guard_institution_fields();

-- ---------------------------------------------------------------------------
-- Invitation tokens
-- ---------------------------------------------------------------------------
create or replace function public.invitation_token_hash(p_token text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

revoke all on function public.invitation_token_hash(text) from public, anon;
grant execute on function public.invitation_token_hash(text) to authenticated, service_role;

-- Creates an invitation and returns the raw token exactly once. The caller
-- must be a platform administrator or an institution administrator of that
-- institution; the checks run here, not in the browser.
create or replace function public.create_invitation(
  p_institution uuid,
  p_email text,
  p_role public.membership_role,
  p_expires_in_days integer default 14
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
  v_days integer := greatest(1, least(coalesce(p_expires_in_days, 14), 60));
begin
  if v_actor is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_role not in ('institution_admin', 'faculty_admin', 'department_admin', 'lecturer', 'student') then
    raise exception 'role % cannot be invited', p_role using errcode = '42501';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'a valid email address is required' using errcode = '22023';
  end if;

  -- coalesce is essential: auth_role() is NULL for a non-member, and
  -- `not (false or null)` is NULL, which would silently skip the guard.
  if not coalesce(
    public.is_platform_admin()
      or public.auth_role(p_institution) = 'institution_admin',
    false
  ) then
    raise exception 'not allowed to invite members to this institution'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.institutions where id = p_institution) then
    raise exception 'institution not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.institution_invitations
    where institution_id = p_institution
      and lower(email) = v_email
      and accepted_at is null
      and revoked_at is null
  ) then
    raise exception 'an invitation is already pending for %', v_email
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.institution_memberships m
    join auth.users u on u.id = m.user_id
    where m.institution_id = p_institution
      and lower(u.email) = v_email
  ) then
    raise exception 'that address already belongs to a member of this institution'
      using errcode = '23505';
  end if;

  -- Two v4 UUIDs give ~244 bits of randomness without depending on pgcrypto.
  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  insert into public.institution_invitations (
    institution_id, email, role, token_hash, invited_by, expires_at, last_sent_at
  )
  values (
    p_institution, v_email, p_role, public.invitation_token_hash(v_token),
    v_actor, now() + make_interval(days => v_days), now()
  );

  return v_token;
end;
$$;

revoke all on function public.create_invitation(uuid, text, public.membership_role, integer)
  from public, anon;
grant execute on function public.create_invitation(uuid, text, public.membership_role, integer)
  to authenticated, service_role;

-- Public preview for the acceptance screen. Possession of the token is the
-- only requirement; nothing else about the tenant is returned.
create or replace function public.invitation_preview(p_token text)
returns table (
  institution_id uuid,
  institution_name text,
  email text,
  role public.membership_role,
  state text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.institution_id,
    inst.name,
    i.email,
    i.role,
    case
      when i.accepted_at is not null then 'accepted'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      else 'pending'
    end,
    i.expires_at
  from public.institution_invitations i
  join public.institutions inst on inst.id = i.institution_id
  where i.token_hash = public.invitation_token_hash(p_token);
$$;

revoke all on function public.invitation_preview(text) from public;
grant execute on function public.invitation_preview(text) to anon, authenticated, service_role;

-- Accepts a token as the signed-in user. The address on the invitation must
-- match the authenticated account; the membership is created (or reactivated)
-- in the same statement as the token is consumed.
create or replace function public.accept_invitation_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_invitation public.institution_invitations;
  v_email text;
  v_membership uuid;
begin
  if v_actor is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select *
    into v_invitation
    from public.institution_invitations
   where token_hash = public.invitation_token_hash(p_token)
     for update;

  if v_invitation.id is null then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'invitation already accepted' using errcode = '23505';
  end if;
  if v_invitation.revoked_at is not null then
    raise exception 'invitation was revoked' using errcode = '23505';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception 'invitation has expired' using errcode = '23505';
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_actor;

  if v_email is null or v_email <> lower(v_invitation.email) then
    raise exception 'this invitation was issued to a different email address'
      using errcode = '42501';
  end if;

  insert into public.institution_memberships (
    institution_id, user_id, role, status, faculty_id, department_id,
    invited_email, invited_by, accepted_at
  )
  values (
    v_invitation.institution_id, v_actor, v_invitation.role, 'active',
    v_invitation.faculty_id, v_invitation.department_id,
    v_invitation.email, v_invitation.invited_by, now()
  )
  on conflict (institution_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        faculty_id = excluded.faculty_id,
        department_id = excluded.department_id,
        invited_email = excluded.invited_email,
        invited_by = excluded.invited_by,
        accepted_at = coalesce(public.institution_memberships.accepted_at, now())
  returning id into v_membership;

  update public.institution_invitations
     set accepted_at = now()
   where id = v_invitation.id;

  return v_membership;
end;
$$;

revoke all on function public.accept_invitation_token(text) from public, anon;
grant execute on function public.accept_invitation_token(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.institution_invitations enable row level security;
alter table public.institution_activity enable row level security;

drop policy if exists invitations_select on public.institution_invitations;
create policy invitations_select on public.institution_invitations
  for select to authenticated
  using (
    public.is_platform_admin()
    or (
      institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) = 'institution_admin'
    )
  );

drop policy if exists invitations_insert on public.institution_invitations;
create policy invitations_insert on public.institution_invitations
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or (
      role <> 'platform_admin'
      and institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) = 'institution_admin'
    )
  );

drop policy if exists invitations_update on public.institution_invitations;
create policy invitations_update on public.institution_invitations
  for update to authenticated
  using (
    public.is_platform_admin()
    or (
      institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) = 'institution_admin'
    )
  )
  with check (
    public.is_platform_admin()
    or (
      role <> 'platform_admin'
      and institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) = 'institution_admin'
    )
  );

drop policy if exists invitations_delete on public.institution_invitations;
create policy invitations_delete on public.institution_invitations
  for delete to authenticated
  using (
    public.is_platform_admin()
    or (
      institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) = 'institution_admin'
    )
  );

-- Activity is readable by the same roles that can audit: institution admins,
-- support operators scoped to the institution, and platform administrators.
drop policy if exists institution_activity_select on public.institution_activity;
create policy institution_activity_select on public.institution_activity
  for select to authenticated
  using (
    public.is_platform_admin()
    or (
      institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) in ('institution_admin', 'support_operator')
    )
  );

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.institution_invitations to authenticated;
grant select on public.institution_activity to authenticated;

grant all on public.institution_invitations, public.institution_activity to service_role;

revoke all on public.institution_invitations, public.institution_activity from anon;
