// Supabase Edge Function: Send Booking Notification via Resend
// Triggers on new booking insertion or direct invocation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { studioEmail, customerName, customerPhone, serviceName, bookingDate, bookingTime } = await req.json();

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Studio Booking <booking@agure.space>",
        to: [studioEmail],
        subject: `Ny Reservasjon: ${serviceName} - ${customerName}`,
        html: `
          <h2>Ny timebestilling mottatt</h2>
          <p><strong>Kunde:</strong> ${customerName} (${customerPhone})</p>
          <p><strong>Behandling:</strong> ${serviceName}</p>
          <p><strong>Tid:</strong> ${bookingDate} kl. ${bookingTime}</p>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
