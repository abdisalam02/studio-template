import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  sendOwnerEmailBounceAlert,
  type BookingDetails,
  type EmailDeliveryStatus,
  type Tenant,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend delivery webhook.
 *
 * Resend accepts a message before the receiving mail server has answered, so
 * "the customer got their receipt" is only knowable a moment later. This route
 * records that answer against the booking and, when the customer copy failed
 * in a way that means they will never see it, alerts the studio owner with a
 * direct link to fix the address and resend.
 *
 * Configure in Resend → Webhooks:
 *   endpoint  https://www.abdisalam.space/api/webhooks/resend
 *   events    email.sent, email.delivered, email.delivery_delayed,
 *             email.bounced, email.complained, email.failed
 *   secret    → RESEND_WEBHOOK_SECRET
 */

const FAILED_STATUSES = new Set<EmailDeliveryStatus>(["bounced", "complained", "failed"]);

const EVENT_STATUS: Record<string, EmailDeliveryStatus> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

/**
 * Verifies a Svix signature (Resend webhooks are Svix-delivered).
 * Signed payload: `${svix-id}.${svix-timestamp}.${rawBody}`
 */
function verifySignature(rawBody: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) return false;

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return false;
  // Reject replays older than five minutes.
  if (Math.abs(Date.now() / 1000 - seconds) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  return signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const received = Buffer.from(value);
    const wanted = Buffer.from(expected);
    return (
      received.length === wanted.length &&
      crypto.timingSafeEqual(received, wanted)
    );
  });
}

interface ResendWebhookPayload {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    subject?: string;
    bounce?: { message?: string; type?: string; subType?: string };
    failed?: { reason?: string };
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not set; rejecting webhook.");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  if (!supabaseAdmin) {
    console.error("Supabase admin client unavailable; rejecting webhook.");
    return NextResponse.json({ error: "server_configuration_error" }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const eventType = payload.type || "";
  const emailId = payload.data?.email_id;
  if (!eventType || !emailId) {
    return NextResponse.json({ received: true, ignored: "missing_ids" });
  }

  const status = EVENT_STATUS[eventType];
  if (!status) {
    // Open/click events are not tracked here — acknowledge so Resend stops
    // retrying, without writing anything.
    return NextResponse.json({ received: true, ignored: eventType });
  }

  const { data: bookingRow, error } = await supabaseAdmin
    .from("bookings")
    .select("*, tenants(*), services(name)")
    .eq("resend_email_id", emailId)
    .maybeSingle();

  if (error) {
    console.error("Resend webhook lookup failed:", error);
    // 500 makes Resend retry; a transient DB error should not lose the event.
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  let booking = bookingRow;

  // The booking route records the Resend id after responding, so a very fast
  // bounce can arrive first. Fall back to the recipient on a recent booking so
  // the event is not lost (and store the id for later events).
  if (!booking && FAILED_STATUSES.has(status)) {
    const rawTo = payload.data?.to;
    const recipient = Array.isArray(rawTo) ? rawTo[0] : rawTo;
    if (recipient) {
      const since = Math.floor(Date.now() / 1000) - 900;
      const { data: recent } = await supabaseAdmin
        .from("bookings")
        .select("*, tenants(*), services(name)")
        .ilike("customer_email", recipient.trim())
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent) booking = recent;
    }
  }

  if (!booking) {
    // Owner alerts and OTP mail also flow through the same Resend account.
    return NextResponse.json({ received: true, ignored: "unknown_email_id" });
  }

  const previousStatus = (booking.customer_email_status || "") as string;
  const reason =
    payload.data?.bounce?.message ||
    payload.data?.failed?.reason ||
    null;

  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      resend_email_id: emailId,
      customer_email_status: status,
      customer_email_status_at: Math.floor(Date.now() / 1000),
      customer_email_error: FAILED_STATUSES.has(status) ? reason : null,
    })
    .eq("id", booking.id);

  if (updateError) {
    console.error("Resend webhook update failed:", updateError);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const tenant = booking.tenants as unknown as Tenant | null;
  const alreadyAlerted = FAILED_STATUSES.has(previousStatus as EmailDeliveryStatus);

  if (tenant && FAILED_STATUSES.has(status) && !alreadyAlerted) {
    const service = booking.services as unknown as { name: string } | null;
    const bookingWithSummary = booking as typeof booking & {
      service_summary?: string | null;
    };
    const details: BookingDetails = {
      ref: booking.ref,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      service_name:
        bookingWithSummary.service_summary || service?.name || "Behandling",
      price_nok: booking.price_nok,
      start_utc: booking.start_utc,
      end_utc: booking.end_utc,
      notes: booking.notes,
    };

    try {
      await sendOwnerEmailBounceAlert(tenant, details, {
        address: booking.customer_email,
        status,
        reason,
      });
    } catch (alertError) {
      // The booking status is already recorded; a failed alert must not make
      // Resend retry the whole event.
      console.error("Owner bounce alert failed:", alertError);
    }
  }

  return NextResponse.json({ received: true, status });
}
