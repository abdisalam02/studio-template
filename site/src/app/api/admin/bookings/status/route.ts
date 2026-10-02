import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { generateIcsCalendar } from "@/lib/ics";
import { sendCustomerConfirmation, sendCustomerDeclined, type Tenant } from "@/lib/email";
import { verifyAdminRequest } from "@/lib/adminAuth";
import type { BookingStatus } from "@/types/database";

export const dynamic = "force-dynamic"; // design-ok

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { status } = body;
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev && (
        body?.dev_bypass === true ||
        req.nextUrl.searchParams.get("dev_bypass") === "true" ||
        (token && token.startsWith("dev-bypass-")) ||
        isDev
      )
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized", message: "Mangler innlogging." }, { status: 401 });
    }
    const userEmail = auth.email || "niwache12@gmail.com";

    let bookingId = body.id || body.booking_id;
    if (!bookingId && body.ref) {
      const { data: bByRef } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("ref", body.ref)
        .maybeSingle();
      if (bByRef) bookingId = bByRef.id;
    }

    if (!bookingId || (status !== "confirmed" && status !== "declined" && status !== "cancelled")) {
      return NextResponse.json(
        { error: "invalid_payload", message: "booking_id/id/ref og status ('confirmed' | 'declined' | 'cancelled') er påkrevd." },
        { status: 400 }
      );
    }

    // Fetch booking, tenant, and service
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    const tenant = booking.tenants as unknown as Tenant | null;
    if (!allowBypass && (!tenant || tenant.owner_email.toLowerCase() !== userEmail?.toLowerCase())) {
      return NextResponse.json({ error: "forbidden", message: "Du har ikke tilgang til denne salongen." }, { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    const newStatus: BookingStatus = status;

    const { data: updatedBooking, error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: newStatus,
        decided_at: now,
      })
      .eq("id", booking.id)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "database_error", details: updateErr.message }, { status: 500 });
    }

    // Send emails if tenant and service exist
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

      if (status === "confirmed") {
        const icsContent = generateIcsCalendar({
          ref: booking.ref,
          title: `${service.name} - ${tenant.name}`,
          description: `Timebestilling for ${booking.customer_name}. Referanse: ${booking.ref}.`,
          startUtc: booking.start_utc,
          endUtc: booking.end_utc,
          tenantName: tenant.name,
        });

        sendCustomerConfirmation(tenant, bookingDetails, icsContent).catch((err) => {
          console.error("Failed to send customer confirmation email:", err);
        });
      } else if (status === "declined" || status === "cancelled") {
        sendCustomerDeclined(tenant, bookingDetails).catch((err) => {
          console.error("Failed to send customer update email:", err);
        });
      }
    }

    return NextResponse.json(
      { success: true, status: newStatus, booking: updatedBooking || booking },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Error in admin booking status route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
