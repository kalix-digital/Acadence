-- Acadence · Phase 3 · Institution management tests
--
-- Runs on the disposable cluster created by scripts/db-test.sh, after the
-- harness and every migration. All assertions run under `authenticated` with a
-- JWT subject, so PostgreSQL RLS and the definer functions decide the result.
--
-- Institutions: Gamma (active) and Delta (pending).

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'admin.g@gamma.test',    '{"full_name":"Gift Gamma"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'lecturer.g@gamma.test', '{"full_name":"Ladi Lecturer"}'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'admin.d@delta.test',    '{"full_name":"Dami Delta"}'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'invitee@example.test',  '{"full_name":"Ife Invitee"}'),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'other@example.test',    '{"full_name":"Ola Other"}'),
  ('bbbbbbbb-0000-0000-0000-000000000006', 'platform2@acadence.test', '{"full_name":"Pele Platform"}');

insert into public.institutions (id, name, slug, status) values
  ('33333333-3333-3333-3333-333333333333', 'Gamma University', 'gamma-university', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'Delta College',    'delta-college',    'pending');

insert into public.institution_memberships (institution_id, user_id, role, status, accepted_at) values
  ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-0000-0000-0000-000000000001', 'institution_admin', 'active', now()),
  ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-0000-0000-0000-000000000002', 'lecturer',          'active', now()),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-0000-0000-0000-000000000003', 'institution_admin', 'active', now()),
  (null,                                    'bbbbbbbb-0000-0000-0000-000000000006', 'platform_admin',    'active', now());

select test.assert(
  (select email from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000001') = 'admin.g@gamma.test',
  'signup trigger stores the profile email'
);

-- ---------------------------------------------------------------------------
-- Platform administrator: provisioning and invitations across tenants
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000006","role":"authenticated"}', false);

\echo 'platform admin: provisions an institution and invites its first admin'
select test.assert(
  (select count(*) from public.institutions
    where id in ('33333333-3333-3333-3333-333333333333',
                 '44444444-4444-4444-4444-444444444444')) = 2,
  'platform admin sees both Phase 3 institutions'
);

insert into public.institutions (id, name, slug, status)
values ('55555555-5555-5555-5555-555555555555', 'Epsilon Institute', 'epsilon-institute', 'pending');

select test.assert(
  (select count(*) from public.institution_settings
    where institution_id = '55555555-5555-5555-5555-555555555555') = 1,
  'settings row is created with the institution'
);

select public.create_invitation(
  '55555555-5555-5555-5555-555555555555', 'first.admin@example.test', 'institution_admin'
) as epsilon_token \gset

select test.assert(
  (select state from public.invitation_preview(:'epsilon_token')) = 'pending',
  'platform invitation previews as pending'
);
select test.assert(
  (select institution_name from public.invitation_preview(:'epsilon_token')) = 'Epsilon Institute',
  'preview returns the institution name'
);
select test.assert(
  (select email from public.institution_invitations
    where institution_id = '55555555-5555-5555-5555-555555555555') = 'first.admin@example.test',
  'invitation stores the normalised email'
);
select test.assert(
  (select token_hash from public.institution_invitations
    where institution_id = '55555555-5555-5555-5555-555555555555')
    <> :'epsilon_token',
  'the raw token is never stored'
);

\echo 'platform admin: only platform administrators may provision'
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
begin
  insert into public.institutions (name, slug, status)
  values ('Rogue College', 'rogue-college', 'active');
  raise exception 'FAIL: institution admin created an institution';
exception
  when insufficient_privilege then null;
end;
$$;

\echo 'institution admin: cannot change institution status'
do $$
begin
  update public.institutions set status = 'suspended'
  where id = '33333333-3333-3333-3333-333333333333';
  raise exception 'FAIL: institution admin changed institution status';
exception
  when insufficient_privilege then null;
end;
$$;

update public.institutions set name = 'Gamma University of Technology'
 where id = '33333333-3333-3333-3333-333333333333';
select test.assert(
  (select name from public.institutions where id = '33333333-3333-3333-3333-333333333333')
    = 'Gamma University of Technology',
  'institution admin may update their own profile'
);

-- ---------------------------------------------------------------------------
-- Invitation authorisation
-- ---------------------------------------------------------------------------
\echo 'institution admin: invites inside their own tenant'
select public.create_invitation(
  '33333333-3333-3333-3333-333333333333', 'Invitee@Example.test', 'lecturer'
) as gamma_token \gset

select test.assert(
  (select email from public.institution_invitations
    where institution_id = '33333333-3333-3333-3333-333333333333') = 'invitee@example.test',
  'invitation email is lower-cased'
);

\echo 'institution admin: duplicate and existing-member invitations are rejected'
do $$
begin
  perform public.create_invitation(
    '33333333-3333-3333-3333-333333333333', 'invitee@example.test', 'student'
  );
  raise exception 'FAIL: duplicate pending invitation was accepted';
exception
  when unique_violation then null;
end;
$$;

do $$
begin
  perform public.create_invitation(
    '33333333-3333-3333-3333-333333333333', 'lecturer.g@gamma.test', 'student'
  );
  raise exception 'FAIL: existing member was invited again';
exception
  when unique_violation then null;
end;
$$;

do $$
begin
  perform public.create_invitation(
    '33333333-3333-3333-3333-333333333333', 'nobody@example.test', 'platform_admin'
  );
  raise exception 'FAIL: platform_admin was invited through an institution';
exception
  when insufficient_privilege then null;
end;
$$;

\echo 'institution admin: cannot invite into another tenant'
do $$
begin
  perform public.create_invitation(
    '44444444-4444-4444-4444-444444444444', 'cross@example.test', 'lecturer'
  );
  raise exception 'FAIL: Gamma admin invited a member into Delta';
exception
  when insufficient_privilege then null;
end;
$$;

\echo 'lecturer: cannot invite at all'
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', false);

do $$
begin
  perform public.create_invitation(
    '33333333-3333-3333-3333-333333333333', 'friend@example.test', 'student'
  );
  raise exception 'FAIL: lecturer created an invitation';
exception
  when insufficient_privilege then null;
end;
$$;

\echo 'lecturer: cannot read invitations or activity'
select test.assert(
  (select count(*) from public.institution_invitations) = 0,
  'lecturer sees no invitations'
);
select test.assert(
  (select count(*) from public.institution_activity) = 0,
  'lecturer sees no activity trail'
);

-- ---------------------------------------------------------------------------
-- Cross-tenant reads
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', false);

\echo 'Delta admin: cannot see Gamma invitations or activity'
select test.assert(
  (select count(*) from public.institution_invitations) = 0,
  'Delta admin sees no Gamma invitations'
);
select test.assert(
  (select count(*) from public.institution_activity
    where institution_id = '33333333-3333-3333-3333-333333333333') = 0,
  'Delta admin sees no Gamma activity'
);
select test.assert(
  (select count(*) from public.institution_invitations
    where institution_id = '44444444-4444-4444-4444-444444444444') = 0,
  'Delta admin cannot read another tenant by filtering'
);

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

select test.assert(
  (select count(*) from public.institution_invitations) = 1,
  'Gamma admin sees only the Gamma invitation'
);
select test.assert(
  (select count(*) from public.institution_activity
    where institution_id = '44444444-4444-4444-4444-444444444444') = 0,
  'Gamma admin sees no Delta activity'
);
select test.assert(
  exists (
    select 1 from public.institution_activity
    where institution_id = '33333333-3333-3333-3333-333333333333'
      and action = 'institution.status_changed'
      and summary like '%active%'
  ) or exists (
    select 1 from public.institution_activity
    where institution_id = '33333333-3333-3333-3333-333333333333'
      and action = 'institution.updated'
  ),
  'institution changes are recorded in the activity trail'
);

-- ---------------------------------------------------------------------------
-- Invitation acceptance
-- ---------------------------------------------------------------------------
\echo 'anonymous: preview only, no table access'
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);

select test.assert(
  (select count(*) from public.invitation_preview(:'gamma_token')) = 1,
  'anyone holding the token can preview the invitation'
);
select test.assert(
  not has_table_privilege('anon', 'public.institution_invitations', 'SELECT'),
  'anon has no direct access to invitations'
);

\echo 'wrong account: cannot accept someone else''s token'
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000005","role":"authenticated"}', false);

select test.expect_error(
  format('select public.accept_invitation_token(%L)', :'gamma_token'),
  '42501',
  'a different account cannot accept the invitation'
);

select test.assert(
  (select count(*) from public.institution_memberships) = 0,
  'the wrong account gained no membership'
);

\echo 'invitee: accepts and becomes an active member'
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000004","role":"authenticated"}', false);

select test.assert(
  (select state from public.invitation_preview(:'gamma_token')) = 'pending',
  'invitee sees the invitation as pending before acceptance'
);
select test.assert(
  (select count(*) from public.institutions) = 0,
  'invitee has no institution access before acceptance'
);

select public.accept_invitation_token(:'gamma_token') as accepted_membership \gset

select test.assert(
  (select role from public.institution_memberships where id = :'accepted_membership') = 'lecturer',
  'acceptance applies the invited role'
);
select test.assert(
  (select status from public.institution_memberships where id = :'accepted_membership') = 'active',
  'acceptance activates the membership'
);
select test.assert(
  (select accepted_at from public.institution_memberships where id = :'accepted_membership') is not null,
  'acceptance records the accepted_at timestamp'
);
select test.assert(
  (select count(*) from public.institutions) = 1,
  'accepted member now sees exactly their institution'
);
select test.assert(
  (select state from public.invitation_preview(:'gamma_token')) = 'accepted',
  'the token is consumed'
);

select test.expect_error(
  format('select public.accept_invitation_token(%L)', :'gamma_token'),
  '23505',
  'a consumed token cannot be accepted twice'
);

-- ---------------------------------------------------------------------------
-- Revocation
-- ---------------------------------------------------------------------------
\echo 'Gamma admin: revokes a pending invitation'
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

select public.create_invitation(
  '33333333-3333-3333-3333-333333333333', 'revoked@example.test', 'student'
) as revoked_token \gset

update public.institution_invitations
   set revoked_at = now()
 where institution_id = '33333333-3333-3333-3333-333333333333'
   and lower(email) = 'revoked@example.test';

select test.assert(
  (select state from public.invitation_preview(:'revoked_token')) = 'revoked',
  'a revoked invitation reports its state'
);

select test.assert(
  exists (
    select 1 from public.institution_activity
    where institution_id = '33333333-3333-3333-3333-333333333333'
      and action = 'invitation.revoked'
  ),
  'revocation is recorded in the activity trail'
);

select test.assert(
  exists (
    select 1 from public.institution_activity
    where institution_id = '33333333-3333-3333-3333-333333333333'
      and action = 'invitation.accepted'
  ),
  'acceptance is recorded in the activity trail'
);

\echo 'Gamma admin: a revoked address can be invited again'
select public.create_invitation(
  '33333333-3333-3333-3333-333333333333', 'revoked@example.test', 'student'
) as reinvite_token \gset
select test.assert(
  (select state from public.invitation_preview(:'reinvite_token')) = 'pending',
  're-inviting after revocation produces a fresh pending invitation'
);

-- ---------------------------------------------------------------------------
-- Member management
-- ---------------------------------------------------------------------------
\echo 'Gamma admin: changes roles and suspends members inside the tenant'
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

update public.institution_memberships
   set role = 'student'
 where institution_id = '33333333-3333-3333-3333-333333333333'
   and user_id = 'bbbbbbbb-0000-0000-0000-000000000002';

select test.assert(
  (select role from public.institution_memberships
    where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 'student',
  'institution admin changed a member role inside their tenant'
);

update public.institution_memberships
   set status = 'suspended'
 where institution_id = '33333333-3333-3333-3333-333333333333'
   and user_id = 'bbbbbbbb-0000-0000-0000-000000000002';

select test.assert(
  (select status from public.institution_memberships
    where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 'suspended',
  'institution admin suspended a member'
);
select test.assert(
  exists (
    select 1 from public.institution_activity
    where institution_id = '33333333-3333-3333-3333-333333333333'
      and action = 'member.status_changed'
  ),
  'member status changes are recorded in the activity trail'
);

update public.institution_memberships
   set status = 'active', role = 'lecturer'
 where institution_id = '33333333-3333-3333-3333-333333333333'
   and user_id = 'bbbbbbbb-0000-0000-0000-000000000002';

select test.assert(
  (select status from public.institution_memberships
    where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 'active',
  'institution admin reactivated a member'
);

-- ---------------------------------------------------------------------------
-- Platform status control
-- ---------------------------------------------------------------------------
\echo 'platform admin: suspends an institution; activity is recorded'
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000006","role":"authenticated"}', false);

update public.institutions set status = 'suspended'
 where id = '33333333-3333-3333-3333-333333333333';

select test.assert(
  (select status from public.institutions where id = '33333333-3333-3333-3333-333333333333') = 'suspended',
  'platform admin changed the institution status'
);
select test.assert(
  exists (
    select 1 from public.institution_activity
    where institution_id = '33333333-3333-3333-3333-333333333333'
      and action = 'institution.status_changed'
  ),
  'status change is recorded in the activity trail'
);
select test.assert(
  (select count(*) from public.institution_invitations) = 4,
  'platform admin sees invitations across tenants'
);

update public.institutions set status = 'active'
 where id = '33333333-3333-3333-3333-333333333333';

reset role;

select 'ALL INSTITUTION MANAGEMENT TESTS PASSED' as result;
