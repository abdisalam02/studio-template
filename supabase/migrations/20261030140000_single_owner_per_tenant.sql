-- ============================================================================
-- Enforce a single active owner per tenant.
--
-- `tenant_admins` historically allowed two owner rows after `owner_email` was
-- changed in Admin → Settings (the old owner remained active and could still
-- request login codes). This deactivates every owner-role row that no longer
-- matches the tenant's current `owner_email` and revokes those sessions.
--
-- Safe to re-run. Apply through the Supabase SQL editor.
-- ============================================================================

with displaced as (
  update tenant_admins ta
     set active = false
    from tenants t
   where ta.tenant_id = t.id
     and ta.role = 'owner'
     and lower(ta.email) <> lower(t.owner_email)
     and ta.active = true
  returning ta.tenant_id, lower(ta.email) as email
)
update admin_sessions s
   set revoked_at = now()
  from displaced d
 where s.tenant_id = d.tenant_id
   and lower(s.email) = d.email
   and s.revoked_at is null;
