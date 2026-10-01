CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  ref_prefix TEXT NOT NULL DEFAULT 'BKG',
  timezone TEXT NOT NULL DEFAULT 'Europe/Oslo',
  allowed_origins JSONB NOT NULL DEFAULT '[]'::jsonb,
  buffer_min INTEGER NOT NULL DEFAULT 10,
  slot_step_min INTEGER NOT NULL DEFAULT 15,
  min_notice_min INTEGER NOT NULL DEFAULT 120,
  max_days_ahead INTEGER NOT NULL DEFAULT 60,
  pending_hold_min INTEGER NOT NULL DEFAULT 1440,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS services (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 5 AND 480),
  price_nok INTEGER NOT NULL CHECK (price_nok >= 0),
  buffer_min INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id, active, sort);

CREATE TABLE IF NOT EXISTS hours (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  open_min INTEGER NOT NULL CHECK (open_min BETWEEN 0 AND 1439),
  close_min INTEGER NOT NULL CHECK (close_min BETWEEN 1 AND 1440),
  PRIMARY KEY (tenant_id, weekday, open_min),
  CHECK (close_min > open_min)
);

CREATE TABLE IF NOT EXISTS blackouts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_utc BIGINT NOT NULL,
  end_utc BIGINT NOT NULL,
  reason TEXT,
  CHECK (end_utc > start_utc)
);
CREATE INDEX IF NOT EXISTS idx_blackouts_tenant ON blackouts(tenant_id, start_utc);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services(id),
  start_utc BIGINT NOT NULL,
  end_utc BIGINT NOT NULL,
  block_end_utc BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','cancelled','expired','completed','no_show')),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT,
  price_nok INTEGER NOT NULL,
  deposit_nok INTEGER NOT NULL DEFAULT 0,
  consent_at BIGINT NOT NULL,
  privacy_version TEXT NOT NULL,
  action_token_hash TEXT NOT NULL,
  manage_token_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  expires_at BIGINT,
  decided_at BIGINT,
  CHECK (end_utc > start_utc),
  CHECK (block_end_utc >= end_utc)
);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(tenant_id, start_utc);

CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_ref TEXT, p_tenant_id TEXT, p_service_id BIGINT, p_start_utc BIGINT,
  p_end_utc BIGINT, p_block_end_utc BIGINT, p_status TEXT, p_customer_name TEXT,
  p_customer_email TEXT, p_customer_phone TEXT, p_notes TEXT, p_price_nok INTEGER,
  p_deposit_nok INTEGER, p_consent_at BIGINT, p_privacy_version TEXT,
  p_action_token_hash TEXT, p_manage_token_hash TEXT, p_now BIGINT, p_expires_at BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_inserted_count INTEGER;
BEGIN
  INSERT INTO bookings (
    ref, tenant_id, service_id, start_utc, end_utc, block_end_utc, status,
    customer_name, customer_email, customer_phone, notes, price_nok, deposit_nok,
    consent_at, privacy_version, action_token_hash, manage_token_hash, created_at, expires_at
  )
  SELECT
    p_ref, p_tenant_id, p_service_id, p_start_utc, p_end_utc, p_block_end_utc, p_status,
    p_customer_name, p_customer_email, p_customer_phone, p_notes, p_price_nok, p_deposit_nok,
    p_consent_at, p_privacy_version, p_action_token_hash, p_manage_token_hash, p_now, p_expires_at
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.start_utc > p_start_utc - 86400
      AND b.start_utc < p_block_end_utc
      AND b.block_end_utc > p_start_utc
      AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.expires_at > p_now))
  )
  AND NOT EXISTS (
    SELECT 1 FROM blackouts k
    WHERE k.tenant_id = p_tenant_id 
      AND k.start_utc < p_end_utc 
      AND k.end_utc > p_start_utc
  );

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count = 1;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_booking_atomic TO anon;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active tenants" ON tenants FOR SELECT USING (active = true);
CREATE POLICY "Public can read active services" ON services FOR SELECT USING (active = true);
CREATE POLICY "Public can read hours" ON hours FOR SELECT USING (true);
CREATE POLICY "Public can read blackouts" ON blackouts FOR SELECT USING (true);
