import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/otpStore";
import { createAdminSessionToken } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").toLowerCase().trim();
    const code = (body.code || "").trim();
    const challengeToken = body.challengeToken;

    if (!email || !code || code.length !== 6) {
      return NextResponse.json(
        { error: "invalid_payload", message: "Vennligst fyll inn 6-sifret kode." },
        { status: 400 }
      );
    }

    const isValid = verifyOtpCode(email, code, challengeToken);
    if (!isValid) {
      return NextResponse.json(
        { error: "invalid_code", message: "Ugyldig eller utløpt verifiseringskode." },
        { status: 401 }
      );
    }

    // Successfully verified! Create signed authenticated session token
    const sessionToken = createAdminSessionToken(email);

    return NextResponse.json({
      success: true,
      email,
      token: sessionToken,
    });
  } catch (err) {
    console.error("Error in verify-otp:", err);
    return NextResponse.json(
      { error: "server_error", message: "Kunne ikke verifisere koden." },
      { status: 500 }
    );
  }
}
