import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/tokens";
import { generateIcsCalendar } from "@/lib/ics";
import { sendCustomerConfirmation, sendCustomerDeclined, type Tenant } from "@/lib/email";
import type { BookingStatus } from "@/types/database";

export const dynamic = "force-dynamic"; // design-ok

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ref, token, decision } = body;

    if (!ref || !token || (decision !== "accept" && decision !== "decline")) {
      return NextResponse.json(
        { error: "invalid_payload", message: "ref, token, and decision ('accept' | 'decline') are required." },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "server_configuration_error", message: "Database client unavailable." },
        { status: 500 }
      );
    }

    // 1. Fetch booking with tenant and service
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)")
      .eq("ref", ref)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    // 2. Verify token hash against action_token_hash
    const isValid = verifyToken(token, booking.action_token_hash);
    if (!isValid) {
      return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 403 });
    }

    // Check if already decided
    if (booking.status !== "pending") {
      return NextResponse.json(
        {
          error: "already_decided",
          message: `This booking is already ${booking.status}.`,
          status: booking.status,
        },
        { status: 409 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const newStatus: BookingStatus = decision === "accept" ? "confirmed" : "declined";

    // 3. Update bookings status and decided_at
    const { error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: newStatus,
        decided_at: now,
      })
      .eq("id", booking.id);

    if (updateErr) {
      console.error("Failed to update booking status:", updateErr);
      return NextResponse.json({ error: "database_error", details: updateErr.message }, { status: 500 });
    }

    // 4. Send customer notification emails
    const tenant = booking.tenants as unknown as Tenant | null;

    const service = booking.services as unknown as {
      id: number;
      tenant_id: string;
      name: string;
      duration_min: number;
      price_nok: number;
      buffer_min: number | null;
      active: boolean;
      sort: number;
    } | null;

    if (tenant && service) {
      const bookingDetails = {
        ref: booking.ref,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        service_name: service.name,
        price_nok: booking.price_nok,
        start_utc: booking.start_utc,
        end_utc: booking.end_utc,
        notes: booking.notes,
      };

      try {
        if (decision === "accept") {
          const icsContent = generateIcsCalendar({
            ref: booking.ref,
            title: `${service.name} - ${tenant.name}`,
            description: `Booking for ${booking.customer_name}. Reference: ${booking.ref}.`,
            startUtc: booking.start_utc,
            endUtc: booking.end_utc,
            tenantName: tenant.name,
          });

          const mailRes = await sendCustomerConfirmation(tenant, bookingDetails, icsContent);
          if (mailRes && "error" in mailRes && mailRes.error) {
            console.error("Error from Resend sending confirmation email:", mailRes.error);
          }
        } else {
          const mailRes = await sendCustomerDeclined(tenant, bookingDetails);
          if (mailRes && "error" in mailRes && mailRes.error) {
            console.error("Error from Resend sending declined email:", mailRes.error);
          }
        }
      } catch (mailErr) {
        console.error("Failed to send customer notification email on decision:", mailErr);
      }
    }

    return NextResponse.json({ success: true, status: newStatus }, { status: 200 });
  } catch (err: unknown) {
    console.error("Unexpected error in action route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
