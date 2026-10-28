-- ============================================================================
-- Booking integrity
--
-- Reconciles the repo with the production schema (22-argument
-- create_booking_atomic, nullable service_id, service_ids / service_summary /
-- custom_fields columns) and makes overlapping bookings impossible at the
-- database level instead of relying on a non-atomic WHERE NOT EXISTS.
--
-- Apply this BEFORE deploying code that calls reschedule_booking_atomic.
-- Safe to re-run.
-- ============================================================================

create extension if not exists btree_gist;

-- Production already has these columns; keep fresh environments aligned.
alter table bookings add column if not exists service_ids jsonb default '[]'::jsonb;
alter table bookings add column if not exists service_summary text;
alter table bookings add column if not exists custom_fields jsonb default '{}'::jsonb;

-- Production allows a booking without a service row (manual / legacy rows).
alter table bookings alter column service_id drop not null;

-- Expire stale holds so they cannot block the constraint or a new booking.
update bookings
   set status = 'expired'
 where status = 'pending'
   and expires_at is not null
   and expires_at <= extract(epoch from now())::bigint;

-- Hard guarantee: no two live bookings may overlap for the same tenant.
-- The range is [start_utc, block_end_utc) so a booking's buffer is protected
-- and back-to-back appointments remain valid.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_no_overlap'
      and conrelid = 'bookings'::regclass
  ) then
    alter table bookings
      add constraint bookings_no_overlap
      exclude using gist (
        tenant_id with =,
        int8range(start_utc, block_end_utc, '[)') with &&
      ) where (status in ('pending', 'confirmed'));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- create_booking_atomic — same 22-argument signature production already uses,
-- plus a per-tenant advisory lock and a clean false on exclusion violations.
-- ----------------------------------------------------------------------------
create or replace function create_booking_atomic(
  p_ref text,
  p_tenant_id text,
  p_service_id bigint,
  p_start_utc bigint,
  p_end_utc bigint,
  p_block_end_utc bigint,
  p_status text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_notes text,
  p_price_nok integer,
  p_deposit_nok integer,
  p_consent_at bigint,
  p_privacy_version text,
  p_action_token_hash text,
  p_manage_token_hash text,
  p_now bigint,
  p_expires_at bigint,
  p_service_ids jsonb default '[]'::jsonb,
  p_service_summary text default null,
  p_custom_fields jsonb default '{}'::jsonb
) returns boolean
language plpgsql
as $$
declare
  v_inserted integer;
begin
  -- Serialise writes per tenant. The exclusion constraint is the hard
  -- guarantee; this lock keeps the concurrent path on the friendly
  -- "return false -> 409" branch instead of an exception.
  perform pg_advisory_xact_lock(hashtext('booking:' || p_tenant_id)::bigint);

  -- A stale hold must not block a new booking.
  update bookings
     set status = 'expired'
   where tenant_id = p_tenant_id
     and status = 'pending'
     and expires_at is not null
     and expires_at <= p_now;

  insert into bookings (
    ref, tenant_id, service_id, start_utc, end_utc, block_end_utc, status,
    customer_name, customer_email, customer_phone, notes, price_nok, deposit_nok,
    consent_at, privacy_version, action_token_hash, manage_token_hash,
    created_at, expires_at, service_ids, service_summary, custom_fields
  )
  select
    p_ref, p_tenant_id, p_service_id, p_start_utc, p_end_utc, p_block_end_utc, p_status,
    p_customer_name, p_customer_email, p_customer_phone, p_notes, p_price_nok, p_deposit_nok,
    p_consent_at, p_privacy_version, p_action_token_hash, p_manage_token_hash,
    p_now, p_expires_at,
    coalesce(p_service_ids, '[]'::jsonb),
    p_service_summary,
    coalesce(p_custom_fields, '{}'::jsonb)
  where not exists (
    select 1
    from bookings b
    where b.tenant_id = p_tenant_id
      and b.start_utc < p_block_end_utc
      and b.block_end_utc > p_start_utc
      and (
        b.status = 'confirmed'
        or (b.status = 'pending' and (b.expires_at is null or b.expires_at > p_now))
      )
  )
  and not exists (
    select 1
    from blackouts k
    where k.tenant_id = p_tenant_id
      and k.start_utc < p_end_utc
      and k.end_utc > p_start_utc
  );

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
exception
  when exclusion_violation then
    return false;
end;
$$;

-- Remove the obsolete 19-argument overload from the original migration.
drop function if exists create_booking_atomic(
  text, text, bigint, bigint, bigint, bigint, text, text, text, text, text,
  integer, integer, bigint, text, text, text, bigint, bigint
);

-- ----------------------------------------------------------------------------
-- reschedule_booking_atomic — one validated mutation path for admin and the
-- owner review link, with the same lock / overlap / blackout rules.
-- ----------------------------------------------------------------------------
create or replace function reschedule_booking_atomic(
  p_booking_id bigint,
  p_start_utc bigint,
  p_end_utc bigint,
  p_block_end_utc bigint,
  p_now bigint
) returns boolean
language plpgsql
as $$
declare
  v_tenant text;
  v_updated integer;
begin
  select tenant_id into v_tenant
  from bookings
  where id = p_booking_id;

  if v_tenant is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext('booking:' || v_tenant)::bigint);

  update bookings
     set status = 'expired'
   where tenant_id = v_tenant
     and status = 'pending'
     and expires_at is not null
     and expires_at <= p_now;

  if exists (
    select 1
    from bookings b
    where b.tenant_id = v_tenant
      and b.id <> p_booking_id
      and b.start_utc < p_block_end_utc
      and b.block_end_utc > p_start_utc
      and (
        b.status = 'confirmed'
        or (b.status = 'pending' and (b.expires_at is null or b.expires_at > p_now))
      )
  ) then
    return false;
  end if;

  if exists (
    select 1
    from blackouts k
    where k.tenant_id = v_tenant
      and k.start_utc < p_end_utc
      and k.end_utc > p_start_utc
  ) then
    return false;
  end if;

  update bookings
     set start_utc = p_start_utc,
         end_utc = p_end_utc,
         block_end_utc = p_block_end_utc
   where id = p_booking_id;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
exception
  when exclusion_violation then
    return false;
end;
$$;

-- Server-only execution.
revoke all on function create_booking_atomic(
  text, text, bigint, bigint, bigint, bigint, text, text, text, text, text,
  integer, integer, bigint, text, text, text, bigint, bigint, jsonb, text, jsonb
) from public, anon, authenticated;

grant execute on function create_booking_atomic(
  text, text, bigint, bigint, bigint, bigint, text, text, text, text, text,
  integer, integer, bigint, text, text, text, bigint, bigint, jsonb, text, jsonb
) to service_role;

revoke all on function reschedule_booking_atomic(bigint, bigint, bigint, bigint, bigint)
  from public, anon, authenticated;

grant execute on function reschedule_booking_atomic(bigint, bigint, bigint, bigint, bigint)
  to service_role;
