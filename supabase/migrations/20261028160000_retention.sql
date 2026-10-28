-- ============================================================================
-- Retention: anonymise closed bookings past the retention window.
--
-- Keeps the operational record (dates, service, price, status) but removes
-- customer identifiers, so GDPR erasure / retention can be applied without
-- destroying booking history. Callable from the admin portal or a cron.
-- ============================================================================

create or replace function anonymize_old_bookings(
  p_older_than_days integer,
  p_tenant_id text default null
) returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  if p_older_than_days is null or p_older_than_days < 30 then
    raise exception 'retention window must be at least 30 days';
  end if;

  update bookings
     set customer_name = 'Deleted customer',
         customer_email = '',
         customer_phone = '',
         notes = null,
         custom_fields = '{}'::jsonb
   where start_utc < extract(epoch from now())::bigint
                    - (p_older_than_days::bigint * 86400)
     and (p_tenant_id is null or tenant_id = p_tenant_id)
     and status in ('cancelled', 'declined', 'expired', 'completed', 'no_show');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function anonymize_old_bookings(integer, text)
  from public, anon, authenticated;
grant execute on function anonymize_old_bookings(integer, text)
  to service_role;
