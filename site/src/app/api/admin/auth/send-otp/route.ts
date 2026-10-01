import { NextRequest, NextResponse } from "next/server";
import { generate6DigitOtp, createOtpChallenge } from "@/lib/otpStore";
import { sendOwnerOtpEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").toLowerCase().trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "invalid_email", message: "Vennligst oppgi en gyldig e-postadresse." },
        { status: 400 }
      );
    }

    // Optional check: verify if email belongs to an active tenant or allowed owner
    if (supabaseAdmin) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id, owner_email")
        .eq("owner_email", email)
        .maybeSingle();

      // If not in database and not dev, we still allow sending or handle gracefully
    }

    const code = generate6DigitOtp();
    const { challengeToken, expiresAt } = createOtpChallenge(email, code);

    // Send email via Resend
    await sendOwnerOtpEmail(email, code);

    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      success: true,
      email,
      challengeToken,
      expiresAt,
      // For fast automated testing in development mode
      devCode: isDev ? code : undefined,
    });
  } catch (err) {
    console.error("Error in send-otp:", err);
    return NextResponse.json(
      { error: "server_error", message: "Kunne ikke sende engangskode." },
      { status: 500 }
    );
  }
}
