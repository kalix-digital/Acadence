-- Acadence · Phase 2 · tenant-isolation tests
--
-- Run against a disposable PostgreSQL cluster with harness.sql and all
-- migrations applied (scripts/db-test.sh). Every assertion runs under the
-- `authenticated` role with a JWT subject, so PostgreSQL RLS is the only thing
-- deciding visibility — not application code.
--
-- Institutions: Alpha (A) and Beta (B).

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Seed: two tenants, six accounts, one pending invitation
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin.a@alpha.test',    '{"full_name":"Ada Alpha"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'admin.b@beta.test',     '{"full_name":"Bola Beta"}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'lecturer.a@alpha.test', '{"full_name":"Chidi Lecturer"}'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'student.b@beta.test',   '{"full_name":"Dara Student"}'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'outsider@example.test', '{"full_name":"Efe Outsider"}'),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'platform@acadence.test','{"full_name":"Fola Platform"}'),
  ('aaaaaaaa-0000-0000-0000-000000000007', 'newbie@alpha.test',    '{"full_name":"Gina Newbie"}');

insert into public.institutions (id, name, slug, status) values
  ('11111111-1111-1111-1111-111111111111', 'Alpha University', 'alpha-university', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Beta Polytechnic', 'beta-polytechnic', 'active');

insert into public.institution_memberships
  (institution_id, user_id, role, status, invited_email)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'institution_admin', 'active', null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', 'lecturer',          'active', null),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000002', 'institution_admin', 'active', null),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000004', 'student',           'active', null),
  (null,                                    'aaaaaaaa-0000-0000-0000-000000000006', 'platform_admin',    'active', null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', 'lecturer',          'invited', 'outsider@example.test');

select test.assert((select count(*) from public.institutions) = 2, 'seed: two institutions');
select test.assert((select count(*) from public.profiles) = 7, 'seed: signup trigger created seven profiles');
select test.assert((select count(*) from public.institution_settings) = 2, 'seed: settings row per institution');

-- ---------------------------------------------------------------------------
-- Static guard: no policy may read the table it protects
-- ---------------------------------------------------------------------------
select test.assert(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'institution_memberships'
      and (
        coalesce(qual, '') like '%institution_memberships%'
        or coalesce(with_check, '') like '%institution_memberships%'
      )
  ),
  'no institution_memberships policy references its own table'
);

-- ---------------------------------------------------------------------------
-- Institution admin, tenant A
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'admin A: reads its own tenant'
select test.assert((select count(*) from public.institutions) = 1, 'admin A sees exactly one institution');
select test.assert((select id from public.institutions) = '11111111-1111-1111-1111-111111111111', 'admin A sees institution A');
select test.assert((select count(*) from public.institution_settings) = 1, 'admin A sees one settings row');
select test.assert((select count(*) from public.institution_memberships) = 3, 'admin A sees Alpha memberships, including the pending invitation');
select test.assert((select count(*) from public.profiles) = 3, 'admin A sees Alpha profiles');

\echo 'admin A: cannot read tenant B'
select test.assert(
  not exists (select 1 from public.institutions where id = '22222222-2222-2222-2222-222222222222'),
  'admin A cannot read institution B'
);
select test.assert(
  not exists (select 1 from public.institution_settings where institution_id = '22222222-2222-2222-2222-222222222222'),
  'admin A cannot read Beta settings'
);
select test.assert(
  not exists (select 1 from public.institution_memberships where institution_id = '22222222-2222-2222-2222-222222222222'),
  'admin A cannot read Beta memberships'
);
select test.assert(
  (select count(*) from public.profiles) = 3,
  'admin A cannot read Beta profiles'
);

\echo 'admin A: cross-tenant writes are rejected'
with changed as (
  update public.institutions set name = 'Beta Hacked'
  where id = '22222222-2222-2222-2222-222222222222'
  returning 1
)
select test.assert((select count(*) from changed) = 0, 'admin A cannot update institution B');

with changed as (
  update public.institution_settings set slot_minutes = 30
  where institution_id = '22222222-2222-2222-2222-222222222222'
  returning 1
)
select test.assert((select count(*) from changed) = 0, 'admin A cannot update Beta settings');

with deleted as (
  delete from public.institution_memberships
  where institution_id = '22222222-2222-2222-2222-222222222222'
  returning 1
)
select test.assert((select count(*) from deleted) = 0, 'admin A cannot delete Beta memberships');

do $$
begin
  insert into public.institution_memberships (institution_id, user_id, role, status)
  values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000007', 'lecturer', 'active');
  raise exception 'FAIL: admin A inserted a membership into Beta';
exception
  when insufficient_privilege then null;
end;
$$;

do $$
begin
  insert into public.institution_memberships (institution_id, user_id, role, status)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000006', 'platform_admin', 'active');
  raise exception 'FAIL: admin A granted platform_admin inside Alpha';
exception
  when insufficient_privilege or check_violation then null;
end;
$$;

do $$
begin
  update public.institution_memberships set role = 'platform_admin'
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000003';
  raise exception 'FAIL: admin A escalated a lecturer to platform_admin';
exception
  when insufficient_privilege or check_violation then null;
end;
$$;

with deleted as (
  delete from public.institution_memberships
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  returning 1
)
select test.assert((select count(*) from deleted) = 0, 'admin A cannot delete their own membership');

reset role;

-- ---------------------------------------------------------------------------
-- Institution admin, tenant B (symmetry check)
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', false);

\echo 'admin B: reads only Beta'
select test.assert((select count(*) from public.institutions) = 1, 'admin B sees exactly one institution');
select test.assert((select name from public.institutions) = 'Beta Polytechnic', 'admin B sees institution B');
select test.assert((select count(*) from public.institution_memberships) = 2, 'admin B sees both Beta memberships');
select test.assert(
  not exists (select 1 from public.institution_memberships
              where institution_id = '11111111-1111-1111-1111-111111111111'),
  'admin B cannot read Alpha memberships'
);

reset role;

-- ---------------------------------------------------------------------------
-- Lecturer, tenant A
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', false);

\echo 'lecturer A: own membership only'
select test.assert((select count(*) from public.institutions) = 1, 'lecturer A sees institution A');
select test.assert((select count(*) from public.institution_memberships) = 1, 'lecturer A sees only their own membership');
select test.assert(
  (select user_id from public.institution_memberships) = 'aaaaaaaa-0000-0000-0000-000000000003',
  'lecturer A membership row is their own'
);
select test.assert((select count(*) from public.profiles) = 1, 'lecturer A sees only their own profile');

with changed as (
  update public.institution_memberships set role = 'institution_admin'
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000003'
  returning 1
)
select test.assert((select count(*) from changed) = 0, 'lecturer A cannot change their own role');

do $$
begin
  insert into public.institution_memberships (institution_id, user_id, role, status)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000004', 'student', 'active');
  raise exception 'FAIL: lecturer A inserted a membership';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Invited user acceptance (definer RPC, not a self-referencing policy)
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","role":"authenticated"}', false);

\echo 'invited user: sees the invitation but no tenant yet'
select test.assert((select count(*) from public.institution_memberships) = 1, 'outsider sees their pending invitation');
select test.assert((select count(*) from public.institutions) = 0, 'pending invitation grants no institution access');
select test.assert((select count(*) from public.institution_settings) = 0, 'pending invitation grants no settings access');

with changed as (
  update public.institution_memberships set status = 'active'
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000005'
  returning 1
)
select test.assert((select count(*) from changed) = 0, 'invited user cannot activate membership by direct UPDATE');

do $$
begin
  perform public.accept_invitation('aaaaaaaa-0000-0000-0000-000000000003');
  raise exception 'FAIL: outsider accepted someone else''s invitation';
exception
  when no_data_found then null;
end;
$$;

select test.assert(public.accept_invitation(
  (select id from public.institution_memberships where institution_id = '11111111-1111-1111-1111-111111111111'
    and user_id = 'aaaaaaaa-0000-0000-0000-000000000005')
) = 'active', 'invited user accepts their own invitation');

select test.assert((select count(*) from public.institutions) = 1, 'accepted member now sees institution A');
select test.assert((select count(*) from public.institution_memberships) = 1, 'accepted member still sees only their own membership');

reset role;

-- ---------------------------------------------------------------------------
-- Platform administrator (only by design) sees both tenants
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000006","role":"authenticated"}', false);

\echo 'platform admin: explicit cross-tenant visibility'
select test.assert((select count(*) from public.institutions) = 2, 'platform admin sees both institutions');
select test.assert((select count(*) from public.institution_memberships) = 6, 'platform admin sees all memberships');
select test.assert((select count(*) from public.profiles) = 7, 'platform admin sees all profiles');

reset role;

-- ---------------------------------------------------------------------------
-- Provisioning: admin A can add a member to Alpha, and only Alpha
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

\echo 'admin A: provisions a member inside Alpha'
insert into public.institution_memberships (institution_id, user_id, role, status)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000007', 'lecturer', 'active');

select test.assert((select count(*) from public.institution_memberships) = 4, 'admin A sees the newly added member');

with deleted as (
  delete from public.institution_memberships
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000007'
  returning 1
)
select test.assert((select count(*) from deleted) = 1, 'admin A can remove another member');

reset role;

-- ---------------------------------------------------------------------------
-- Anonymous role has no access at all
-- ---------------------------------------------------------------------------
set role anon;
select set_config('request.jwt.claims', '', false);

select test.assert(
  not has_table_privilege('anon', 'public.institutions', 'SELECT'),
  'anon has no table privileges'
);

do $$
begin
  perform count(*) from public.institutions;
  raise exception 'FAIL: anon read institutions';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;

select 'ALL TENANCY ISOLATION TESTS PASSED' as result;
