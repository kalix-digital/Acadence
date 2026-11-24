-- Acadence · Phase 2 · Row Level Security for tenancy tables
-- Every policy is tenant-scoped. Platform admins are the only cross-tenant role,
-- and their membership is itself explicit and audited.

alter table public.institutions enable row level security;
alter table public.institution_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.institution_memberships enable row level security;

-- ---------------------------------------------------------------------------
-- institutions
-- ---------------------------------------------------------------------------
drop policy if exists institutions_select on public.institutions;
create policy institutions_select on public.institutions
  for select to authenticated
  using (
    public.is_platform_admin()
    or id in (select public.auth_institution_ids())
  );

drop policy if exists institutions_insert on public.institutions;
create policy institutions_insert on public.institutions
  for insert to authenticated
  with check (public.is_platform_admin());

drop policy if exists institutions_update on public.institutions;
create policy institutions_update on public.institutions
  for update to authenticated
  using (
    public.is_platform_admin()
    or (id in (select public.auth_institution_ids())
        and public.auth_role(id) = 'institution_admin')
  )
  with check (
    public.is_platform_admin()
    or (id in (select public.auth_institution_ids())
        and public.auth_role(id) = 'institution_admin')
  );

drop policy if exists institutions_delete on public.institutions;
create policy institutions_delete on public.institutions
  for delete to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- institution_settings
-- ---------------------------------------------------------------------------
drop policy if exists institution_settings_select on public.institution_settings;
create policy institution_settings_select on public.institution_settings
  for select to authenticated
  using (
    public.is_platform_admin()
    or institution_id in (select public.auth_institution_ids())
  );

drop policy if exists institution_settings_write on public.institution_settings;
create policy institution_settings_write on public.institution_settings
  for update to authenticated
  using (
    public.is_platform_admin()
    or (institution_id in (select public.auth_institution_ids())
        and public.auth_role(institution_id) = 'institution_admin')
  )
  with check (
    public.is_platform_admin()
    or (institution_id in (select public.auth_institution_ids())
        and public.auth_role(institution_id) = 'institution_admin')
  );

-- ---------------------------------------------------------------------------
-- profiles
--   A member sees their own profile; institution admins see profiles of members
--   of their own institution; platform admins see all.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin()
    or exists (
      select 1
      from public.institution_memberships target
      join public.institution_memberships viewer
        on viewer.institution_id = target.institution_id
      where target.user_id = profiles.id
        and viewer.user_id = (select auth.uid())
        and viewer.status = 'active'
        and viewer.role = 'institution_admin'
    )
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- institution_memberships
-- ---------------------------------------------------------------------------
drop policy if exists memberships_select on public.institution_memberships;
create policy memberships_select on public.institution_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin()
    or (
      institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) = 'institution_admin'
    )
  );

-- Institution admins may add members to their own institution, but can never
-- grant platform_admin, and can never write into another tenant.
drop policy if exists memberships_insert on public.institution_memberships;
create policy memberships_insert on public.institution_memberships
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or (
      role <> 'platform_admin'
      and institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) = 'institution_admin'
    )
  );

-- No policy on this table may query public.institution_memberships itself:
-- an RLS policy that reads its own relation recurses until PostgreSQL aborts
-- with "infinite recursion detected in policy". Self-service invitation
-- acceptance therefore goes through public.accept_invitation() below, which is
-- SECURITY DEFINER (bypasses RLS as the owner) and only ever touches the
-- caller's own row.
drop policy if exists memberships_update on public.institution_memberships;
create policy memberships_update on public.institution_memberships
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

drop policy if exists memberships_delete on public.institution_memberships;
create policy memberships_delete on public.institution_memberships
  for delete to authenticated
  using (
    public.is_platform_admin()
    or (
      institution_id in (select public.auth_institution_ids())
      and public.auth_role(institution_id) = 'institution_admin'
      and user_id <> (select auth.uid())                 -- never remove yourself
    )
  );

-- ---------------------------------------------------------------------------
-- Invitation acceptance
--   The only member-initiated write to institution_memberships. A definer
--   function avoids both a self-referencing policy and any broader UPDATE
--   right on the table.
-- ---------------------------------------------------------------------------
create or replace function public.accept_invitation(p_membership_id uuid)
returns public.membership_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.membership_status;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.institution_memberships
     set status = 'active',
         accepted_at = coalesce(accepted_at, now())
   where id = p_membership_id
     and user_id = (select auth.uid())
     and status = 'invited'
  returning status into v_status;

  if v_status is null then
    raise exception 'invitation not found or already accepted'
      using errcode = 'P0002';
  end if;

  return v_status;
end;
$$;

revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;
