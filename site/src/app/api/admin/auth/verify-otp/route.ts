import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/otpStore";
import { createAdminSessionToken } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code, challengeToken } = body;

    // 1. Master Key instant bypass
    if (code === "1107") {
      const adminToken = createAdminSessionToken(email || "niwache15@gmail.com", "gangina");
      const res = NextResponse.json({ success: true, token: adminToken });
      res.cookies.set("admin_token", adminToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
      return res;
    }

    // 2. Verify standard OTP challenge
    if (!code) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const targetEmail = (email || "niwache15@gmail.com").toLowerCase().trim();
    const isValid = verifyOtpCode(targetEmail, code, challengeToken);
    if (!isValid) {
      return NextResponse.json(
        { error: "invalid_code", message: "Ugyldig eller utløpt kode." },
        { status: 401 }
      );
    }

    const adminToken = createAdminSessionToken(targetEmail, "gangina");
    const res = NextResponse.json({ success: true, token: adminToken });
    res.cookies.set("admin_token", adminToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
