-- ============================================================================
-- Reminders + admin audit trail
-- ============================================================================

alter table bookings add column if not exists reminder_24h_sent_at bigint;
alter table bookings add column if not exists reminder_2h_sent_at bigint;

create index if not exists idx_bookings_reminders
  on bookings(status, start_utc)
  where status = 'confirmed';

create table if not exists admin_events (
  id bigint generated always as identity primary key,
  actor_email text not null,
  tenant_id text not null references tenants(id) on delete cascade,
  action text not null,
  booking_ref text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_events_tenant
  on admin_events(tenant_id, created_at desc);

alter table admin_events enable row level security;
revoke all on admin_events from anon, authenticated;

-- Audit retention: 12 months by default.
create or replace function purge_admin_events(
  p_older_than_days integer default 365
) returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  delete from admin_events
   where created_at < now() - make_interval(days => p_older_than_days);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function purge_admin_events(integer)
  from public, anon, authenticated;
grant execute on function purge_admin_events(integer)
  to service_role;
