import { NextRequest, NextResponse } from "next/server";
import { generate6DigitOtp, createOtpChallenge } from "@/lib/otpStore";
import { sendOwnerOtpEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let targetEmail = (body.email || "").toLowerCase().trim();

    // Look up current owner_email from Supabase tenant
    if (supabaseAdmin) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("owner_email")
        .eq("id", "gangina")
        .maybeSingle();

      if (tenant?.owner_email) {
        targetEmail = tenant.owner_email.toLowerCase().trim();
      }
    }

    if (!targetEmail || !targetEmail.includes("@")) {
      targetEmail = "niwache15@gmail.com";
    }

    const code = generate6DigitOtp();
    const { challengeToken, expiresAt } = createOtpChallenge(targetEmail, code);

    // Dispatch OTP via Resend
    await sendOwnerOtpEmail(targetEmail, code);

    return NextResponse.json({
      success: true,
      email: targetEmail,
      challengeToken,
      expiresAt,
    });
  } catch (err: unknown) {
    console.error("Error in send-otp:", err);
    return NextResponse.json(
      { error: "server_error", message: "Kunne ikke sende engangskode." },
      { status: 500 }
    );
  }
}
