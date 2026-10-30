-- ============================================================================
-- Platform control center: platform super-admins, session scope, branding,
-- tenant assets storage and branding RPC.
--
-- Safe to re-run. Applied manually through the Supabase SQL editor.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Platform super-admins
-- ----------------------------------------------------------------------------
create table if not exists platform_admins (
  email text primary key,
  name text,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into platform_admins (email, name, role, active) values
  ('niwache12@gmail.com', 'Niwache', 'super_admin', true),
  ('hello@agure.space', 'A.Gure', 'super_admin', true),
  ('abdisalamadam8@gmail.com', 'Abdisalam', 'super_admin', true)
on conflict (email) do update
  set role = 'super_admin', active = true;

alter table platform_admins enable row level security;
revoke all on platform_admins from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Sessions gain a platform scope; tenant stays nullable for platform users
-- ----------------------------------------------------------------------------
alter table admin_sessions alter column tenant_id drop not null;
alter table admin_sessions add column if not exists scope text not null default 'tenant';

do $$
begin
  alter table admin_sessions
    add constraint admin_sessions_scope_check
    check (scope in ('tenant', 'platform'));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_admin_sessions_scope
  on admin_sessions(scope, email, expires_at);

-- ----------------------------------------------------------------------------
-- 3. Tenant branding, favicon and email sender identity
-- ----------------------------------------------------------------------------
alter table tenants add column if not exists branding jsonb not null default '{}'::jsonb;
alter table tenants add column if not exists favicon_url text;
alter table tenants add column if not exists from_name text;
alter table tenants add column if not exists reply_to text;

-- Backfill branding from the legacy onboarding profile only where it is empty.
update tenants
set branding = jsonb_strip_nulls(jsonb_build_object(
      'tagline', profile->'identity'->>'tagline',
      'monogram', profile->'identity'->>'monogram'
    )) || branding
where branding = '{}'::jsonb
  and profile is not null;

-- ----------------------------------------------------------------------------
-- 4. Branding merge RPC + audit trail
-- ----------------------------------------------------------------------------
create or replace function set_tenant_branding(
  p_tenant_id text,
  p_branding jsonb,
  p_actor text default 'system'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branding jsonb;
  v_keys jsonb;
begin
  if nullif(trim(coalesce(p_tenant_id, '')), '') is null then
    raise exception 'tenant id is required';
  end if;
  if p_branding is null or jsonb_typeof(p_branding) <> 'object' then
    raise exception 'branding must be a JSON object';
  end if;

  update tenants
  set branding = coalesce(branding, '{}'::jsonb) || p_branding,
      updated_at = now()
  where id = lower(trim(p_tenant_id))
  returning branding into v_branding;

  if v_branding is null then
    raise exception 'tenant not found: %', p_tenant_id;
  end if;

  select coalesce(jsonb_agg(k), '[]'::jsonb)
  into v_keys
  from jsonb_object_keys(p_branding) as k;

  insert into admin_events (actor_email, tenant_id, action, detail)
  values (
    lower(coalesce(nullif(trim(p_actor), ''), 'system')),
    lower(trim(p_tenant_id)),
    'branding.update',
    jsonb_build_object('keys', v_keys)
  );

  return v_branding;
end;
$$;

revoke all on function set_tenant_branding(text, jsonb, text) from public, anon, authenticated;
grant execute on function set_tenant_branding(text, jsonb, text) to service_role;

-- ----------------------------------------------------------------------------
-- 5. Public-read tenant asset bucket (service-role writes only)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-assets',
  'tenant-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

do $$
begin
  execute 'drop policy if exists "tenant-assets public read" on storage.objects';
  execute 'create policy "tenant-assets public read" on storage.objects '
       || 'for select to anon, authenticated using (bucket_id = ''tenant-assets'')';
exception
  when insufficient_privilege then
    raise notice 'Could not create storage.objects read policy; verify bucket is public.';
end $$;
