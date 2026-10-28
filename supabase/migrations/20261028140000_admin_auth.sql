-- ============================================================================
-- Admin authentication: DB-backed sessions, single-use OTP, shared rate limits
--
-- Replaces the stateless HMAC session (30 days, stored in localStorage) and
-- the in-memory OTP oracle with server-side rows that survive serverless
-- instances and can be revoked.
--
-- Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  tenant_id text not null references tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz
);

create index if not exists idx_admin_sessions_token
  on admin_sessions(token_hash);
create index if not exists idx_admin_sessions_email
  on admin_sessions(email, expires_at);

create table if not exists admin_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  ip_hash text
);

create index if not exists idx_admin_otp_email
  on admin_otp_challenges(email, created_at desc);

create table if not exists auth_rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_rate_key
  on auth_rate_events(key, created_at);

create table if not exists tenant_admins (
  tenant_id text not null references tenants(id) on delete cascade,
  email text not null,
  role text not null default 'owner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, email)
);

-- Seed from the current tenant config + the legacy admin addresses so nobody
-- is locked out by the migration. Later this table is the only source.
insert into tenant_admins (tenant_id, email, role) values
  ('gangina',    'niwache15@gmail.com',      'owner'),
  ('gangina',    'niwache12@gmail.com',      'admin'),
  ('gangina',    'ganginabeauty@gmail.com',  'admin'),
  ('studio-klo', 'abdisalamadam8@gmail.com', 'owner'),
  ('noire',      'abdisalamadam8@gmail.com', 'owner')
on conflict (tenant_id, email) do nothing;

alter table admin_sessions enable row level security;
alter table admin_otp_challenges enable row level security;
alter table auth_rate_events enable row level security;
alter table tenant_admins enable row level security;

revoke all on admin_sessions from anon, authenticated;
revoke all on admin_otp_challenges from anon, authenticated;
revoke all on auth_rate_events from anon, authenticated;
revoke all on tenant_admins from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Sliding-window limiter that works across serverless instances.
-- Returns false when the key has exhausted its budget.
-- ----------------------------------------------------------------------------
create or replace function consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('rate:' || p_key)::bigint);

  delete from auth_rate_events
   where created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from auth_rate_events
  where key = p_key
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into auth_rate_events(key) values (p_key);
  return true;
end;
$$;

revoke all on function consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function consume_rate_limit(text, integer, integer)
  to service_role;

-- ----------------------------------------------------------------------------
-- Single-use OTP verification. Attempts are incremented atomically, the row
-- is locked for the transaction, and success burns the challenge.
-- ----------------------------------------------------------------------------
create or replace function verify_otp_challenge(
  p_id uuid,
  p_email text,
  p_code_hash text
) returns boolean
language plpgsql
as $$
declare
  v_row admin_otp_challenges%rowtype;
begin
  select *
    into v_row
    from admin_otp_challenges
   where id = p_id
   for update;

  if not found then
    return false;
  end if;

  if v_row.email <> lower(p_email) then
    return false;
  end if;

  if v_row.consumed_at is not null then
    return false;
  end if;

  if v_row.expires_at <= now() then
    return false;
  end if;

  if v_row.attempts >= 5 then
    return false;
  end if;

  update admin_otp_challenges
     set attempts = attempts + 1
   where id = p_id;

  if v_row.code_hash = p_code_hash then
    update admin_otp_challenges
       set consumed_at = now()
     where id = p_id;
    return true;
  end if;

  return false;
end;
$$;

revoke all on function verify_otp_challenge(uuid, text, text)
  from public, anon, authenticated;
grant execute on function verify_otp_challenge(uuid, text, text)
  to service_role;
