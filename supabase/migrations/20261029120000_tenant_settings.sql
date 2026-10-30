-- ============================================================================
-- Tenant settings, public contact separation, dynamic domains, provisioning
--
-- owner_email stays private (OTP, owner alerts, internal notices).
-- contact_email is public and is the only address exposed by the profile API.
-- Safe to re-run.
-- ============================================================================

alter table tenants add column if not exists phone text;
alter table tenants add column if not exists contact_email text;
alter table tenants add column if not exists whatsapp text;
alter table tenants add column if not exists address text;
alter table tenants add column if not exists org_number text;
alter table tenants add column if not exists mva_status text;
alter table tenants add column if not exists hours_text text;
alter table tenants add column if not exists currency text not null default 'NOK';
alter table tenants add column if not exists profile jsonb;
alter table tenants add column if not exists updated_at timestamptz not null default now();

-- Backfill the public address only when the onboarding profile already held a
-- distinct public address. Never copy owner_email into the public field.
update tenants
set contact_email = nullif(profile->'contact'->>'email', '')
where (contact_email is null or contact_email = '')
  and nullif(profile->'contact'->>'email', '') is not null
  and lower(profile->'contact'->>'email') <> lower(owner_email);

update tenants
set phone = coalesce(
  nullif(phone, ''),
  nullif(profile->'contact'->>'phone', ''),
  nullif(profile->'contact'->>'whatsapp', '')
)
where phone is null;

-- Hostname -> tenant for custom frontend domains and CORS.
create table if not exists tenant_domains (
  domain text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_domains_tenant
  on tenant_domains(tenant_id);

alter table tenant_domains enable row level security;
revoke all on tenant_domains from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Atomic tenant provisioning used by onboarding approval and admin tooling.
-- Creates the tenant, the owner admin row, default services and hours.
-- ----------------------------------------------------------------------------
create or replace function provision_tenant(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(payload->>'id', '')));
  v_name text := nullif(trim(coalesce(payload->>'name', '')), '');
  v_owner_email text := lower(trim(coalesce(payload->>'owner_email', '')));
  v_contact_email text := nullif(lower(trim(coalesce(payload->>'contact_email', payload->>'owner_email', ''))), '');
  v_phone text := nullif(trim(coalesce(payload->>'phone', '')), '');
  v_whatsapp text := nullif(trim(coalesce(payload->>'whatsapp', '')), '');
  v_address text := nullif(trim(coalesce(payload->>'address', '')), '');
  v_org_number text := nullif(trim(coalesce(payload->>'org_number', '')), '');
  v_mva_status text := nullif(trim(coalesce(payload->>'mva_status', '')), '');
  v_hours_text text := nullif(trim(coalesce(payload->>'hours_text', '')), '');
  v_timezone text := nullif(trim(coalesce(payload->>'timezone', '')), '');
  v_currency text := upper(nullif(trim(coalesce(payload->>'currency', '')), ''));
  v_profile jsonb := coalesce(payload->'profile', '{}'::jsonb);
  v_ref_prefix text := upper(regexp_replace(coalesce(payload->>'ref_prefix', ''), '[^A-Za-z]', '', 'g'));
begin
  if v_slug = '' then
    raise exception 'tenant slug is required';
  end if;
  if v_owner_email = '' or position('@' in v_owner_email) = 0 then
    raise exception 'a valid owner_email is required';
  end if;

  v_name := coalesce(v_name, v_slug);
  v_ref_prefix := left(coalesce(nullif(v_ref_prefix, ''), upper(regexp_replace(v_name, '[^A-Za-z]', '', 'g')), 'STU'), 3);
  v_timezone := coalesce(v_timezone, 'Europe/Oslo');
  v_currency := coalesce(v_currency, 'NOK');

  insert into tenants (
    id, name, owner_email, contact_email, phone, whatsapp, address, org_number,
    mva_status, hours_text, profile, ref_prefix, timezone, currency,
    allowed_origins, buffer_min, slot_step_min, min_notice_min, max_days_ahead,
    pending_hold_min, active, updated_at
  ) values (
    v_slug, v_name, v_owner_email, coalesce(v_contact_email, v_owner_email),
    v_phone, v_whatsapp, v_address, v_org_number, v_mva_status, v_hours_text,
    v_profile, v_ref_prefix, v_timezone, v_currency,
    coalesce(payload->'allowed_origins', '[]'::jsonb),
    greatest(0, coalesce((payload->>'buffer_min')::int, 10)),
    greatest(1, coalesce((payload->>'slot_step_min')::int, 30)),
    greatest(0, coalesce((payload->>'min_notice_min')::int, 120)),
    greatest(1, coalesce((payload->>'max_days_ahead')::int, 60)),
    greatest(1, coalesce((payload->>'pending_hold_min')::int, 1440)),
    true, now()
  )
  on conflict (id) do update set
    name = excluded.name,
    owner_email = excluded.owner_email,
    contact_email = excluded.contact_email,
    phone = excluded.phone,
    whatsapp = excluded.whatsapp,
    address = excluded.address,
    org_number = excluded.org_number,
    mva_status = excluded.mva_status,
    hours_text = excluded.hours_text,
    profile = excluded.profile,
    ref_prefix = excluded.ref_prefix,
    timezone = excluded.timezone,
    currency = excluded.currency,
    updated_at = now();

  insert into tenant_admins (tenant_id, email, role, active)
  values (v_slug, v_owner_email, 'owner', true)
  on conflict (tenant_id, email) do update set role = 'owner', active = true;

  if not exists (select 1 from services where tenant_id = v_slug) then
    if jsonb_typeof(payload->'services') = 'array' and jsonb_array_length(payload->'services') > 0 then
      insert into services (tenant_id, name, duration_min, price_nok, buffer_min, active, sort)
      select v_slug, x.name, x.duration_min, x.price_nok, x.buffer_min,
             coalesce(x.active, true), coalesce(x.sort, 0)
      from jsonb_to_recordset(payload->'services') as x(
        name text, duration_min int, price_nok int, buffer_min int, active bool, sort int
      )
      where x.name is not null and x.duration_min between 5 and 480 and x.price_nok >= 0;
    else
      insert into services (tenant_id, name, duration_min, price_nok, active, sort)
      values (v_slug, 'Studio Appointment', 60, 0, true, 1);
    end if;
  end if;

  if not exists (select 1 from hours where tenant_id = v_slug) then
    if jsonb_typeof(payload->'hours') = 'array' and jsonb_array_length(payload->'hours') > 0 then
      insert into hours (tenant_id, weekday, open_min, close_min)
      select v_slug, x.weekday, x.open_min, x.close_min
      from jsonb_to_recordset(payload->'hours') as x(
        weekday int, open_min int, close_min int
      )
      where x.weekday between 0 and 6 and x.open_min between 0 and 1439 and x.close_min > x.open_min
      on conflict (tenant_id, weekday, open_min) do nothing;
    else
      insert into hours (tenant_id, weekday, open_min, close_min)
      select v_slug, d, 600, 1080
      from generate_series(0, 5) as d
      on conflict (tenant_id, weekday, open_min) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'id', v_slug,
    'name', v_name,
    'owner_email', v_owner_email,
    'contact_email', coalesce(v_contact_email, v_owner_email)
  );
end;
$$;

revoke all on function provision_tenant(jsonb) from public, anon, authenticated;
grant execute on function provision_tenant(jsonb) to service_role;
