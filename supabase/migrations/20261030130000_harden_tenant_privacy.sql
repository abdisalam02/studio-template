-- ============================================================================
-- Harden public tenant reads.
--
-- Every live tenant read goes through the service-role client in a server
-- component / route handler. The anon role therefore does not need direct
-- SELECT on `public.tenants`, and the existing public read policy exposed
-- `owner_email` (documented as private) to anyone with the publishable key.
--
-- The view below is the sanctioned public surface (no owner_email).
-- Apply through the Supabase SQL editor; safe to re-run.
-- ============================================================================

revoke select on table public.tenants from anon, authenticated;

drop view if exists public.public_tenant_profiles;
create view public.public_tenant_profiles as
select
  id,
  name,
  contact_email,
  phone,
  whatsapp,
  address,
  org_number,
  mva_status,
  hours_text,
  currency,
  timezone,
  slot_step_min,
  logo_url,
  hero_image_url,
  watermark_url,
  favicon_url,
  branding,
  ref_prefix,
  active
from public.tenants
where active = true;

revoke all on public.public_tenant_profiles from anon, authenticated;
grant select on public.public_tenant_profiles to anon, authenticated;
