import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/otpStore";
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

    // Successfully verified! Create authenticated session token
    let sessionToken = `dev-bypass-${Buffer.from(email).toString("base64")}`;

    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });

        if (data?.properties?.hashed_token) {
          sessionToken = data.properties.hashed_token;
        }
      } catch (err) {
        console.warn("Could not generate Supabase auth link, using standard session token:", err);
      }
    }

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
