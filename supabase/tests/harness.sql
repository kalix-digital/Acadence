-- Test harness: the minimum Supabase surface the migrations depend on.
-- Applied to a disposable PostgreSQL cluster *before* the migrations. It is not
-- a migration and must never be applied to a real Supabase project.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Mirrors Supabase's auth.uid(): the caller's subject from the request JWT.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', ''),
    ''
  )::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema if not exists test;

-- Assertions run as the definer so any role under test can call them.
create or replace function test.assert(p_condition boolean, p_message text)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_condition is distinct from true then
    raise exception 'FAIL: %', p_message;
  end if;
end;
$$;

grant usage on schema test to anon, authenticated, service_role;
grant execute on function test.assert(boolean, text) to anon, authenticated, service_role;

-- Asserts that a statement fails with a specific SQLSTATE. Runs as the caller
-- (SECURITY INVOKER) so RLS and column guards are still exercised.
create or replace function test.expect_error(
  p_sql text,
  p_state text,
  p_message text
)
returns void
language plpgsql
as $$
declare
  v_state text;
  v_message text;
begin
  begin
    execute p_sql;
  exception
    when others then
      get stacked diagnostics v_state = returned_sqlstate, v_message = message_text;
      if v_state = p_state then
        return;
      end if;
      raise exception 'FAIL: % (expected SQLSTATE %, got %: %)',
        p_message, p_state, v_state, v_message;
  end;

  raise exception 'FAIL: % (expected SQLSTATE %, but the statement succeeded)',
    p_message, p_state;
end;
$$;

grant execute on function test.expect_error(text, text, text)
  to anon, authenticated, service_role;
