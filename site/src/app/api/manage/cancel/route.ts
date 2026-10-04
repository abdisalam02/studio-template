import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/tokens";
import { sendOwnerCancellationAlert, type Tenant } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ref, token } = body;

    if (!ref || !token) {
      return NextResponse.json(
        { error: "invalid_payload", message: "ref and token are required." },
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

    // 2. Validate token against manage_token_hash
    const isValid = verifyToken(token, booking.manage_token_hash);
    if (!isValid) {
      return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 403 });
    }

    // Check if already cancelled
    if (booking.status === "cancelled") {
      return NextResponse.json({ success: true, status: "cancelled" }, { status: 200 });
    }

    if (booking.status === "declined") {
      return NextResponse.json(
        { error: "booking_already_declined", message: "The appointment is already declined." },
        { status: 400 }
      );
    }

    // 3. Update booking status to cancelled
    const { error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id);

    if (updateErr) {
      console.error("Failed to cancel booking:", updateErr);
      return NextResponse.json({ error: "database_error", details: updateErr.message }, { status: 500 });
    }

    // 4. Send notification email to studio owner via Resend
    const tenant = booking.tenants as unknown as Tenant | null;
    const service = booking.services as unknown as { name: string; price_nok: number } | null;

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

      sendOwnerCancellationAlert(tenant, bookingDetails).catch((err) => {
        console.error("Failed to send owner cancellation email:", err);
      });
    }

    return NextResponse.json({ success: true, status: "cancelled" }, { status: 200 });
  } catch (err: unknown) {
    console.error("Unexpected error in cancel route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
