-- Customer email delivery tracking
--
-- The customer copy of a booking is sent to an address the studio does not
-- control, so a typo is only discovered when the receiving mail server
-- answers. Resend reports that answer asynchronously (delivered / bounced /
-- suppressed); these columns let the admin panel surface it and let the owner
-- correct the address and resend instead of the failure happening silently.
--
-- Safe to re-run.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resend_email_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email_status_at BIGINT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email_error TEXT;

-- Webhook events arrive with a Resend email id, not a booking id.
CREATE INDEX IF NOT EXISTS idx_bookings_resend_email_id
  ON bookings(resend_email_id);

COMMENT ON COLUMN bookings.resend_email_id IS
  'Resend id of the most recent customer email, used to match delivery webhooks.';
COMMENT ON COLUMN bookings.customer_email_status IS
  'sent | delivered | delayed | bounced | complained | failed | suppressed';
COMMENT ON COLUMN bookings.customer_email_status_at IS
  'Epoch seconds when customer_email_status was last written.';
COMMENT ON COLUMN bookings.customer_email_error IS
  'Human-readable reason from the last failed delivery attempt.';
